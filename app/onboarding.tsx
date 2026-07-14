import PickerSheet, { type PickerItem } from "@/components/PickerSheet";
import SubscriptionIcon from "@/components/SubscriptionIcon";
import { CURRENCY_CODES, currencyName } from "@/constants/currencies";
import { ONBOARDING_BRANDS } from "@/constants/onboardingBrands";
import { useCurrency } from "@/context/CurrencyContext";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import "@/global.css";
import {
  BILLING_CYCLE_KEYS,
  getCycleLabel,
  getMonthlyEquivalent,
  resolveNextRenewal,
  type BillingCycle,
} from "@/lib/billing";
import { markOnboarded } from "@/lib/onboarding";
import { formatCurrency } from "@/lib/utils";
import clsx from "clsx";
import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { styled } from "nativewind";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView) as any;

type Step = "intro" | "currency" | "pick" | "confirm";

const CURRENCY_ITEMS: PickerItem[] = CURRENCY_CODES.map((code) => ({
  value: code,
  label: code,
  sublabel: currencyName(code),
}));

// All cycles except "custom" — a custom interval needs a day-count input, so
// that rare case is set later in the subscription detail screen.
const CYCLE_ITEMS: PickerItem[] = BILLING_CYCLE_KEYS.filter(
  (key) => key !== "custom",
).map((key) => ({ value: key, label: getCycleLabel(key) }));

const VALUE_POINTS = [
  "See every subscription and what it really costs you each month",
  "Get reminded before renewals and free trials end — so nothing surprises you",
  "Your data stays on your device. No bank login, ever.",
];

