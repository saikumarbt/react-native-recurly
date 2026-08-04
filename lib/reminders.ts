import { getNextRenewal } from "@/lib/billing";
import { formatCurrency } from "@/lib/utils";
import dayjs from "dayjs";

// Pure reminder planning (no native deps) so it can be unit-tested.
export const REMINDER_HOUR = 9; // 9:00 local
export const RENEWAL_LEAD_DAYS = [3, 1];
export const TRIAL_LEAD_DAYS = [2, 0];

/** All identifier kinds a subscription can own, for deterministic cancel. */
export const REMINDER_KINDS = [
  ...RENEWAL_LEAD_DAYS.map((d) => `renewal_${d}`),
  ...TRIAL_LEAD_DAYS.map((d) => `trial_${d}`),
  "checkin",
  "cancel_pending",
  "locked_renewal",
];

export interface PlannedReminder {
  id: string;
  date: Date;
  title: string;
  body: string;
  subscriptionId: string;
}

const atReminderHour = (day: dayjs.Dayjs) =>
  day.hour(REMINDER_HOUR).minute(0).second(0).millisecond(0);

const leadLabel = (days: number) =>
  days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;

/**
 * Computes the future reminders for a subscription. Only active subs get
 * reminders; past-dated leads are skipped. The renewal anchor rolls forward,
 * so a stored renewal date that has passed still yields the next occurrence.
 */
export const buildReminders = (
  sub: Subscription,
  baseCurrency: string,
  now: dayjs.Dayjs = dayjs(),
): PlannedReminder[] => {
  // Downgrade-locked subs (paused + lockedAt) aren't actively tracked, but a
  // charge may still land at the service. Fire ONE upgrade-framed heads-up near
  // the estimated next renewal — explicitly a winback prompt, not a reliable
  // reminder. Single + self-expiring (nothing else scheduled for a locked sub).
  if (sub.lockedAt) {
    const next = getNextRenewal(
      sub.renewalDate ?? sub.startDate,
      sub.billingCycle ?? "monthly",
      sub.customIntervalDays,
    );
    if (!next) return [];
    const fireAt = atReminderHour(next.subtract(1, "day"));
    if (!fireAt.isAfter(now)) return [];
    return [
      {
        id: `${sub.id}::locked_renewal`,
        date: fireAt.toDate(),
        subscriptionId: sub.id,
        title: `${sub.name} may renew ${next.format("MMM D")}`,
        body: "You're not tracking it on free. Reactivate Pro to keep an eye on it.",
      },
    ];
  }

  if (sub.status !== "active") return [];

  const reminders: PlannedReminder[] = [];
  const price = formatCurrency(sub.price, baseCurrency);
  const onTrial = !!sub.isTrial && !!sub.trialEndDate;

  const nextRenewal = getNextRenewal(
    sub.renewalDate ?? sub.startDate,
    sub.billingCycle ?? "monthly",
    sub.customIntervalDays,
  );
  // During a free trial we rely on the trial reminders below (T-2/T-0) and the
  // in-app conversion check-in, not the generic renewal reminders — otherwise
  // both would cluster around the same trial-end date.
  if (nextRenewal && !onTrial) {
    for (const lead of RENEWAL_LEAD_DAYS) {
      const fireAt = atReminderHour(nextRenewal.subtract(lead, "day"));
      if (fireAt.isAfter(now)) {
        reminders.push({
          id: `${sub.id}::renewal_${lead}`,
          date: fireAt.toDate(),
          subscriptionId: sub.id,
          title: `${sub.name} renews ${leadLabel(lead)}`,
          body: `${price} · ${nextRenewal.format("MMM D")}`,
        });
      }
    }

    // Check-in on the renewal day itself: "did it renew?" (we can't detect
    // payment). Tapping deep-links to the sub, where the check-in card shows.
    const checkinAt = atReminderHour(nextRenewal);
    if (checkinAt.isAfter(now)) {
      reminders.push({
        id: `${sub.id}::checkin`,
        date: checkinAt.toDate(),
        subscriptionId: sub.id,
        title: `Did ${sub.name} renew?`,
        body: "Confirm it renewed or cancelled to keep your tracking accurate.",
      });
    }
  }

  if (onTrial) {
    const trialEnd = dayjs(sub.trialEndDate);
    if (trialEnd.isValid()) {
      for (const lead of TRIAL_LEAD_DAYS) {
        const fireAt = atReminderHour(trialEnd.subtract(lead, "day"));
        if (fireAt.isAfter(now)) {
          reminders.push({
            id: `${sub.id}::trial_${lead}`,
            date: fireAt.toDate(),
            subscriptionId: sub.id,
            title:
              lead <= 0
                ? `${sub.name} trial ends today`
                : `${sub.name} trial ends ${leadLabel(lead)}`,
            body:
              lead <= 0
                ? `Keep it (you'll be charged ${price}) or cancel — confirm in the app.`
                : `Cancel before you're charged ${price}.`,
          });
        }
      }
    }
  }

  // Reconciliation: the user started cancelling but hasn't told myrev the
  // outcome. One nudge ~24h later to confirm cancelled or kept, so status stays
  // accurate. Naturally capped — once its fire time passes it isn't rescheduled.
  if (sub.cancelPendingAt) {
    const fireAt = atReminderHour(dayjs(sub.cancelPendingAt).add(1, "day"));
    if (fireAt.isValid() && fireAt.isAfter(now)) {
      reminders.push({
        id: `${sub.id}::cancel_pending`,
        date: fireAt.toDate(),
        subscriptionId: sub.id,
        title: `Did you cancel ${sub.name}?`,
        body: "Tap to confirm so your spend and savings stay accurate.",
      });
    }
  }

  return reminders;
};
