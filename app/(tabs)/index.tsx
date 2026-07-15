import AnimatedCounter from "@/components/AnimatedCounter";
import ListHeading from "@/components/ListHeading";
import SubscriptionCard from "@/components/SubscriptionCard";
import SubscriptionFormModal from "@/components/SubscriptionFormModal";
import UpcomingSubscriptionCard from "@/components/UpcomingSubscriptionCard";
import { icons } from "@/constants/icons";
import images from "@/constants/images";
import { useCurrency } from "@/context/CurrencyContext";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import "@/global.css";
import { priceBucket } from "@/lib/analytics";
import { getDaysUntilRenewal, getMonthlyEquivalent } from "@/lib/billing";
import { success } from "@/lib/haptics";
import { hasSeenNudge, markNudgeSeen } from "@/lib/nudges";
import { formatCurrency } from "@/lib/utils";
import { useClerk, useUser } from "@clerk/expo";
import { styled } from "nativewind";
import { usePostHog } from "posthog-react-native";
import { useEffect, useMemo, useState } from "react";
import { Animated, FlatList, Image, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
const SafeAreaView = styled(RNSafeAreaView) as any;

export default function App() {
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const { subscriptions, addSubscription } = useSubscriptions();
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
          currency: subscription.currency,
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
      <FlatList
        ListHeaderComponent={() => (
          <>
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
            <ListHeading title="All Subscriptions" />
          </>
        )}
        data={subscriptions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SubscriptionCard
            {...item}
            expanded={false}
            onPress={() => router.push(`/subscriptions/${item.id}`)}
          />
        )}
        ItemSeparatorComponent={() => <View className="h-4" />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text className="home-empty-state">
            No subscriptions yet — tap + and I&apos;ll do the math.
          </Text>
        }
        contentContainerClassName="pb-30"
      />

      <SubscriptionFormModal
        visible={isCreateModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSubmit={handleCreate}
      />
    </SafeAreaView>
  );
}
