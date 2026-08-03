import { useEntitlement } from "@/context/EntitlementsContext";
import "@/global.css";
import { useAuth } from "@clerk/expo";
import { success } from "@/lib/haptics";
import {
  getCurrentOffering,
  purchase,
  type PurchasesOffering,
  type PurchasesPackage,
} from "@/lib/purchases";
import { useLocalSearchParams, useRouter } from "expo-router";
import { styled } from "nativewind";
import { usePostHog } from "posthog-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView) as any;

const TERMS_URL = "https://getmyrev.app/terms";
const PRIVACY_URL = "https://getmyrev.app/privacy";

// Preferred display order + fallback copy shown when no offering has loaded
// (RC dashboard not configured yet, or running without a dev build). Real
// localized prices always come from the store via the offering when present.
const ORDER = ["ANNUAL", "MONTHLY", "WEEKLY"] as const;
type PlanKey = (typeof ORDER)[number];

const FALLBACK: Record<
  PlanKey,
  { label: string; price: string; sub: string }
> = {
  ANNUAL: { label: "Annual", price: "$29.99", sub: "≈ $0.58/wk · billed yearly" },
  MONTHLY: { label: "Monthly", price: "$4.99", sub: "billed monthly" },
  WEEKLY: { label: "Weekly", price: "$2.99", sub: "billed weekly" },
};

const PERIOD_WORD: Record<PlanKey, string> = {
  ANNUAL: "year",
  MONTHLY: "month",
  WEEKLY: "week",
};

type Row = {
  key: PlanKey;
  label: string;
  price: string;
  sub: string;
  pkg?: PurchasesPackage;
};

// A free trial is a store-side introductory offer (App Store Connect / Play
// Console) with price 0 — RevenueCat only reads it. The Test Store has none, so
// this returns null there and the CTA reads "Subscribe" honestly; once a real
// 3-day intro offer exists it surfaces automatically.
const trialOf = (
  pkg: PurchasesPackage | undefined,
): { adj: string; noun: string } | null => {
  const intro = pkg?.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const n = intro.periodNumberOfUnits ?? 1;
  const unit = (intro.periodUnit ?? "DAY").toLowerCase();
  return { adj: `${n}-${unit}`, noun: `${n} ${unit}${n > 1 ? "s" : ""}` };
};

const rowsFromOffering = (offering: PurchasesOffering | null): Row[] => {
  const byType = new Map<string, PurchasesPackage>();
  offering?.availablePackages.forEach((p) => byType.set(p.packageType, p));
  return ORDER.map((key) => {
    const pkg = byType.get(key);
    const fb = FALLBACK[key];
    return {
      key,
      label: fb.label,
      price: pkg?.product.priceString ?? fb.price,
      sub: fb.sub,
      pkg,
    };
  });
};

