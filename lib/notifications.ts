import { getKv } from "@/db/subscriptionsRepo";
import { buildReminders, REMINDER_KINDS, type PlannedReminder } from "@/lib/reminders";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const CHANNEL_ID = "renewal-reminders";
// iOS caps pending local notifications at 64; stay comfortably under it.
const MAX_SCHEDULED = 60;

export const REMINDERS_ENABLED_KEY = "reminders_enabled";
export const BASE_CURRENCY_KEY = "base_currency";

let handlerConfigured = false;

/** Sets the foreground handler + Android channel. Safe to call repeatedly. */
export const configureNotifications = async (): Promise<void> => {
  if (!handlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerConfigured = true;
  }
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Renewal reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
};

/** Reminders master preference (default on). */
export const remindersEnabled = (): boolean =>
  getKv(REMINDERS_ENABLED_KEY) !== "0";

const baseCurrency = (): string => getKv(BASE_CURRENCY_KEY) ?? "USD";

const permissionGranted = async (): Promise<boolean> =>
  (await Notifications.getPermissionsAsync()).granted;

/**
 * Requests notification permission if not yet decided. Only prompts the first
 * time (the OS returns the existing decision afterwards without a dialog).
 */
export const ensurePermission = async (): Promise<boolean> => {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
};

const scheduleReminder = (reminder: PlannedReminder) =>
  Notifications.scheduleNotificationAsync({
    identifier: reminder.id,
    content: {
      title: reminder.title,
      body: reminder.body,
      data: { subscriptionId: reminder.subscriptionId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminder.date,
      channelId: CHANNEL_ID,
    },
  });

/** Cancels a subscription's reminders by deterministic identifier. */
export const cancelForSubscription = async (subId: string): Promise<void> => {
  await Promise.all(
    REMINDER_KINDS.map((kind) =>
      Notifications.cancelScheduledNotificationAsync(`${subId}::${kind}`).catch(
        () => undefined,
      ),
    ),
  );
};

/** Cancels then reschedules a single subscription's reminders. */
export const rescheduleForSubscription = async (
  sub: Subscription,
): Promise<void> => {
  await cancelForSubscription(sub.id);
  if (!remindersEnabled() || !(await permissionGranted())) return;
  for (const reminder of buildReminders(sub, baseCurrency())) {
    await scheduleReminder(reminder);
  }
};

/**
 * Full reconcile: clears everything and reschedules the soonest reminders
 * across all subscriptions (rolls stale renewal dates forward). Run on launch
 * and app-foreground so reminders stay correct over time and under the OS cap.
 */
export const rescheduleAll = async (
  subscriptions: Subscription[],
): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!remindersEnabled() || !(await permissionGranted())) return;

  const currency = baseCurrency();
  const planned = subscriptions
    .flatMap((sub) => buildReminders(sub, currency))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, MAX_SCHEDULED);

  for (const reminder of planned) {
    await scheduleReminder(reminder);
  }
};

export const cancelAllReminders = (): Promise<void> =>
  Notifications.cancelAllScheduledNotificationsAsync();
