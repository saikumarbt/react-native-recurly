import AnimatedCounter from "@/components/AnimatedCounter";
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
import "@/global.css";
import { priceBucket } from "@/lib/analytics";
import { duplicateActiveNames, normalizeName } from "@/lib/duplicates";
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
  const posthog = usePostHog();
  const router = useRouter();
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [showAddNudge, setShowAddNudge] = useState(
    () => !hasSeenNudge("add_first"),
  );

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
  const monthlyTotal = useMemo(
    () =>
      activeSubscriptions.reduce(
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

  // Soonest upcoming renewal, for the hero footer.
  const nextUp = upcomingRenewals[0] ?? null;
  const nextUpWhen =
    nextUp === null || !Number.isFinite(nextUp.daysLeft)
      ? ""
      : nextUp.daysLeft <= 0
        ? "due today"
        : nextUp.daysLeft === 1
          ? "tomorrow"
          : `in ${nextUp.daysLeft} days`;

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
                  <Text className="home-user-name">{displayName}</Text>
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

            <View className="home-hero">
              <View className="home-hero-top">
                <Text className="home-hero-label">Spend per month</Text>
                <View className="home-hero-badge">
                  <Text className="home-hero-badge-text">
                    {activeSubscriptions.length} active
                  </Text>
                </View>
              </View>

              <AnimatedCounter
                value={monthlyTotal}
                currency={baseCurrency}
                className="home-hero-amount"
                numberOfLines={1}
                adjustsFontSizeToFit
              />
              <Text className="home-hero-year">
                ≈ {formatCurrency(yearlyTotal, baseCurrency)} / year
              </Text>

              <View className="home-hero-divider" />

              <View className="home-hero-foot">
                <View className="min-w-0 flex-1">
                  <Text className="home-hero-foot-label">Next renewal</Text>
                  <Text className="home-hero-foot-value" numberOfLines={1}>
                    {nextUp ? nextUp.name : "Nothing upcoming"}
                  </Text>
                </View>
                {nextUp ? (
                  <View className="items-end">
                    <Text className="home-hero-foot-value">
                      {formatCurrency(nextUp.price, baseCurrency)}
                    </Text>
                    <Text className="home-hero-foot-label">{nextUpWhen}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View className="mb-5">
              <ListHeading title="Upcoming" />
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
                  <View
                    className="mb-4 flex-row items-center gap-3 rounded-2xl border p-4"
                    style={{
                      borderColor: "#E0952F",
                      backgroundColor: "rgba(224,149,47,0.08)",
                    }}
                  >
                    <PulsingDot size={10} />
                    <View className="flex-1">
                      <Text className="text-sm font-sans-bold text-primary">
                        {assumedCount} subscription
                        {assumedCount === 1 ? "" : "s"} need a renewal date
                      </Text>
                      <Text className="mt-0.5 text-xs font-sans-medium text-muted-foreground">
                        Confirm them so reminders land on the right day.
                      </Text>
                    </View>
                    <Text
                      className="text-base font-sans-bold"
                      style={{ color: "#E0952F" }}
                    >
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
                    <PulsingDot size={10} color="#ea7a53" />
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
                    <Text
                      className="text-base font-sans-bold"
                      style={{ color: "#ea7a53" }}
                    >
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
                    <PulsingDot size={10} color="#dc2626" />
                    <View className="flex-1">
                      <Text className="text-sm font-sans-bold text-primary">
                        Possible duplicate subscriptions
                      </Text>
                      <Text className="mt-0.5 text-xs font-sans-medium text-muted-foreground">
                        {duplicateCount} subscriptions share a name — review and
                        remove any extras.
                      </Text>
                    </View>
                    <Text
                      className="text-base font-sans-bold"
                      style={{ color: "#dc2626" }}
                    >
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
    </SafeAreaView>
  );
}