export default function Paywall() {
  const router = useRouter();
  const posthog = usePostHog();
  const { source, resume } = useLocalSearchParams<{
    source?: string;
    resume?: string;
  }>();
  const { isPro, restorePurchases } = useEntitlement();
  const { isSignedIn } = useAuth();

  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selected, setSelected] = useState<PlanKey>("ANNUAL");
  const [busy, setBusy] = useState(false);

  // Guarded dismiss — never call router.back() when there's no screen to return
  // to (e.g. the paywall was reached via replace), which throws GO_BACK.
  const dismiss = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  useEffect(() => {
    posthog.capture("paywall_view", { source: source ?? "unknown" });
    void getCurrentOffering().then(setOffering);
  }, [posthog, source]);

  // A live entitlement flip (purchase or restore) means we're done here.
  useEffect(() => {
    if (isPro) dismiss();
  }, [isPro, dismiss]);

  const rows = useMemo(() => rowsFromOffering(offering), [offering]);
  const selectedRow = rows.find((r) => r.key === selected) ?? rows[0];
  const canPurchase = !!selectedRow?.pkg;
  const trial = trialOf(selectedRow?.pkg);
  const period = PERIOD_WORD[selected];
  // Honest CTA: a real trial → "Start 3-day free trial"; a product with no
  // intro offer (Test Store) → "Subscribe"; nothing loaded → aspirational label
  // on the disabled button.
  const ctaLabel = !canPurchase
    ? "Start free trial"
    : trial
      ? `Start ${trial.adj} free trial`
      : "Subscribe";
  const footnote = !canPurchase
    ? `Then ${selectedRow?.price}/${period}. Cancel anytime.`
    : trial
      ? `Free for ${trial.noun}, then ${selectedRow?.price}/${period}. Cancel anytime.`
      : `${selectedRow?.price}/${period}, billed ${period}ly. Cancel anytime.`;

  // Synchronous re-entry lock: prevents a second purchasePackage() from a rapid
  // double-tap or a resume-effect/tap race before `busy` state has re-rendered —
  // the app-side guard against double-charging. (Stores + RevenueCat also dedupe:
  // buying an already-owned active subscription returns the existing entitlement
  // instead of charging again.)
  const purchasing = useRef(false);
  const runPurchase = useCallback(
    async (pkg: PurchasesPackage) => {
      // Skip if a purchase is already in flight, or the user is already Pro
      // (e.g. entitlement arrived via the listener between tap and resume).
      if (purchasing.current || isPro) return;
      purchasing.current = true;
      setBusy(true);
      try {
        const res = await purchase(pkg);
        if (res.ok) {
          success();
          posthog.capture("trial_start", {
            source: source ?? "unknown",
            plan: selected,
          });
          // isPro flips via the CustomerInfo listener → the effect pops us out.
        } else if (!res.cancelled) {
          Alert.alert(
            "Purchase didn't complete",
            "Something went wrong and you weren't charged. Please try again.",
          );
        }
        // Cancelled: silent, stay on the paywall.
      } finally {
        purchasing.current = false;
        setBusy(false);
      }
    },
    [posthog, source, selected, isPro],
  );

  const onSubscribe = () => {
    if (!selectedRow?.pkg || busy) return;
    // Login before checkout (lead capture + ties the RC entitlement to the
    // Clerk id so Pro follows the user across devices). Send a guest to sign-up
    // with a returnTo that brings them straight back here and resumes the trial.
    if (!isSignedIn) {
      posthog.capture("paywall_signin_required", { source: source ?? "unknown" });
      const back = encodeURIComponent(
        `/paywall?source=${source ?? "unknown"}&resume=1`,
      );
      router.push(`/(auth)/sign-up?returnTo=${back}`);
      return;
    }
    void runPurchase(selectedRow.pkg);
  };

  // Returning signed-in from the auth bounce (resume=1) → continue the trial the
  // guest started, without a second tap. Once only, after the offering loads.
  const resumed = useRef(false);
  useEffect(() => {
    if (
      resume === "1" &&
      isSignedIn &&
      selectedRow?.pkg &&
      !busy &&
      !resumed.current
    ) {
      resumed.current = true;
      void runPurchase(selectedRow.pkg);
    }
  }, [resume, isSignedIn, selectedRow, busy, runPurchase]);

  const onRestore = async () => {
    if (busy) return;
    setBusy(true);
    await restorePurchases();
    setBusy(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row justify-end px-5 pt-3">
        <Pressable
          onPress={dismiss}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Close"
          className="size-11 items-center justify-center rounded-full active:opacity-60"
        >
          <Text className="text-2xl font-sans-medium text-muted-foreground">×</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="grow gap-5 px-6 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center">
          <Text className="text-xs font-sans-extrabold uppercase tracking-[2px] text-accent">
            ✦ myrev Pro
          </Text>
          <Text className="mt-2 text-center text-3xl font-display-black leading-tight text-primary">
            Pay less for what you already have
          </Text>
          <Text className="mt-2 text-center text-sm font-sans-medium text-muted-foreground">
            Track unlimited subscriptions, see every way to save, and cancel with
            guided steps.
          </Text>
        </View>

        <View className="gap-3">
          {rows.map((r) => {
            const active = r.key === selected;
            return (
              <Pressable
                key={r.key}
                onPress={() => setSelected(r.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${r.label}, ${r.price}`}
                className={
                  "flex-row items-center justify-between rounded-2xl border p-4 " +
                  (active ? "border-accent bg-accent/10" : "border-border bg-card")
                }
              >
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-base font-sans-bold text-primary">
                      {r.label}
                    </Text>
                    {r.key === "ANNUAL" && (
                      <View className="rounded-full bg-accent px-2 py-0.5">
                        <Text className="text-[10px] font-sans-extrabold uppercase tracking-wide text-on-accent">
                          Save 50%
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="mt-0.5 text-xs font-sans-medium text-muted-foreground">
                    {r.sub}
                  </Text>
                </View>
                <Text className="text-lg font-display-bold text-primary">
                  {r.price}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="gap-2">
          <Pressable
            onPress={onSubscribe}
            disabled={!canPurchase || busy}
            accessibilityRole="button"
            // Keep the pressable-state class (active:) STABLE across renders —
            // toggling it in/out remounts the button (ReactNativeCss warning) and
            // was resetting purchase state mid-flow. Dim the disabled state via
            // inline opacity instead.
            className="items-center rounded-2xl bg-accent py-4 active:opacity-80"
            style={!canPurchase || busy ? { opacity: 0.5 } : undefined}
          >
            {busy ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-base font-sans-bold text-on-accent">
                {ctaLabel}
              </Text>
            )}
          </Pressable>

          <Text className="text-center text-xs font-sans-medium text-muted-foreground">
            {footnote}
          </Text>

          {!isSignedIn && (
            <Text className="text-center text-xs font-sans-medium text-muted-foreground">
              You&apos;ll create a free account first, so your Pro follows you to
              any device.
            </Text>
          )}

          {!canPurchase && (
            // Offering not loaded — dashboard not configured yet or running
            // without a dev build. Prices above are indicative until then.
            <Text className="text-center text-xs font-sans-medium text-warning">
              Plans load once your store is connected on a dev build.
            </Text>
          )}
        </View>

        <View className="mt-1 flex-row items-center justify-center gap-4">
          <Pressable onPress={onRestore} disabled={busy} accessibilityRole="button">
            <Text className="text-xs font-sans-bold text-accent">Restore</Text>
          </Pressable>
          <Text className="text-xs text-muted-foreground">·</Text>
          <Pressable onPress={() => Linking.openURL(TERMS_URL)}>
            <Text className="text-xs font-sans-medium text-muted-foreground">
              Terms
            </Text>
          </Pressable>
          <Text className="text-xs text-muted-foreground">·</Text>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text className="text-xs font-sans-medium text-muted-foreground">
              Privacy
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
