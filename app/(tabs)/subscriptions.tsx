import ListHeading from "@/components/ListHeading";
import SubscriptionCard from "@/components/SubscriptionCard";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import { useTheme } from "@/context/ThemeContext";
import "@/global.css";
import { getDaysUntilRenewal, getMonthlyEquivalent } from "@/lib/billing";
import { duplicateActiveNames, normalizeName } from "@/lib/duplicates";
import clsx from "clsx";
import { useFocusEffect, useRouter } from "expo-router";
import { styled } from "nativewind";
import { useCallback, useMemo, useState } from "react";

import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView) as any;
const StyledKeyboardAvoidingView = styled(KeyboardAvoidingView) as any;

type SortKey = "renewal" | "cost" | "name";
type SortDir = "asc" | "desc";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "renewal", label: "Renewal" },
  { key: "cost", label: "Cost" },
  { key: "name", label: "Name" },
];

// Sensible default direction per sort: soonest renewal, priciest first, A–Z.
const DEFAULT_DIR: Record<SortKey, SortDir> = {
  renewal: "asc",
  cost: "desc",
  name: "asc",
};

const UNCATEGORIZED = "Uncategorized";
const categoryOf = (sub: Subscription): string =>
  sub.category?.trim() || sub.plan?.trim() || UNCATEGORIZED;

/** Monthly-equivalent cost, so a $120/yr sub compares fairly with a $10/mo one. */
const monthlyCost = (sub: Subscription): number =>
  getMonthlyEquivalent(
    sub.price,
    sub.billingCycle ?? "monthly",
    sub.customIntervalDays,
  );

/** Days until next renewal, or null for subs with no active renewal (paused /
 * cancelled), so they sort to the bottom — matching the card, which only shows
 * a countdown for active subs. */
const renewalDays = (sub: Subscription): number | null => {
  const isActive = sub.status === "active" || sub.status === undefined;
  if (!isActive) return null;
  return getDaysUntilRenewal(
    sub.renewalDate ?? sub.startDate,
    sub.billingCycle ?? "monthly",
    sub.customIntervalDays,
  );
};

/** A small toggle pill used for both sort and filter controls. */
const Chip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className={clsx(
      "rounded-full border px-3.5 py-1.5",
      active ? "border-accent bg-accent/10" : "border-border bg-card",
    )}
  >
    <Text
      className={clsx(
        "text-sm font-sans-semibold",
        active ? "text-accent" : "text-muted-foreground",
      )}
    >
      {label}
    </Text>
  </Pressable>
);

const Subscriptions = () => {
  const { subscriptions, refresh } = useSubscriptions();
  const { palette } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("renewal");
  const [sortDir, setSortDir] = useState<SortDir>(DEFAULT_DIR.renewal);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Reflect actions taken on the detail screen (delete, cancel, confirm).
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const duplicateNames = useMemo(
    () => duplicateActiveNames(subscriptions),
    [subscriptions],
  );

  // Distinct categories present, for the filter row (only worth showing >1).
  const categories = useMemo(() => {
    const set = new Set(subscriptions.map(categoryOf));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [subscriptions]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(DEFAULT_DIR[key]);
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const visibleSubscriptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const matches = subscriptions.filter((subscription) => {
      const inSearch =
        !normalizedQuery ||
        [
          subscription.name,
          subscription.category,
          subscription.plan,
          subscription.status,
        ]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(normalizedQuery));

      const inCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(categoryOf(subscription));

      return inSearch && inCategory;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    return matches.sort((a, b) => {
      if (sortKey === "name") {
        return a.name.localeCompare(b.name) * dir;
      }
      if (sortKey === "cost") {
        return (monthlyCost(a) - monthlyCost(b)) * dir;
      }
      // renewal — subs with no active renewal sort to the bottom either way.
      const da = renewalDays(a);
      const db = renewalDays(b);
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return (da - db) * dir;
    });
  }, [query, subscriptions, selectedCategories, sortKey, sortDir]);

  const arrow = sortDir === "asc" ? " ↑" : " ↓";

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
                placeholderTextColor={palette.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                className="mb-3 rounded-2xl border border-border bg-card px-4 py-3 font-sans-medium text-base text-primary"
              />

              {/* Sort control */}
              <View className="mb-3 flex-row items-center gap-2">
                <Text className="text-sm font-sans-semibold text-muted-foreground">
                  Sort
                </Text>
                {SORTS.map((s) => (
                  <Chip
                    key={s.key}
                    label={s.key === sortKey ? `${s.label}${arrow}` : s.label}
                    active={s.key === sortKey}
                    onPress={() => handleSort(s.key)}
                  />
                ))}
              </View>

              {/* Category filter (only when there's more than one category) */}
              {categories.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  className="mb-5 -mx-1"
                  contentContainerClassName="gap-2 px-1"
                >
                  {selectedCategories.length > 0 ? (
                    <Chip
                      label="Clear"
                      active={false}
                      onPress={() => setSelectedCategories([])}
                    />
                  ) : null}
                  {categories.map((category) => (
                    <Chip
                      key={category}
                      label={category}
                      active={selectedCategories.includes(category)}
                      onPress={() => toggleCategory(category)}
                    />
                  ))}
                </ScrollView>
              ) : (
                <View className="mb-5" />
              )}
            </>
          }
          data={visibleSubscriptions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SubscriptionCard
              {...item}
              expanded={false}
              isDuplicate={duplicateNames.has(normalizeName(item.name))}
              onPress={() => router.push(`/subscriptions/${item.id}`)}
            />
          )}
          ItemSeparatorComponent={() => <View className="h-4" />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text className="home-empty-state">
              No subscriptions match your filters.
            </Text>
          }
          contentContainerClassName="pb-30"
        />
      </StyledKeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Subscriptions;
