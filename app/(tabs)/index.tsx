import AnimatedCounter from "@/components/AnimatedCounter";
import MilestoneCelebration from "@/components/MilestoneCelebration";
import { FadeInUp, PressableScale } from "@/components/motion";
import PulsingDot from "@/components/PulsingDot";
import ListHeading from "@/components/ListHeading";
import SubscriptionIcon from "@/components/SubscriptionIcon";
import SubscriptionFormModal from "@/components/SubscriptionFormModal";
import UpcomingSubscriptionCard from "@/components/UpcomingSubscriptionCard";
import { icons } from "@/constants/icons";
import images from "@/constants/images";
import { useCurrency } from "@/context/CurrencyContext";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import { useTheme } from "@/context/ThemeContext";
import "@/global.css";
import { priceBucket } from "@/lib/analytics";
import { duplicateActiveNames, normalizeName } from "@/lib/duplicates";
import { checkSavingsMilestone, recordWeeklyOpen } from "@/lib/retention";
import {
  getDaysUntilRenewal,
  getMonthlyEquivalent,
  pendingRenewal,
} from "@/lib/billing";
import { success } from "@/lib/haptics";
import { hasSeenNudge, markNudgeSeen } from "@/lib/nudges";
import { formatCurrency } from "@/lib/utils";
import { useClerk, useUser } from "@clerk/expo";
import { styled } from "nativewind";
import { usePostHog } from "posthog-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
const SafeAreaView = styled(RNSafeAreaView) as any;

