import PickerSheet, { type PickerItem } from "@/components/PickerSheet";
import { CURRENCY_CODES, currencyName } from "@/constants/currencies";
import images from "@/constants/images";
import { useCurrency } from "@/context/CurrencyContext";
import { useEntitlement } from "@/context/EntitlementsContext";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import { useTheme, type ThemePreference } from "@/context/ThemeContext";
import { clearAllKv, setKv } from "@/db/subscriptionsRepo";
import { analyticsAllowed, setAnalyticsDecision } from "@/lib/analytics";
import { exportSubscriptions } from "@/lib/exportData";
import * as notifications from "@/lib/notifications";
import { resetOnboarding } from "@/lib/onboarding";
import { useClerk, useUser } from "@clerk/expo";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { styled } from "nativewind";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView) as any;

const CURRENCY_ITEMS: PickerItem[] = CURRENCY_CODES.map((code) => ({
  value: code,
  label: code,
  sublabel: currencyName(code),
}));

const SUPPORT_EMAIL = "support@getmyrev.app";
const TERMS_URL = "https://getmyrev.app/terms";
const PRIVACY_URL = "https://getmyrev.app/privacy";
const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

const APPEARANCE: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/** A single row inside a settings card: label (+optional sublabel) and a right accessory. */
const Row = ({
  label,
  sublabel,
  right,
  onPress,
  danger,
  divider,
}: {
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  divider?: boolean;
}) => {
  const body = (
    <View
      className={`flex-row items-center justify-between py-3 ${divider ? "border-t border-border/50" : ""}`}
    >
      <View className="flex-1 pr-3">
        <Text
          className={`text-sm font-sans-semibold ${danger ? "text-destructive" : "text-primary"}`}
        >
          {label}
        </Text>
        {sublabel ? (
          <Text className="mt-0.5 text-xs font-sans-medium text-muted-foreground">
            {sublabel}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{body}</Pressable> : body;
};

const Chevron = () => (
  <Text className="text-base font-sans-bold text-muted-foreground">›</Text>
);

const Settings = () => {
  const { signOut } = useClerk();
  const { user, isSignedIn } = useUser();
  const { baseCurrency, setBaseCurrency } = useCurrency();
  const { subscriptions, clearAllData } = useSubscriptions();
  const { isPro, devPro, setDevPro, proEntitlement, restorePurchases, resetEntitlements } =
    useEntitlement();
  const { preference, setPreference } = useTheme();
  const posthog = usePostHog();
  const router = useRouter();
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [remindersOn, setRemindersOn] = useState(() =>
    notifications.remindersEnabled(),
  );
  const [analyticsEnabled, setAnalyticsEnabled] = useState(() =>
    analyticsAllowed(),
  );

  const toggleReminders = (enabled: boolean) => {
    setRemindersOn(enabled);
    setKv(notifications.REMINDERS_ENABLED_KEY, enabled ? "1" : "0");
    void (async () => {
      if (enabled) {
        await notifications.ensurePermission();
        await notifications.rescheduleAll(subscriptions);
      } else {
        await notifications.cancelAllReminders();
      }
    })();
  };

  const toggleAnalytics = (enabled: boolean) => {
    setAnalyticsEnabled(enabled);
    setAnalyticsDecision(enabled);
    if (enabled) posthog.optIn();
    else posthog.optOut();
  };

  const openMail = (subject: string) => {
    const body =
      `\n\n———\nApp: myrev ${APP_VERSION}\n` +
      `Platform: ${Platform.OS} ${Platform.Version}\n` +
      `Subscriptions tracked: ${subscriptions.length}`;
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Couldn't open mail", `Write to us at ${SUPPORT_EMAIL}.`),
    );
  };

  const openLink = (url: string) => {
    WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));
  };

  const exportData = () => {
    if (subscriptions.length === 0) {
      Alert.alert("Nothing to export", "Add a subscription first.");
      return;
    }
    const run = (format: "csv" | "json") =>
      exportSubscriptions(subscriptions, format).catch(() =>
        Alert.alert("Export failed", "Please try again."),
      );
    Alert.alert("Export my data", "Choose a format", [
      { text: "CSV", onPress: () => void run("csv") },
      { text: "JSON", onPress: () => void run("json") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const [restoring, setRestoring] = useState(false);
  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const active = await restorePurchases();
      Alert.alert(
        active ? "Pro restored" : "No purchases found",
        active
          ? "Your myrev Pro access is active on this device."
          : "We couldn't find a purchase to restore on this account.",
      );
    } catch {
      Alert.alert(
        "Couldn't restore",
        "Something went wrong. Please check your connection and try again.",
      );
    } finally {
      setRestoring(false);
    }
  };

  const confirmClearData = () => {
    Alert.alert(
      "Clear all data?",
      "This permanently removes every subscription on this device. It can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear everything",
          style: "destructive",
          onPress: () => {
            clearAllData();
            resetOnboarding();
            router.replace("/onboarding");
          },
        },
      ],
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      "Delete account?",
      isSignedIn
        ? "This deletes your myrev account and all data. This can't be undone."
        : "This permanently removes all your data from this device. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await user?.delete();
              } catch {
                Alert.alert(
                  "Couldn't delete account",
                  "Please try again, or contact support.",
                );
                return;
              }
              // Deterministic full wipe: subscriptions + all kv prefs + reset
              // RevenueCat to a fresh anonymous user + clear the dev override, so
              // no data or entitlement lingers on the device for the next person.
              // (Sign-out also logs RC out via the auth transition; explicit here.)
              clearAllData();
              clearAllKv();
              await resetEntitlements();
              resetOnboarding();
              router.replace("/onboarding");
            })();
          },
        },
      ],
    );
  };

  const displayName =
    user?.firstName ||
    user?.fullName ||
    user?.emailAddresses[0]?.emailAddress?.split("@")[0] ||
    "Guest";
  const email = isSignedIn
    ? (user?.emailAddresses[0]?.emailAddress ?? "No email")
    : "Sign in to back up & sync";

  // Live Pro state for the active card — makes a trial's conversion date + a
  // pending cancel/billing issue explicit (no surprise charge). Null → fall back
  // to the generic "unlocked" copy (e.g. dev override, no RevenueCat detail).
  const proStatusLine = ((): string | null => {
    const e = proEntitlement;
    if (!e) return devPro ? "Developer override active." : null;
    const when = e.expirationDate
      ? new Date(e.expirationDate).toLocaleDateString()
      : null;
    const period = String(e.periodType).toUpperCase();
    if (e.billingIssueDetectedAt)
      return "Payment issue — update your payment method to keep Pro.";
    if (period.includes("TRIAL") || period.includes("INTRO"))
      return when
        ? `Free trial — converts to paid on ${when}.`
        : "You're on your free trial.";
    if (!e.willRenew)
      return when
        ? `Cancels on ${when} — you keep Pro until then.`
        : "Set to cancel at the period end.";
    return when ? `Renews on ${when}.` : "Active.";
  })();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-5 pb-32">
        <View className="list-head">
          <Text className="list-title">Settings</Text>
        </View>

        {/* Profile */}
        <Pressable
          className="sub-card mt-2 mb-4 bg-card"
          onPress={() =>
            isSignedIn ? undefined : router.push("/(auth)/sign-in")
          }
        >
          <View className="flex-row items-center gap-4">
            <Image
              // Static require renders instantly; only the remote Clerk photo
              // needs a uri. (The old resolveAssetSource(uri) path made the
              // local fallback load like a network image — hence the delay.)
              source={user?.imageUrl ? { uri: user.imageUrl } : images.avatar}
              defaultSource={images.avatar}
              className="size-14 rounded-full"
            />
            <View className="flex-1">
              <Text className="text-xl font-sans-bold text-primary">
                {displayName}
              </Text>
              <Text className="mt-0.5 text-sm font-sans-medium text-muted-foreground">
                {email}
              </Text>
            </View>
            {!isSignedIn && <Chevron />}
          </View>
        </Pressable>

        {/* myrev Pro — upsell when free (CTA → paywall); status + trial/renewal
            detail when active. */}
        {isPro ? (
          <View className="mb-1 rounded-3xl border border-accent bg-accent/10 p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-sans-bold uppercase tracking-[2px] text-accent">
                ✦ myrev Pro
              </Text>
              <View className="rounded-full bg-accent px-2.5 py-1">
                <Text className="text-[11px] font-sans-bold text-on-accent">
                  Active
                </Text>
              </View>
            </View>
            <Text className="mt-2 text-sm font-sans-medium text-muted-foreground">
              Find &amp; cancel waste, unlimited tracking, and guided cancellation
              are unlocked.
            </Text>
            {proStatusLine ? (
              <Text className="mt-1.5 text-xs font-sans-semibold text-accent">
                {proStatusLine}
              </Text>
            ) : null}
          </View>
        ) : (
          <View className="mb-1 rounded-3xl border border-accent bg-card p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-sans-bold uppercase tracking-[2px] text-accent">
                ✦ myrev Pro
              </Text>
              <View className="rounded-full border border-accent px-2.5 py-1">
                <Text className="text-[11px] font-sans-bold text-accent">
                  3-day trial
                </Text>
              </View>
            </View>
            <Text className="mt-2 text-sm font-sans-medium text-muted-foreground">
              Find &amp; cancel waste, cloud backup, custom reminders, and
              home-screen widgets.
            </Text>
            <Pressable
              className="mt-4 items-center rounded-2xl bg-accent py-3"
              onPress={() => router.push("/paywall?source=settings_card")}
            >
              <Text className="text-sm font-sans-bold text-on-accent">
                Start free trial
              </Text>
            </Pressable>
          </View>
        )}

        {/* Preferences */}
        <Text className="settings-section-label">Preferences</Text>
        <View className="sub-card bg-card">
          <Row
            label="Currency"
            sublabel="Used for every amount you enter"
            right={
              <Text className="text-sm font-sans-bold text-primary">
                {baseCurrency} ›
              </Text>
            }
            onPress={() => setShowCurrencyPicker(true)}
          />
          <View className="flex-row items-center justify-between border-t border-border/50 py-3">
            <Text className="text-sm font-sans-semibold text-primary">
              Appearance
            </Text>
            <View className="flex-row rounded-xl bg-background p-1">
              {APPEARANCE.map((opt) => {
                const active = preference === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setPreference(opt.value)}
                    className={`rounded-lg px-3 py-1.5 ${active ? "bg-accent" : ""}`}
                  >
                    <Text
                      className={`text-xs font-sans-bold ${active ? "text-on-accent" : "text-muted-foreground"}`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Row
            label="Renewal reminders"
            sublabel="Before renewals and free-trial endings"
            divider
            right={
              <Switch value={remindersOn} onValueChange={toggleReminders} />
            }
          />
        </View>

        {/* Privacy & data */}
        <Text className="settings-section-label">Privacy &amp; data</Text>
        <View className="sub-card bg-card">
          <Row
            label="Share anonymous analytics"
            sublabel="Usage only — never names, amounts, or email"
            right={
              <Switch value={analyticsEnabled} onValueChange={toggleAnalytics} />
            }
          />
          <Row
            label="Export my data"
            sublabel="CSV or JSON"
            divider
            right={<Chevron />}
            onPress={exportData}
          />
          <Row
            label="Privacy Policy"
            divider
            right={<Chevron />}
            onPress={() => openLink(PRIVACY_URL)}
          />
          <Row
            label="Terms of Service"
            divider
            right={<Chevron />}
            onPress={() => openLink(TERMS_URL)}
          />
        </View>

        {/* Support */}
        <Text className="settings-section-label">Support</Text>
        <View className="sub-card bg-card">
          <Row
            label="Suggest a feature"
            right={<Chevron />}
            onPress={() => openMail("myrev — feature idea")}
          />
          <Row
            label="Report a bug"
            divider
            right={<Chevron />}
            onPress={() => openMail("myrev — bug report")}
          />
          <Row
            label="Version"
            divider
            right={
              <Text className="text-sm font-sans-medium text-muted-foreground">
                {APP_VERSION}
              </Text>
            }
          />
        </View>

        {/* Account */}
        <Text className="settings-section-label">Account</Text>
        <View className="sub-card bg-card">
          {isSignedIn ? (
            <Row
              label="Sign out"
              right={<Chevron />}
              onPress={() => signOut()}
            />
          ) : (
            <Row
              label="Sign in"
              sublabel="Back up your subscriptions and sync across devices"
              right={<Chevron />}
              onPress={() => router.push("/(auth)/sign-in")}
            />
          )}
          <Row
            label="Restore purchases"
            sublabel="Already bought Pro? Restore it on this device"
            divider
            right={<Chevron />}
            onPress={() => void handleRestore()}
          />
        </View>

        {/* Danger zone */}
        <Text className="settings-section-label text-destructive">
          Danger zone
        </Text>
        <View className="sub-card border-destructive/30 bg-card">
          <Row label="Clear all data" danger right={<Chevron />} onPress={confirmClearData} />
          <Row
            label="Delete account"
            danger
            divider
            right={<Chevron />}
            onPress={confirmDeleteAccount}
          />
        </View>

        <Text className="mt-6 text-center text-xs font-sans-medium text-muted-foreground">
          myrev {APP_VERSION} · Zerohaus
        </Text>

        {__DEV__ && (
          <View className="mt-6 gap-1">
            <View className="mb-2 flex-row items-center justify-between rounded-2xl border border-accent/40 bg-card px-4 py-3">
              <View>
                <Text className="text-sm font-sans-bold text-accent">
                  Pro (dev override)
                </Text>
                <Text className="text-xs font-sans-medium text-muted-foreground">
                  Unlock Pro surfaces without billing
                </Text>
              </View>
              <Switch value={devPro} onValueChange={setDevPro} />
            </View>
            <Pressable
              className="items-center py-2"
              onPress={() => {
                resetOnboarding();
                router.replace("/onboarding");
              }}
            >
              <Text className="text-xs font-sans-semibold text-muted-foreground">
                Reset onboarding (dev)
              </Text>
            </Pressable>
            <Pressable
              className="items-center py-2"
              onPress={() => {
                clearAllData();
                resetOnboarding();
                router.replace("/onboarding");
              }}
            >
              <Text className="text-xs font-sans-semibold text-destructive">
                Clear all data (dev)
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <PickerSheet
        visible={showCurrencyPicker}
        title="Choose currency"
        items={CURRENCY_ITEMS}
        selected={baseCurrency}
        placeholder="Search currency"
        onSelect={setBaseCurrency}
        onClose={() => setShowCurrencyPicker(false)}
      />
    </SafeAreaView>
  );
};

export default Settings;
