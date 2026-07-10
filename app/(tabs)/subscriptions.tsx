import ListHeading from "@/components/ListHeading";
import SubscriptionCard from "@/components/SubscriptionCard";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import "@/global.css";
import { useRouter } from "expo-router";
import { styled } from "nativewind";
import { useMemo, useState } from "react";

import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView) as any;
const StyledKeyboardAvoidingView = styled(KeyboardAvoidingView) as any;

const Subscriptions = () => {
  const { subscriptions } = useSubscriptions();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filteredSubscriptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return subscriptions;
    }

    return subscriptions.filter((subscription) =>
      [
        subscription.name,
        subscription.category,
        subscription.plan,
        subscription.status,
      ]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(normalizedQuery)),
    );
  }, [query, subscriptions]);

  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <StyledKeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlatList
          ListHeaderComponent={
            <>
              <ListHeading title="Subscriptions" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search subscriptions"
                placeholderTextColor="rgba(0, 0, 0, 0.6)"
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                className="mb-5 rounded-2xl border border-border bg-card px-4 py-3 font-sans-medium text-base text-primary"
              />
            </>
          }
          data={filteredSubscriptions}
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
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text className="home-empty-state">
              No subscriptions match your search.
            </Text>
          }
          contentContainerClassName="pb-30"
        />
      </StyledKeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Subscriptions;