export default function App() {
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const { subscriptions, addSubscription, refresh } = useSubscriptions();

  // Re-pull from the DB whenever Home regains focus, so nudge counts reflect
  // actions taken on the detail screen (confirm renewal, delete duplicate, etc).
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  const { baseCurrency } = useCurrency();
  const { palette } = useTheme();
  const posthog = usePostHog();
  const router = useRouter();
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [showAddNudge, setShowAddNudge] = useState(
    () => !hasSeenNudge("add_first"),
  );
  const [streak, setStreak] = useState(0);
  const [milestone, setMilestone] = useState<number | null>(null);

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((sub) => sub.status === "active"),
    [subscriptions],
  );

  // Active subs whose renewal date is still an onboarding assumption — nudge the
  // user to confirm them so reminders are accurate.
  const assumedCount = useMemo(
    () => activeSubscriptions.filter((sub) => sub.dateAssumed).length,
    [activeSubscriptions],
  );

  // Active subs with a charge that came due since last confirmation — nudge to
  // confirm it renewed (or was cancelled). Date-confirm takes priority.
  const renewalCheckinCount = useMemo(
    () =>
      activeSubscriptions.filter(
        (sub) =>
          !sub.dateAssumed &&
          pendingRenewal(
            sub.startDate,
            sub.billingCycle ?? "monthly",
            sub.confirmedThrough,
            sub.customIntervalDays,
          ),
      ).length,
    [activeSubscriptions],
  );

  // Active subs that share a name with another → possible accidental duplicates.
  const duplicateCount = useMemo(() => {
    const dupNames = duplicateActiveNames(subscriptions);
    return activeSubscriptions.filter((sub) =>
      dupNames.has(normalizeName(sub.name)),
    ).length;
  }, [subscriptions, activeSubscriptions]);

  // One-time first-run nudge: gently pulse the "+" until the first sub is added.
  const [addPulse] = useState(() => new Animated.Value(1));
  const nudgeActive = showAddNudge && activeSubscriptions.length === 0;
  useEffect(() => {
    if (!nudgeActive) {
      addPulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(addPulse, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(addPulse, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [nudgeActive, addPulse]);

  // Real monthly outflow across mixed billing cycles (annual/quarterly/etc.
  // are normalized to a per-month average, so the total reflects everything).
  // Free trials cost nothing until they convert, so they don't count toward
  // current spend (they surface as a conversion check-in instead).
  const monthlyTotal = useMemo(
    () =>
      activeSubscriptions
        .filter((sub) => !sub.isTrial)
        .reduce(
          (total, sub) =>
            total +
            getMonthlyEquivalent(
              sub.price,
              sub.billingCycle ?? "monthly",
              sub.customIntervalDays,
            ),
          0,
        ),
    [activeSubscriptions],
  );
  const yearlyTotal = monthlyTotal * 12;

  const upcomingRenewals: UpcomingSubscription[] = useMemo(
    () =>
      activeSubscriptions
        .map((subscription) => ({
          id: subscription.id,
          name: subscription.name,
          price: subscription.price,
          daysLeft:
            getDaysUntilRenewal(
              subscription.renewalDate ?? subscription.startDate,
              subscription.billingCycle ?? "monthly",
              subscription.customIntervalDays,
            ) ?? Infinity,
        }))
        .sort((a, b) => a.daysLeft - b.daysLeft),
    [activeSubscriptions],
  );

  // Motivational retention hook: recurring value the user has cut (cancelled
  // subs), mirrored from Insights.
  const savedMonthly = useMemo(
    () =>
      subscriptions
        .filter((s) => s.status === "cancelled")
        .reduce(
          (sum, s) =>
            sum +
            getMonthlyEquivalent(
              s.price,
              s.billingCycle ?? "monthly",
              s.customIntervalDays,
            ),
          0,
        ),
    [subscriptions],
  );

  // Top spend categories for the slim "Where it goes" glimpse (paying subs).
  const categoryBreakdown = useMemo(() => {
    const byCat = new Map<string, number>();
    for (const s of activeSubscriptions) {
      if (s.isTrial) continue;
      const cat = s.category?.trim() || "Other";
      byCat.set(
        cat,
        (byCat.get(cat) ?? 0) +
          getMonthlyEquivalent(
            s.price,
            s.billingCycle ?? "monthly",
            s.customIntervalDays,
          ),
      );
    }
    return Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]);
  }, [activeSubscriptions]);

  const categoryColors = [
    palette.accent,
    "#9b8bef",
    palette.success,
    palette.warning,
    palette.info,
  ];

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // Weekly "audit" streak — recorded once per open.
  useEffect(() => {
    setStreak(recordWeeklyOpen());
  }, []);

  // Celebrate when cancellation savings cross a new annual milestone.
  useEffect(() => {
    const reached = checkSavingsMilestone(savedMonthly * 12);
    if (reached !== null) setMilestone(reached);
  }, [savedMonthly]);

  const handleCreate = (draft: SubscriptionDraft) => {
    const created = addSubscription(draft);
    success();
    if (showAddNudge) {
      markNudgeSeen("add_first");
      setShowAddNudge(false);
    }
    // Non-identifying signal only: no name, no exact price, no currency.
    posthog.capture("subscription_created", {
      subscription_id: created.id,
      billing_cycle: created.billingCycle ?? "monthly",
      category: created.category ?? "Uncategorized",
      is_trial: !!created.isTrial,
      price_bucket: priceBucket(
        getMonthlyEquivalent(
          created.price,
          created.billingCycle ?? "monthly",
          created.customIntervalDays,
        ),
      ),
    });
  };

  const displayName =
    user?.firstName ||
    user?.emailAddresses[0]?.emailAddress?.split("@")[0] ||
    "Guest";

  return (
    <SafeAreaView className="flex-1  bg-background p-5">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-30"
      >
        <View className="home-header">
              <View className="home-user">
                <Image
                  source={{
                    uri:
                      user?.imageUrl ||
                      Image.resolveAssetSource(images.avatar).uri,
                  }}
                  resizeMode="contain"
                  className="home-avatar"
                />
                <View>
                  <Text className="ml-4 text-sm font-sans-medium text-muted-foreground">
                    {greeting}
                  </Text>
                  <Text className="home-user-name">{displayName}</Text>
                  {streak >= 2 && (
                    <View className="ml-4 mt-1 self-start rounded-full bg-warning/10 px-2.5 py-1">
                      <Text className="text-[11px] font-sans-bold text-warning">
                        🔥 {streak}-week streak
                      </Text>
                    </View>
                  )}
                  {isSignedIn && (
                    <Pressable onPress={() => signOut()} className="ml-4 mt-1">
                      <Text className="text-sm font-sans-medium text-destructive">
                        Sign out
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
              <Pressable onPress={() => setCreateModalVisible(true)}>
                <Animated.View style={{ transform: [{ scale: addPulse }] }}>
                  <Image source={icons.add} className="home-add-icon" />
                </Animated.View>
              </Pressable>
            </View>

            {/* FEEL — spend, the emotional hero */}
            <View className="mb-4 rounded-3xl border border-border bg-card p-6">
              <Text className="text-xs font-sans-bold uppercase tracking-[2px] text-muted-foreground">
                You&apos;re spending
              </Text>
              <AnimatedCounter
                value={monthlyTotal}
                currency={baseCurrency}
                className="mt-1 text-6xl font-display-black text-primary"
                numberOfLines={1}
                adjustsFontSizeToFit
              />
              <Text className="mt-1 text-sm font-sans-medium text-muted-foreground">
                a month · ≈ {formatCurrency(yearlyTotal, baseCurrency)} / year ·{" "}
                {activeSubscriptions.length} active
              </Text>
            </View>

            {/* Where it goes — slim glimpse into Insights */}
            {categoryBreakdown.length > 0 && (
              <View className="mb-4">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-xs font-sans-bold uppercase tracking-[1px] text-muted-foreground">
                    Where it goes
                  </Text>
                  <PressableScale onPress={() => router.push("/insights")}>
                    <Text className="text-xs font-sans-bold text-accent">
                      Details ›
                    </Text>
                  </PressableScale>
                </View>
                <View
                  className="h-2.5 flex-row overflow-hidden rounded-full"
                  style={{ gap: 2 }}
                >
                  {categoryBreakdown.slice(0, 5).map(([cat, amt], i) => (
                    <View
                      key={cat}
                      style={{
                        flexGrow: amt,
                        backgroundColor:
                          categoryColors[i % categoryColors.length],
                      }}
                    />
                  ))}
                </View>
                <View className="mt-2 flex-row flex-wrap items-center gap-x-3 gap-y-1">
                  {categoryBreakdown.slice(0, 3).map(([cat], i) => (
                    <View key={cat} className="flex-row items-center gap-1.5">
                      <View
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 99,
                          backgroundColor:
                            categoryColors[i % categoryColors.length],
                        }}
                      />
                      <Text className="text-[11px] font-sans-medium text-muted-foreground">
                        {cat}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Motivational — what you've saved */}
            {savedMonthly > 0 && (
              <FadeInUp>
                <View className="mb-4 flex-row items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-3.5">
                  <View
                    className="size-9 items-center justify-center rounded-xl"
                    style={{ backgroundColor: palette.success }}
                  >
                    <Text
                      className="font-sans-bold"
                      style={{ color: "#04130c", fontSize: 16 }}
                    >
                      ↓
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-sans-bold text-primary">
                      You&apos;ve saved{" "}
                      {formatCurrency(savedMonthly, baseCurrency)}/mo
                    </Text>
                    <Text className="mt-0.5 text-xs font-sans-medium text-muted-foreground">
                      {formatCurrency(savedMonthly * 12, baseCurrency)} a year
                      back 🎉
                    </Text>
                  </View>
                </View>
              </FadeInUp>
            )}

            <View className="mb-5">
              <ListHeading title="Next up" />
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={upcomingRenewals}
                renderItem={({ item }) => (
                  <UpcomingSubscriptionCard {...item} />
                )}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                  <Text className="home-empty-state">
                    No upcoming renewals yet.
                  </Text>
                }
              />
            </View>
            {assumedCount > 0 && (
              <FadeInUp>
                <PressableScale onPress={() => router.push("/subscriptions")}>
                  <View className="mb-4 flex-row items-center gap-3 rounded-2xl border border-warning bg-warning/10 p-4">
                    <PulsingDot size={10} color={palette.warning} />
                    <View className="flex-1">
                      <Text className="text-sm font-sans-bold text-primary">
                        {assumedCount} subscription
                        {assumedCount === 1 ? "" : "s"} need a renewal date
                      </Text>
                      <Text className="mt-0.5 text-xs font-sans-medium text-muted-foreground">
                        Confirm them so reminders land on the right day.
                      </Text>
                    </View>
                    <Text className="text-base font-sans-bold text-warning">
                      Review ›
                    </Text>
                  </View>
                </PressableScale>
              </FadeInUp>
            )}
            {renewalCheckinCount > 0 && (
              <FadeInUp>
                <PressableScale onPress={() => router.push("/subscriptions")}>
                  <View className="mb-4 flex-row items-center gap-3 rounded-2xl border border-accent bg-accent/10 p-4">
                    <PulsingDot size={10} color={palette.accent} />
                    <View className="flex-1">
                      <Text className="text-sm font-sans-bold text-primary">
                        {renewalCheckinCount} subscription
                        {renewalCheckinCount === 1 ? "" : "s"} renewed recently
                      </Text>
                      <Text className="mt-0.5 text-xs font-sans-medium text-muted-foreground">
                        Confirm it renewed — or cancelled — to keep tracking
                        accurate.
                      </Text>
                    </View>
                    <Text className="text-base font-sans-bold text-accent">
                      Review ›
                    </Text>
                  </View>
                </PressableScale>
              </FadeInUp>
            )}
            {duplicateCount > 1 && (
              <FadeInUp>
                <PressableScale onPress={() => router.push("/subscriptions")}>
                  <View className="mb-4 flex-row items-center gap-3 rounded-2xl border border-destructive bg-destructive/10 p-4">
                    <PulsingDot size={10} color={palette.destructive} />
                    <View className="flex-1">
                      <Text className="text-sm font-sans-bold text-primary">
                        Possible duplicate subscriptions
                      </Text>
                      <Text className="mt-0.5 text-xs font-sans-medium text-muted-foreground">
                        {duplicateCount} subscriptions share a name — review and
                        remove any extras.
                      </Text>
                    </View>
                    <Text className="text-base font-sans-bold text-destructive">
                      Review ›
                    </Text>
                  </View>
                </PressableScale>
              </FadeInUp>
            )}
            {subscriptions.length === 0 ? (
              <View className="items-center py-6">
                <Text className="home-empty-state">
                  No subscriptions yet. Tap + and I&apos;ll do the math.
                </Text>
              </View>
            ) : (
              <PressableScale onPress={() => router.push("/subscriptions")}>
                <View className="flex-row items-center justify-between rounded-2xl border border-border bg-card p-4">
                  <View className="min-w-0 flex-1 flex-row items-center gap-3">
                    <View className="flex-row">
                      {activeSubscriptions.slice(0, 4).map((sub, i) => (
                        <View
                          key={sub.id}
                          className="border-card"
                          style={{
                            marginLeft: i === 0 ? 0 : -12,
                            borderRadius: 12,
                            borderWidth: 2,
                          }}
                        >
                          <SubscriptionIcon name={sub.name} size={36} />
                        </View>
                      ))}
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-base font-sans-semibold text-primary">
                        Your subscriptions
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="mt-0.5 text-sm font-sans-medium text-muted-foreground"
                      >
                        {activeSubscriptions.length} active ·{" "}
                        {subscriptions.length} total
                      </Text>
                    </View>
                  </View>
                  <Text className="ml-2 text-2xl font-sans-medium text-muted-foreground">
                    ›
                  </Text>
                </View>
              </PressableScale>
            )}
      </ScrollView>

      <SubscriptionFormModal
        visible={isCreateModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSubmit={handleCreate}
      />

      <MilestoneCelebration
        visible={milestone !== null}
        amount={milestone ?? 0}
        currency={baseCurrency}
        onClose={() => setMilestone(null)}
      />
    </SafeAreaView>
  );
}
