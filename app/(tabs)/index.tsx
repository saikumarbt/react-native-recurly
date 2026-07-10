import CreateSubscriptionModal from "@/components/CreateSubscriptionModal";
import ListHeading from "@/components/ListHeading";
import SubscriptionCard from "@/components/SubscriptionCard";
import UpcomingSubscriptionCard from "@/components/UpcomingSubscriptionCard";
import { HOME_BALANCE, HOME_USER } from "@/constants/data";
import { icons } from "@/constants/icons";
import images from "@/constants/images";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import "@/global.css";
import { formatCurrency, getDaysUntilRenewal } from "@/lib/utils";
import { useClerk, useUser } from "@clerk/expo";
import dayjs from "dayjs";
import { styled } from "nativewind";
import { useMemo, useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";

import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
const SafeAreaView = styled(RNSafeAreaView) as any;

export default function App() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { subscriptions, addSubscription } = useSubscriptions();
  const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<
    string | null
  >(null);
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);

  const upcomingRenewals: UpcomingSubscription[] = useMemo(
    () =>
      subscriptions
        .filter((subscription) => subscription.status !== "cancelled")
        .map((subscription) => ({
          id: subscription.id,
          icon: subscription.icon,
          name: subscription.name,
          price: subscription.price,
          currency: subscription.currency,
          daysLeft:
            getDaysUntilRenewal(
              subscription.renewalDate,
              subscription.billing,
            ) ?? Infinity,
        }))
        .sort((a, b) => a.daysLeft - b.daysLeft),
    [subscriptions],
  );

  const displayName =
    user?.firstName ||
    user?.emailAddresses[0]?.emailAddress?.split("@")[0] ||
    HOME_USER.name;

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
                  <Pressable onPress={() => signOut()} className="ml-4 mt-1">
                    <Text className="text-sm font-sans-medium text-destructive">
                      Sign out
                    </Text>
                  </Pressable>
                </View>
              </View>
              <Pressable onPress={() => setCreateModalVisible(true)}>
                <Image source={icons.add} className="home-add-icon" />
              </Pressable>
            </View>

            <View className="home-balance-card">
              <Text className="home-balance-label">Balance</Text>
              <View className="home-balance-row">
                <Text className="home-balance-amount">
                  {formatCurrency(HOME_BALANCE.amount)}
                </Text>
                <Text className="home-balance-date">
                  {dayjs(HOME_BALANCE.nextRenewalDate).format("MM/DD")}
                </Text>
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
            expanded={expandedSubscriptionId === item.id}
            onPress={() =>
              setExpandedSubscriptionId((currentId) =>
                currentId === item.id ? null : item.id,
              )
            }
          />
        )}
        extraData={expandedSubscriptionId}
        ItemSeparatorComponent={() => <View className="h-4" />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text className="home-empty-state">No subscriptions yet</Text>
        }
        contentContainerClassName="pb-30"
      />

      <CreateSubscriptionModal
        visible={isCreateModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreate={addSubscription}
      />
    </SafeAreaView>
  );
}
