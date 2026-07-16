import AnimatedCounter from "@/components/AnimatedCounter";
import { FadeInUp, PressableScale } from "@/components/motion";
import CelebrationOverlay from "@/components/onboarding/CelebrationOverlay";
import GuideBubble from "@/components/onboarding/GuideBubble";
import ProgressBar from "@/components/onboarding/ProgressBar";
import PickerSheet, { type PickerItem } from "@/components/PickerSheet";
import SubscriptionIcon from "@/components/SubscriptionIcon";
import logoGlow from "@/assets/images/logo-glow.png";
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
import { tapLight } from "@/lib/haptics";
import { markOnboarded } from "@/lib/onboarding";
import { formatCurrency } from "@/lib/utils";
import clsx from "clsx";
import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { styled } from "nativewind";
import { usePostHog } from "posthog-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import Reanimated, { FadeIn } from "react-native-reanimated";

const SafeAreaView = styled(RNSafeAreaView) as any;

type Step =
  | "intro"
  | "goal"
  | "currency"
  | "pick"
  | "confirm"
  | "analyzing"
  | "done";

// Steps that show the progress bar, in order.
const DOT_STEPS: Step[] = ["goal", "currency", "pick", "confirm"];

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

const GOALS = [
  { key: "forgotten", label: "Stop paying for forgotten subs" },
  { key: "renewals", label: "Never miss a renewal" },
  { key: "total", label: "See my total spend" },
  { key: "trials", label: "Catch free-trial endings" },
] as const;

// Light, goal-tailored guide line on the confirm step.
const CONFIRM_GUIDE: Record<string, string> = {
  forgotten: "Let's see what's quietly adding up.",
  renewals: "I'll remind you before each of these renews.",
  total: "Here's what you're really spending.",
  trials: "Add these and I'll warn you before any trial charges.",
};

const ANALYZING_LINES = [
  "Adding your subscriptions…",
  "Working out your monthly total…",
];

/** Simple ring spinner (no animation library). */
const Spinner = () => {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  return (
    <Animated.View
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 4,
        borderColor: "rgba(0,0,0,0.1)",
        borderTopColor: "#ea7a53",
        transform: [
          {
            rotate: spin.interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", "360deg"],
            }),
          },
        ],
      }}
    />
  );
};