const Onboarding = () => {
  const router = useRouter();
  const posthog = usePostHog();
  const { baseCurrency, setBaseCurrency } = useCurrency();
  const { addSubscription } = useSubscriptions();

  const [step, setStep] = useState<Step>("intro");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [cycles, setCycles] = useState<Record<string, BillingCycle>>({});
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [cyclePickerFor, setCyclePickerFor] = useState<string | null>(null);

  const cycleFor = (title: string): BillingCycle => cycles[title] ?? "monthly";

  const started = useRef(false);
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      posthog.capture("onboarding_started");
    }
  }, [posthog]);

  const selectedBrands = ONBOARDING_BRANDS.filter((b) => selected[b.title]);
  const priceFor = (title: string, fallback: number) =>
    parseFloat(prices[title] ?? String(fallback)) || 0;
  const monthlyTotal = selectedBrands.reduce(
    (sum, b) =>
      sum + getMonthlyEquivalent(priceFor(b.title, b.price), cycleFor(b.title)),
    0,
  );

  const finish = (subsAdded: number) => {
    markOnboarded();
    posthog.capture("onboarding_completed", { subs_added: subsAdded });
    router.replace("/");
  };

  const skip = () => {
    markOnboarded();
    posthog.capture("onboarding_skipped");
    router.replace("/");
  };

  const addSelected = () => {
    const now = dayjs().toISOString();
    let count = 0;
    for (const brand of selectedBrands) {
      const price = priceFor(brand.title, brand.price);
      if (price <= 0) continue;
      const cycle = cycleFor(brand.title);
      addSubscription({
        name: brand.title,
        price,
        currency: baseCurrency,
        billingCycle: cycle,
        category: brand.category,
        status: "active",
        startDate: now,
        renewalDate: resolveNextRenewal(now, cycle)?.toISOString() ?? undefined,
      });
      count += 1;
    }
    finish(count);
  };

  const goToPick = () => setStep("pick");
  const afterPick = () => {
    if (selectedBrands.length > 0) setStep("confirm");
    else finish(0);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {step === "intro" && (
        <View className="flex-1 justify-between p-6">
          <View className="mt-6">
            <View className="auth-logo-wrap">
              <View className="auth-logo-mark">
                <Text className="auth-logo-mark-text">R</Text>
              </View>
              <View>
                <Text className="auth-wordmark">Recurrly</Text>
                <Text className="auth-wordmark-sub">SMART BILLING</Text>
              </View>
            </View>
            <Text className="auth-title mt-6">Take back control of your subscriptions</Text>
            <View className="mt-8 gap-5">
              {VALUE_POINTS.map((point) => (
                <View key={point} className="flex-row gap-3">
                  <Text className="text-lg text-accent">●</Text>
                  <Text className="flex-1 text-base font-sans-medium text-primary">
                    {point}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <View className="gap-3">
            <Pressable className="auth-button" onPress={() => setStep("currency")}>
              <Text className="auth-button-text">Get started</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === "currency" && (
        <View className="flex-1 justify-between p-6">
          <View className="mt-8">
            <Text className="auth-title">What currency do you pay in?</Text>
            <Text className="auth-subtitle mt-2 text-left">
              Every amount you enter will be shown in this currency. You can
              change it later in Settings.
            </Text>
            <Pressable
              className="auth-input mt-8 flex-row items-center justify-between"
              onPress={() => setShowCurrencyPicker(true)}
            >
              <Text className="text-base font-sans-bold text-primary">
                {baseCurrency} · {currencyName(baseCurrency)}
              </Text>
              <Text className="text-base font-sans-medium text-muted-foreground">
                ▾
              </Text>
            </Pressable>
          </View>
          <Pressable className="auth-button" onPress={goToPick}>
            <Text className="auth-button-text">Continue</Text>
          </Pressable>
        </View>
      )}

      {step === "pick" && (
        // Single scroll with the CTA at the end so it's always reachable
        // (a flex-1 ScrollView + fixed footer can push the button off-screen).
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-4 p-6"
        >
          <Text className="auth-title mt-4">Add your subscriptions</Text>
          <Text className="auth-subtitle text-left">
            Tap the ones you pay for. You can add more (or custom ones) anytime.
          </Text>
          <View className="flex-row flex-wrap justify-between gap-y-4">
            {ONBOARDING_BRANDS.map((brand) => {
              const active = !!selected[brand.title];
              return (
                <Pressable
                  key={brand.title}
                  onPress={() =>
                    setSelected((s) => ({ ...s, [brand.title]: !s[brand.title] }))
                  }
                  style={{ width: "31%" }}
                  className={clsx(
                    "items-center gap-2 rounded-2xl border p-3",
                    active
                      ? "border-accent bg-accent/10"
                      : "border-border bg-card",
                  )}
                >
                  <SubscriptionIcon name={brand.title} size={44} />
                  <Text
                    numberOfLines={1}
                    className="text-xs font-sans-semibold text-primary"
                  >
                    {brand.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable className="auth-button mt-2" onPress={afterPick}>
            <Text className="auth-button-text">
              {selectedBrands.length > 0
                ? `Continue with ${selectedBrands.length}`
                : "Continue"}
            </Text>
          </Pressable>
          <Pressable className="items-center py-2" onPress={skip}>
            <Text className="text-sm font-sans-semibold text-muted-foreground">
              Skip for now
            </Text>
          </Pressable>
        </ScrollView>
      )}

      {step === "confirm" && (
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-3 p-6 pb-40"
        >
          <Text className="mt-4 text-xs font-sans-bold uppercase tracking-[2px] text-muted-foreground">
            Quick add · optional
          </Text>
          <Text className="auth-title mt-1">Confirm what you pay</Text>
          <Text className="auth-subtitle text-left">
            Set what you pay in {baseCurrency} and how often. Category, renewal
            date and payment method are filled in for you — open any
            subscription on your dashboard to fine-tune the details and see your
            full picture.
          </Text>

          <View className="my-2 items-center rounded-3xl bg-accent p-5">
            <Text className="text-xs font-sans-bold uppercase tracking-[2px] text-white/70">
              Your monthly spend
            </Text>
            <Text className="mt-1 text-4xl font-sans-extrabold text-white">
              {formatCurrency(monthlyTotal, baseCurrency)}
            </Text>
            <Text className="text-sm font-sans-medium text-white/80">
              ≈ {formatCurrency(monthlyTotal * 12, baseCurrency)} a year
            </Text>
          </View>

          {selectedBrands.map((brand) => (
            <View
              key={brand.title}
              className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <SubscriptionIcon name={brand.title} size={40} />
              <View className="min-w-0 flex-1">
                <Text
                  numberOfLines={1}
                  className="text-base font-sans-semibold text-primary"
                >
                  {brand.title}
                </Text>
                <Pressable
                  onPress={() => setCyclePickerFor(brand.title)}
                  className="mt-1 flex-row items-center gap-1 self-start rounded-full border border-accent bg-accent/10 px-3 py-1"
                >
                  <Text className="text-xs font-sans-bold text-accent">
                    {getCycleLabel(cycleFor(brand.title))}
                  </Text>
                  <Text className="text-xs font-sans-bold text-accent">▾</Text>
                </Pressable>
              </View>
              <TextInput
                className="auth-input"
                style={{ width: 104, textAlign: "right" }}
                keyboardType="decimal-pad"
                value={prices[brand.title] ?? String(brand.price)}
                onChangeText={(v) =>
                  setPrices((p) => ({ ...p, [brand.title]: v }))
                }
                placeholder="0.00"
                placeholderTextColor="#666666"
              />
            </View>
          ))}

          <Pressable className="auth-button mt-2" onPress={addSelected}>
            <Text className="auth-button-text">
              Add {selectedBrands.length} subscription
              {selectedBrands.length === 1 ? "" : "s"}
            </Text>
          </Pressable>
          <Text className="text-center text-xs font-sans-medium text-muted-foreground">
            You can edit or remove anything later — just tap a subscription.
          </Text>
          <Pressable className="items-center py-2" onPress={() => setStep("pick")}>
            <Text className="text-sm font-sans-semibold text-muted-foreground">
              Back
            </Text>
          </Pressable>
        </ScrollView>
      )}

      <PickerSheet
        visible={showCurrencyPicker}
        title="Choose currency"
        items={CURRENCY_ITEMS}
        selected={baseCurrency}
        placeholder="Search currency"
        onSelect={setBaseCurrency}
        onClose={() => setShowCurrencyPicker(false)}
      />

      <PickerSheet
        visible={cyclePickerFor !== null}
        title="Billing cycle"
        items={CYCLE_ITEMS}
        selected={cyclePickerFor ? cycleFor(cyclePickerFor) : "monthly"}
        placeholder="Search cycle"
        onSelect={(value) =>
          cyclePickerFor &&
          setCycles((s) => ({ ...s, [cyclePickerFor]: value as BillingCycle }))
        }
        onClose={() => setCyclePickerFor(null)}
      />
    </SafeAreaView>
  );
};

export default Onboarding;
