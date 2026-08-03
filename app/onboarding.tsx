import AnimatedCounter from "@/components/AnimatedCounter";
import { FadeInUp, PressableScale } from "@/components/motion";
import GuideBubble from "@/components/onboarding/GuideBubble";
import ProgressBar from "@/components/onboarding/ProgressBar";
import PickerSheet, { type PickerItem } from "@/components/PickerSheet";
import SubscriptionIcon from "@/components/SubscriptionIcon";
import logoGlow from "@/assets/images/logo-glow.png";
import { CURRENCY_CODES, currencyName } from "@/constants/currencies";
import {
  ONBOARDING_BRANDS,
  groupOnboardingBrands,
} from "@/constants/onboardingBrands";
import { useCurrency } from "@/context/CurrencyContext";
import { useEntitlement } from "@/context/EntitlementsContext";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import { useTheme } from "@/context/ThemeContext";
import "@/global.css";
import {
  BILLING_CYCLE_KEYS,
  getCycleLabel,
  getMonthlyEquivalent,
  resolveNextRenewal,
  type BillingCycle,
} from "@/lib/billing";
import { tapLight } from "@/lib/haptics";
import { remainingSlots } from "@/lib/limits";
import { markOnboarded } from "@/lib/onboarding";
import { formatCurrency } from "@/lib/utils";
import clsx from "clsx";
import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { styled } from "nativewind";
import { usePostHog } from "posthog-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  | "reveal";

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
  "Working out what renews…",
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
        borderColor: "rgba(127,127,127,0.18)",
        borderTopColor: "#6e5be4",
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
  const { addSubscription, subscriptions } = useSubscriptions();
  const { palette } = useTheme();
  const { isPro } = useEntitlement();

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
  const [brandQuery, setBrandQuery] = useState("");
  // Accordion for the brand picker: one category open at a time so the user
  // jumps to a section instead of scrolling the whole catalog. `undefined` =
  // default (first open), null = all collapsed, string = that category.
  const [openCategory, setOpenCategory] = useState<string | null | undefined>(
    undefined,
  );

  const cycleFor = (title: string): BillingCycle => cycles[title] ?? "monthly";

  // Brands grouped under category headings (ordered), filtered by the search
  // box — so the picker reads as tidy sections instead of one long wall. Shared
  // with the add-subscription sheet via groupOnboardingBrands.
  const brandGroups = useMemo(
    () => groupOnboardingBrands(brandQuery),
    [brandQuery],
  );

  // The "analyzing" anticipation beat: cycle lines, then reveal the celebration.
  useEffect(() => {
    if (step !== "analyzing") return;
    setAnalyzeLine(0);
    const cycle = setInterval(
      () => setAnalyzeLine((i) => (i + 1) % ANALYZING_LINES.length),
      650,
    );
    const done = setTimeout(() => setStep("reveal"), 1400);
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

  // Reveal-step choices. The trial is offered once, here, at the peak "oh, that
  // adds up" moment — never a wall. "Maybe later" drops straight into the app.
  const completeToDashboard = () => finish(addedCount);
  const completeToTrial = () => {
    markOnboarded();
    posthog.capture("onboarding_completed", {
      subs_added: addedCount,
      chose_trial: true,
    });
    // Land in the app first, then present the paywall on top — so dismissing it
    // (without buying) drops the user onto their dashboard, not back here.
    router.replace("/");
    router.push("/paywall?source=onboarding");
  };

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
    // Free tier caps active subscriptions, so onboarding can't seed past it.
    // Base the allowance on slots REMAINING (accounts for any subs already
    // tracked — e.g. if onboarding is ever re-run), not a raw count from zero.
    // The reveal's trial offer is how a heavy tracker unlocks the rest.
    const limit = remainingSlots(subscriptions, isPro);
    let count = 0;
    for (const brand of selectedBrands) {
      if (count >= limit) break;
      const price = priceFor(brand.title, brand.price);
      if (price <= 0) continue;
      const cycle = cycleFor(brand.title);
      addSubscription({
        name: brand.title,
        price,
        billingCycle: cycle,
        category: brand.category,
        status: "active",
        startDate: now,
        renewalDate: resolveNextRenewal(now, cycle)?.toISOString() ?? undefined,
        // Quick-add assumes "today" as the start; flag so we nudge the user to
        // confirm the real renewal date for accurate reminders.
        dateAssumed: true,
        // Nothing to check in on yet — the assumed start is "confirmed" until
        // the user sets the real date (which re-anchors this).
        confirmedThrough: now,
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
                  <Text className="auth-wordmark">myrev</Text>
                </View>
              </FadeInUp>
              <FadeInUp delay={140}>
                <Text className="onboarding-headline">Hi, I&apos;m myrev.</Text>
                <Text className="mt-2 text-lg font-sans-medium text-muted-foreground">
                  I keep an eye on what renews — so a charge never catches you
                  off guard.
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
              <GuideBubble text="So I can help — what brings you here?" />
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
              <GuideBubble text="First — what currency do you pay in? I'll use it for every amount." />
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
            <GuideBubble text="Tap everything you pay for — I'll tally it up." />
            <TextInput
              value={brandQuery}
              onChangeText={setBrandQuery}
              placeholder="Search subscriptions"
              placeholderTextColor={palette.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              className="rounded-2xl border border-border bg-card px-4 py-3 font-sans-medium text-base text-primary"
            />
            {brandGroups.length === 0 ? (
              <Text className="home-empty-state">
                No matches. Try another name — you can add it manually later.
              </Text>
            ) : (
              brandGroups.map(({ category, brands }) => {
                const searching = brandQuery.trim().length > 0;
                const effectiveOpen =
                  openCategory === undefined
                    ? brandGroups[0]?.category
                    : openCategory;
                // While searching, reveal every group; otherwise accordion.
                const expanded = searching || category === effectiveOpen;
                const selCount = brands.filter(
                  (b) => selected[b.title],
                ).length;
                return (
                  <View
                    key={category}
                    className="overflow-hidden rounded-2xl border border-border bg-card"
                  >
                    <Pressable
                      onPress={() =>
                        !searching &&
                        setOpenCategory(expanded ? null : category)
                      }
                      className="flex-row items-center justify-between px-4 py-3.5"
                    >
                      <View className="flex-row items-center gap-2">
                        <Text className="text-sm font-sans-bold text-primary">
                          {category}
                        </Text>
                        {selCount > 0 ? (
                          <View className="rounded-full bg-accent px-2 py-0.5">
                            <Text className="text-[11px] font-sans-bold text-on-accent">
                              {selCount}
                            </Text>
                          </View>
                        ) : (
                          <Text className="text-xs font-sans-medium text-muted-foreground">
                            {brands.length}
                          </Text>
                        )}
                      </View>
                      <Text className="text-base font-sans-bold text-muted-foreground">
                        {expanded ? "▾" : "▸"}
                      </Text>
                    </Pressable>
                    {expanded ? (
                      <View className="flex-row flex-wrap justify-between gap-y-4 px-4 pb-4">
                        {brands.map((brand) => {
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
                                  : "border-border bg-background",
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
                        {brands.length % 3 !== 0 ? (
                          <View style={{ width: "31%" }} />
                        ) : null}
                        {brands.length % 3 === 1 ? (
                          <View style={{ width: "31%" }} />
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
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

            {/* Compact running subtotal — the full reveal comes after adding. */}
            <View className="my-1 flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
              <Text className="text-xs font-sans-bold uppercase tracking-[2px] text-muted-foreground">
                Monthly so far
              </Text>
              <AnimatedCounter
                value={monthlyTotal}
                currency={baseCurrency}
                duration={500}
                className="text-xl font-display-semibold text-primary"
              />
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
                  placeholderTextColor={palette.mutedForeground}
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

        {step === "reveal" && (
          // The aha moment: a big count-up to the yearly figure, assistant voice,
          // then the trial offered once (with a real "maybe later" escape).
          <View className="flex-1 justify-between p-6">
            <View className="flex-1 items-center justify-center gap-3">
              <FadeInUp delay={60}>
                <Text className="text-center text-xs font-sans-bold uppercase tracking-[3px] text-accent">
                  Here&apos;s what renews
                </Text>
              </FadeInUp>
              <FadeInUp delay={160}>
                <AnimatedCounter
                  value={celebrateTotal * 12}
                  currency={baseCurrency}
                  duration={1500}
                  className="text-center text-6xl font-display-black text-primary"
                />
              </FadeInUp>
              <FadeInUp delay={340}>
                <Text className="text-center text-base font-sans-medium text-muted-foreground">
                  a year · {formatCurrency(celebrateTotal, baseCurrency)}/mo
                  across {addedCount} subscription
                  {addedCount === 1 ? "" : "s"}
                </Text>
              </FadeInUp>
              <FadeInUp delay={560}>
                <Text className="mt-4 text-center text-base font-sans-medium text-primary">
                  I&apos;ll keep watch and warn you before each one renews.
                </Text>
              </FadeInUp>
            </View>
            <FadeInUp delay={780}>
              <View className="gap-3">
                <View className="flex-row items-center gap-2 rounded-3xl border border-accent bg-accent/10 p-4">
                  <Text className="text-base text-accent">✦</Text>
                  <Text className="flex-1 text-sm font-sans-medium text-muted-foreground">
                    Want me to find savings — overlaps, zombies, cheaper plans?
                    Try Pro free for 3 days.
                  </Text>
                </View>
                <PressableScale onPress={completeToTrial}>
                  <View className="auth-button">
                    <Text className="auth-button-text">
                      Start 3-day free trial
                    </Text>
                  </View>
                </PressableScale>
                <Pressable
                  className="items-center py-2"
                  onPress={completeToDashboard}
                >
                  <Text className="text-sm font-sans-semibold text-muted-foreground">
                    Maybe later — go to my dashboard
                  </Text>
                </Pressable>
              </View>
            </FadeInUp>
          </View>
        )}
      </Reanimated.View>

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