const Onboarding = () => {
  const router = useRouter();
  const posthog = usePostHog();
  const { baseCurrency, setBaseCurrency } = useCurrency();
  const { addSubscription } = useSubscriptions();

  const [step, setStep] = useState<Step>("intro");
  const [goal, setGoal] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [cycles, setCycles] = useState<Record<string, BillingCycle>>({});
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [cyclePickerFor, setCyclePickerFor] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState(0);
  const [celebrateTotal, setCelebrateTotal] = useState(0);
  const [analyzeLine, setAnalyzeLine] = useState(0);

  const cycleFor = (title: string): BillingCycle => cycles[title] ?? "monthly";

  // The "analyzing" anticipation beat: cycle lines, then reveal the celebration.
  useEffect(() => {
    if (step !== "analyzing") return;
    setAnalyzeLine(0);
    const cycle = setInterval(
      () => setAnalyzeLine((i) => (i + 1) % ANALYZING_LINES.length),
      650,
    );
    const done = setTimeout(() => setStep("done"), 1500);
    return () => {
      clearInterval(cycle);
      clearTimeout(done);
    };
  }, [step]);

  const started = useRef(false);
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      posthog.capture("onboarding_started");
    }
  }, [posthog]);

  const selectedBrands = ONBOARDING_BRANDS.filter((b) => selected[b.title]);
  // Normalize comma decimal separators (e.g. "12,99") before parsing.
  const priceFor = (title: string, fallback: number) =>
    parseFloat((prices[title] ?? String(fallback)).replace(",", ".")) || 0;
  const monthlyTotal = selectedBrands.reduce(
    (sum, b) =>
      sum + getMonthlyEquivalent(priceFor(b.title, b.price), cycleFor(b.title)),
    0,
  );
  // Same validity rule addSelected uses (price > 0), so the CTA count matches
  // what actually gets added.
  const addableCount = selectedBrands.filter(
    (b) => priceFor(b.title, b.price) > 0,
  ).length;

  const finish = useCallback(
    (subsAdded: number) => {
      markOnboarded();
      posthog.capture("onboarding_completed", { subs_added: subsAdded });
      router.replace("/");
    },
    [posthog, router],
  );

  // Stable callback for the celebration so incidental re-renders don't restart
  // its animation sequence.
  const handleCelebrationDone = useCallback(
    () => finish(addedCount),
    [finish, addedCount],
  );

  const skip = () => {
    markOnboarded();
    posthog.capture("onboarding_skipped");
    router.replace("/");
  };

  const selectGoal = (key: string) => {
    tapLight();
    setGoal(key);
    posthog.capture("onboarding_goal_selected", { goal: key });
    setStep("currency");
  };

  const toggleBrand = (title: string) => {
    tapLight();
    setSelected((s) => ({ ...s, [title]: !s[title] }));
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
        // Quick-add assumes "today" as the start; flag so we nudge the user to
        // confirm the real renewal date for accurate reminders.
        dateAssumed: true,
      });
      count += 1;
    }
    if (count === 0) {
      finish(0);
      return;
    }
    setAddedCount(count);
    setCelebrateTotal(monthlyTotal);
    setStep("analyzing");
  };

  const afterPick = () => {
    if (selectedBrands.length > 0) setStep("confirm");
    else finish(0);
  };

  const dotIndex = DOT_STEPS.indexOf(step);
  const confirmGuide =
    (goal && CONFIRM_GUIDE[goal]) || "Set what you pay and how often.";

  return (
    <SafeAreaView className="flex-1 bg-background">
      {dotIndex >= 0 && (
        <View className="px-6 pt-3">
          <ProgressBar count={DOT_STEPS.length} index={dotIndex} />
        </View>
      )}

      <Reanimated.View
        key={step}
        entering={FadeIn.duration(220)}
        style={{ flex: 1 }}
      >
        {step === "intro" && (
          <View className="flex-1 justify-between p-6">
            <View className="mt-4 gap-7">
              <FadeInUp delay={40}>
                <View className="items-center gap-4 pt-6">
                  <Image
                    source={logoGlow}
                    style={{ width: 132, height: 132 }}
                    resizeMode="contain"
                  />
                  <View className="items-center">
                    <Text className="auth-wordmark">Recurrly</Text>
                    <Text className="auth-wordmark-sub">SMART BILLING</Text>
                  </View>
                </View>
              </FadeInUp>
              <FadeInUp delay={140}>
                <Text className="onboarding-headline">
                  See what you&apos;re really paying for.
                </Text>
              </FadeInUp>
              <FadeInUp delay={240}>
                <Text className="text-base font-sans-medium text-muted-foreground">
                  No bank login. Your data stays on your phone.
                </Text>
              </FadeInUp>
            </View>
            <PressableScale onPress={() => setStep("goal")}>
              <View className="auth-button">
                <Text className="auth-button-text">Let&apos;s go</Text>
              </View>
            </PressableScale>
          </View>
        )}

        {step === "goal" && (
          <View className="flex-1 justify-between p-6">
            <View className="mt-4 gap-6">
              <GuideBubble text="What brings you here?" />
              <View className="gap-3">
                {GOALS.map((g, i) => (
                  <FadeInUp key={g.key} delay={i * 70}>
                    <Pressable
                      onPress={() => selectGoal(g.key)}
                      className={clsx(
                        "rounded-2xl border p-4",
                        goal === g.key
                          ? "border-accent bg-accent/10"
                          : "border-border bg-card",
                      )}
                    >
                      <Text className="text-base font-sans-semibold text-primary">
                        {g.label}
                      </Text>
                    </Pressable>
                  </FadeInUp>
                ))}
              </View>
            </View>
            <Pressable
              className="items-center py-2"
              onPress={() => setStep("currency")}
            >
              <Text className="text-sm font-sans-semibold text-muted-foreground">
                Skip
              </Text>
            </Pressable>
          </View>
        )}

        {step === "currency" && (
          <View className="flex-1 justify-between p-6">
            <View className="mt-4 gap-6">
              <GuideBubble text="First, what currency do you pay in?" />
              <Pressable
                className="auth-input flex-row items-center justify-between"
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
            <PressableScale onPress={() => setStep("pick")}>
              <View className="auth-button">
                <Text className="auth-button-text">Continue</Text>
              </View>
            </PressableScale>
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
            <GuideBubble text="Tap everything you pay for." />
            <View className="flex-row flex-wrap justify-between gap-y-4">
              {ONBOARDING_BRANDS.map((brand) => {
                const active = !!selected[brand.title];
                return (
                  <Pressable
                    key={brand.title}
                    onPress={() => toggleBrand(brand.title)}
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
            <PressableScale onPress={afterPick}>
              <View className="auth-button mt-2">
                <Text className="auth-button-text">
                  {selectedBrands.length > 0
                    ? `Continue with ${selectedBrands.length}`
                    : "Continue"}
                </Text>
              </View>
            </PressableScale>
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
            <GuideBubble text={confirmGuide} />

            <View className="my-2 items-center rounded-3xl bg-accent p-5">
              <Text className="text-xs font-sans-bold uppercase tracking-[2px] text-white/70">
                Your monthly spend
              </Text>
              <AnimatedCounter
                value={monthlyTotal}
                currency={baseCurrency}
                duration={900}
                className="mt-1 text-5xl font-sans-extrabold text-white"
              />
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

            <PressableScale onPress={addSelected}>
              <View className="auth-button mt-2">
                <Text className="auth-button-text">
                  Add {addableCount} subscription{addableCount === 1 ? "" : "s"}
                </Text>
              </View>
            </PressableScale>
            <Text className="text-center text-xs font-sans-medium text-muted-foreground">
              Edit or remove anything later. Just tap a subscription.
            </Text>
            <Pressable
              className="items-center py-2"
              onPress={() => setStep("pick")}
            >
              <Text className="text-sm font-sans-semibold text-muted-foreground">
                Back
              </Text>
            </Pressable>
          </ScrollView>
        )}

        {step === "analyzing" && (
          <View className="flex-1 items-center justify-center gap-6 p-6">
            <Spinner />
            <Text className="text-lg font-sans-semibold text-muted-foreground">
              {ANALYZING_LINES[analyzeLine]}
            </Text>
          </View>
        )}
      </Reanimated.View>

      {step === "done" && (
        <CelebrationOverlay
          title="You're all set!"
          subtitle={`Now tracking ${formatCurrency(celebrateTotal, baseCurrency)}/mo across ${addedCount} subscription${addedCount === 1 ? "" : "s"}.`}
          onDone={handleCelebrationDone}
        />
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
