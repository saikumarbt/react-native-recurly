import CategoryFilterSheet, {
  type CategoryOption,
} from "@/components/CategoryFilterSheet";
import SubscriptionCard from "@/components/SubscriptionCard";
import { useCurrency } from "@/context/CurrencyContext";
import { useEntitlement } from "@/context/EntitlementsContext";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import { useTheme } from "@/context/ThemeContext";
import "@/global.css";
import { getDaysUntilRenewal, getMonthlyEquivalent } from "@/lib/billing";
import { duplicateActiveNames, normalizeName } from "@/lib/duplicates";
import { canAddActive } from "@/lib/limits";
import { computeFound } from "@/lib/found";
import { getKeptSubIds } from "@/lib/foundKept";
import { formatCurrency } from "@/lib/utils";
import clsx from "clsx";
import { useFocusEffect, useRouter } from "expo-router";
import { styled } from "nativewind";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SectionList,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView) as any;
const StyledKeyboardAvoidingView = styled(KeyboardAvoidingView) as any;

type Tone = "default" | "info" | "warning" | "success";
type Section = {
  key: string;
  title: string;
  meta: string;
  tone: Tone;
  data: Subscription[];
};

/** Monthly-equivalent cost, so a $120/yr sub compares fairly with a $10/mo one. */
const monthlyCost = (sub: Subscription): number =>
  getMonthlyEquivalent(
    sub.price,
    sub.billingCycle ?? "monthly",
    sub.customIntervalDays,
  );

/** Days until next renewal for an active sub (null → sorts last). */
const renewalDays = (sub: Subscription): number | null => {
  const isActive = sub.status === "active" || sub.status === undefined;
  if (!isActive) return null;
  return getDaysUntilRenewal(
    sub.renewalDate ?? sub.startDate,
    sub.billingCycle ?? "monthly",
    sub.customIntervalDays,
  );
};

// Boardroom 2026-07-28: at or below this many categories, show inline chips
// (the common case — free caps at 5 subs); above it, collapse to a "Filter"
// pill + multi-select sheet so a large library never becomes a blind scroll.
const INLINE_CATEGORY_LIMIT = 6;

type SortKey = "renewal" | "price" | "name";
type SortDir = "asc" | "desc";

const SORT_LABELS: { key: SortKey; label: string }[] = [
  { key: "renewal", label: "Renewal" },
  { key: "price", label: "Price" },
  { key: "name", label: "Name" },
];

// Each sort supports both directions (tap the active chip to flip). New pick
// starts at the most-useful direction: soonest renewal, priciest first, A–Z.
const DEFAULT_DIR: Record<SortKey, SortDir> = {
  renewal: "asc",
  price: "desc",
  name: "asc",
};

/**
 * Direction-aware comparator. Ascending is the natural order (soonest renewal,
 * cheapest, A–Z); `desc` negates the value part. Inactive subs (no renewal
 * date) always sort last regardless of direction — flipping them to the top
 * would read as a bug.
 */
const makeComparator =
  (key: SortKey, dir: SortDir) => (a: Subscription, b: Subscription) => {
    let base: number;
    if (key === "renewal") {
      const da = renewalDays(a);
      const db = renewalDays(b);
      if (da === null && db === null) base = 0;
      else if (da === null) return 1;
      else if (db === null) return -1;
      else base = da - db;
    } else if (key === "price") {
      base = monthlyCost(a) - monthlyCost(b);
    } else {
      base = a.name.localeCompare(b.name);
    }
    return dir === "asc" ? base : -base;
  };

/**
 * Cancelled subs have no upcoming renewal, so under the "Renewal" sort they
 * order by when they were cancelled — most-recently-cancelled first (ascending,
 * mirroring "nearest in time at the top"). Missing dates sort last, tie-broken
 * by name.
 */
const makeCancelledComparator =
  (dir: SortDir) => (a: Subscription, b: Subscription) => {
    const ta = a.cancelledAt ? Date.parse(a.cancelledAt) : NaN;
    const tb = b.cancelledAt ? Date.parse(b.cancelledAt) : NaN;
    const aMissing = Number.isNaN(ta);
    const bMissing = Number.isNaN(tb);
    if (aMissing && bMissing) return a.name.localeCompare(b.name);
    if (aMissing) return 1;
    if (bMissing) return -1;
    const base = tb - ta; // most-recent first
    return dir === "asc" ? base : -base;
  };

const TONE_CLASS: Record<Tone, string> = {
  default: "text-muted-foreground",
  info: "text-info",
  warning: "text-warning",
  success: "text-success",
};

const Subscriptions = () => {
  const { subscriptions, refresh, unlockSubscription } = useSubscriptions();
  const { isPro } = useEntitlement();
  const { baseCurrency } = useCurrency();
  const { palette } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState("");
  // Sort + category filter layer WITHIN the fixed status grouping (board
  // decision 2026-07-22 keeps grouping); default sort matches the old behaviour.
  const [sortKey, setSortKey] = useState<SortKey>("renewal");
  const [sortDir, setSortDir] = useState<SortDir>(DEFAULT_DIR.renewal);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const clearCategories = useCallback(() => setSelectedCategories(new Set()), []);

  // Tap a new sort → its default direction; tap the active one → flip.
  const onSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir(DEFAULT_DIR[key]);
      }
    },
    [sortKey],
  );

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  // Reactivating a downgrade-locked sub adds an active slot, so it goes through
  // the same cap gate: free + under cap → unlock for free; at cap → the paywall.
  const reactivateLocked = useCallback(
    (id: string) => {
      if (canAddActive(subscriptions, isPro)) unlockSubscription(id);
      else router.push("/paywall?source=locked_reactivate");
    },
    [subscriptions, isPro, unlockSubscription, router],
  );

  // Reflect actions taken on the detail screen (delete, cancel, confirm).
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const found = useMemo(
    () => computeFound(subscriptions, getKeptSubIds()),
    [subscriptions],
  );

  const duplicateNames = useMemo(
    () => duplicateActiveNames(subscriptions),
    [subscriptions],
  );

  // Categories the user actually has (non-empty) + how many subs are in each,
  // for the filter chips / sheet. Counts are across all statuses so the sheet
  // reads as a stable index of the library. Only worth showing a filter control
  // when there's more than one to choose between.
  const categoryOptions = useMemo<CategoryOption[]>(() => {
    const counts = new Map<string, number>();
    for (const s of subscriptions) {
      const c = s.category?.trim();
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [subscriptions]);
  const categories = useMemo(
    () => categoryOptions.map((c) => c.name),
    [categoryOptions],
  );

  // Drop any selected category the user no longer has (e.g. after deleting the
  // last sub in it) so a stale filter can't hide the whole list.
  useEffect(() => {
    setSelectedCategories((prev) => {
      if (prev.size === 0) return prev;
      const valid = new Set(categories);
      const pruned = [...prev].filter((c) => valid.has(c));
      return pruned.length === prev.size ? prev : new Set(pruned);
    });
  }, [categories]);

  // When a new subscription is added the count grows — reset the search + any
  // category filter so the user lands back on the full, collapsed list and can
  // actually see what they just added (a lingering filter would hide it and
  // read as "it didn't save"). Deletes (count shrinks) leave filters alone.
  const prevCount = useRef(subscriptions.length);
  useEffect(() => {
    if (subscriptions.length > prevCount.current) {
      setQuery("");
      setSelectedCategories(new Set());
      Keyboard.dismiss();
    }
    prevCount.current = subscriptions.length;
  }, [subscriptions.length]);

  // Board decision 2026-07-22: group by STATUS (fixed, no toggle). Subscriptions
  // = manage state; the sections surface trials/paused/zombies and celebrate
  // cancellations. Search filters across every section.
  const sections = useMemo<Section[]>(() => {
    const q = query.trim().toLowerCase();
    const catActive = selectedCategories.size > 0;
    const matches = (s: Subscription) => {
      const matchesQuery =
        !q ||
        [s.name, s.category, s.plan, s.status]
          .filter(Boolean)
          .some((f) => f!.toLowerCase().includes(q));
      // Trim to match the trimmed keys categoryOptions builds the chips from.
      const matchesCategory =
        !catActive || selectedCategories.has((s.category ?? "").trim());
      return matchesQuery && matchesCategory;
    };

    // Chosen sort applies to the active/trial sections directly. Paused has no
    // renewal date, so under "Renewal" it falls back to name order; Cancelled
    // falls back to cancellation date (most-recent first) — the more useful
    // order for a "what did I just cancel" list. Price/Name sort all sections
    // the same way. Direction (↑/↓) is honoured throughout.
    const activeCmp = makeComparator(sortKey, sortDir);
    const pausedCmp =
      sortKey === "renewal"
        ? makeComparator("name", sortDir)
        : makeComparator(sortKey, sortDir);
    const cancelledCmp =
      sortKey === "renewal"
        ? makeCancelledComparator(sortDir)
        : makeComparator(sortKey, sortDir);

    const filtered = subscriptions.filter(matches);
    const active = filtered.filter(
      (s) => (s.status ?? "active") === "active",
    );
    const paying = active.filter((s) => !s.isTrial).sort(activeCmp);
    const trials = active.filter((s) => s.isTrial).sort(activeCmp);
    // Downgrade-locked subs are stored as paused + lockedAt; surface them in
    // their own "Locked" section (not mixed into user-initiated pauses).
    const pausedAll = filtered.filter((s) => s.status === "paused");
    const locked = pausedAll.filter((s) => s.lockedAt).sort(pausedCmp);
    const paused = pausedAll.filter((s) => !s.lockedAt).sort(pausedCmp);
    const cancelled = filtered
      .filter((s) => s.status === "cancelled")
      .sort(cancelledCmp);

    const payingMonthly = paying.reduce((sum, s) => sum + monthlyCost(s), 0);
    const cancelledMonthly = cancelled.reduce(
      (sum, s) => sum + monthlyCost(s),
      0,
    );

    const out: Section[] = [];
    if (paying.length)
      out.push({
        key: "active",
        title: "Active",
        tone: "default",
        meta: `${paying.length} · ${formatCurrency(payingMonthly, baseCurrency)}/mo`,
        data: paying,
      });
    if (trials.length)
      out.push({
        key: "trial",
        title: "On trial",
        tone: "info",
        meta: String(trials.length),
        data: trials,
      });
    if (paused.length)
      out.push({
        key: "paused",
        title: "Paused",
        tone: "warning",
        meta: String(paused.length),
        data: paused,
      });
    if (locked.length)
      out.push({
        key: "locked",
        title: "Locked",
        tone: "warning",
        meta: `${locked.length} · Pro`,
        data: locked,
      });
    if (cancelled.length)
      out.push({
        key: "cancelled",
        title: "Cancelled",
        tone: "success",
        meta: `${cancelled.length} · saving ${formatCurrency(cancelledMonthly, baseCurrency)}/mo`,
        data: cancelled,
      });
    return out;
  }, [subscriptions, query, baseCurrency, sortKey, sortDir, selectedCategories]);

  // Total rows across all sections — the "Show N results" count in the sheet.
  const visibleCount = useMemo(
    () => sections.reduce((n, s) => n + s.data.length, 0),
    [sections],
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StyledKeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <>
              <View className="list-head">
                <Text className="list-title">Subscriptions</Text>
                <View className="rounded-full border border-border bg-card px-3 py-1">
                  <Text className="text-xs font-sans-bold text-muted-foreground">
                    {subscriptions.length} total
                  </Text>
                </View>
              </View>
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

              {/* Sort — applies within the status groups. */}
              <View className="mb-2 flex-row items-center gap-2">
                <Text className="text-xs font-sans-bold uppercase tracking-[1px] text-muted-foreground">
                  Sort
                </Text>
                {SORT_LABELS.map(({ key, label }) => {
                  const active = sortKey === key;
                  const arrow = sortDir === "asc" ? " ↑" : " ↓";
                  return (
                    <Pressable
                      key={key}
                      onPress={() => onSort(key)}
                      accessibilityRole="button"
                      accessibilityLabel={`Sort by ${label}${
                        active
                          ? `, ${sortDir === "asc" ? "ascending" : "descending"}, tap to reverse`
                          : ""
                      }`}
                      accessibilityState={{ selected: active }}
                      className={clsx(
                        "rounded-full border px-3 py-1.5",
                        active
                          ? "border-accent bg-accent/10"
                          : "border-border bg-background",
                      )}
                    >
                      <Text
                        className={clsx(
                          "text-xs font-sans-bold",
                          active ? "text-accent" : "text-muted-foreground",
                        )}
                      >
                        {label}
                        {active ? arrow : ""}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Category filter — inline chips while the set is small (the
                  common case), then a "Filter" pill → multi-select sheet once
                  it would overflow (boardroom 2026-07-28). Nothing to filter
                  with 0/1 category. */}
              {categories.length > 1 &&
                (categories.length <= INLINE_CATEGORY_LIMIT ? (
                  // Wrap onto multiple rows (not a horizontal scroll) so every
                  // chip is visible — a sideways-scroll affordance isn't obvious
                  // and users miss off-screen categories.
                  <View className="mb-2 flex-row flex-wrap gap-2">
                    <Pressable
                      onPress={clearCategories}
                      accessibilityRole="button"
                      accessibilityLabel="Show all categories"
                      accessibilityState={{
                        selected: selectedCategories.size === 0,
                      }}
                      className={clsx(
                        "category-chip",
                        selectedCategories.size === 0 && "category-chip-active",
                      )}
                    >
                      <Text
                        className={clsx(
                          "category-chip-text",
                          selectedCategories.size === 0 &&
                            "category-chip-text-active",
                        )}
                      >
                        All
                      </Text>
                    </Pressable>
                    {categories.map((cat) => {
                      const active = selectedCategories.has(cat);
                      return (
                        <Pressable
                          key={cat}
                          onPress={() => toggleCategory(cat)}
                          accessibilityRole="button"
                          accessibilityLabel={`Filter by ${cat}`}
                          accessibilityState={{ selected: active }}
                          className={clsx(
                            "category-chip",
                            active && "category-chip-active",
                          )}
                        >
                          <Text
                            className={clsx(
                              "category-chip-text",
                              active && "category-chip-text-active",
                            )}
                          >
                            {cat}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setFilterSheetOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      selectedCategories.size > 0
                        ? `Filter by category, ${selectedCategories.size} selected`
                        : "Filter by category"
                    }
                    className={clsx(
                      "mb-2 flex-row items-center gap-2 self-start rounded-full border px-4 py-2 active:opacity-70",
                      selectedCategories.size > 0
                        ? "border-accent bg-accent/10"
                        : "border-border bg-background",
                    )}
                  >
                    <Text
                      className={clsx(
                        "text-sm font-sans-bold",
                        selectedCategories.size > 0
                          ? "text-accent"
                          : "text-muted-foreground",
                      )}
                    >
                      Filter
                    </Text>
                    {selectedCategories.size > 0 && (
                      <View className="rounded-full bg-accent px-2 py-0.5">
                        <Text className="text-xs font-sans-bold text-on-accent">
                          {selectedCategories.size}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ))}

              {/* Free: one strip with the number; Pro sees inline ✦ flags. */}
              {!isPro && found.count > 0 && (
                <Pressable
                  onPress={() => router.push("/paywall?source=subs_found")}
                  className="mb-2 flex-row items-center gap-2 rounded-2xl border border-accent bg-accent/5 px-4 py-3"
                  style={{ borderStyle: "dashed" }}
                >
                  <Text className="text-accent">✦</Text>
                  <Text className="flex-1 text-xs font-sans-semibold text-accent">
                    {found.count} to review, up to{" "}
                    {formatCurrency(found.annualSavings, baseCurrency)}/yr
                  </Text>
                  <Text className="text-xs font-sans-bold text-accent">
                    Unlock ›
                  </Text>
                </Pressable>
              )}
            </>
          }
          renderSectionHeader={({ section }) => (
            <Text
              className={clsx(
                "mb-3 mt-5 text-xs font-sans-bold uppercase tracking-[2px]",
                TONE_CLASS[(section as Section).tone],
              )}
            >
              {(section as Section).title} · {(section as Section).meta}
            </Text>
          )}
          renderItem={({ item, section }) =>
            (section as Section).key === "locked" ? (
              <Pressable
                onPress={() => router.push(`/subscriptions/${item.id}`)}
                className="flex-row items-center justify-between rounded-2xl border border-border bg-card p-4 opacity-60"
              >
                <View className="min-w-0 flex-1 pr-3">
                  <Text
                    className="text-base font-sans-semibold text-primary"
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text className="text-xs font-sans-medium text-muted-foreground">
                    Locked — reactivate with Pro
                  </Text>
                </View>
                <Pressable
                  onPress={() => reactivateLocked(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Reactivate ${item.name}`}
                  className="rounded-full border border-accent px-4 py-2 active:opacity-70"
                >
                  <Text className="text-sm font-sans-bold text-accent">
                    Reactivate
                  </Text>
                </Pressable>
              </Pressable>
            ) : (
              <SubscriptionCard
                {...item}
                expanded={false}
                isDuplicate={duplicateNames.has(normalizeName(item.name))}
                foundFlag={isPro ? found.flagged[item.id] : undefined}
                onPress={() => router.push(`/subscriptions/${item.id}`)}
              />
            )
          }
          ItemSeparatorComponent={() => <View className="h-4" />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <Text className="home-empty-state">
              {query || selectedCategories.size > 0
                ? "No subscriptions match your search or filters."
                : "No subscriptions yet — tap ＋ to add your first."}
            </Text>
          }
          contentContainerClassName="grow p-5 pb-32"
        />
      </StyledKeyboardAvoidingView>

      <CategoryFilterSheet
        visible={filterSheetOpen}
        categories={categoryOptions}
        selected={selectedCategories}
        resultCount={visibleCount}
        onToggle={toggleCategory}
        onClear={clearCategories}
        onClose={() => setFilterSheetOpen(false)}
      />
    </SafeAreaView>
  );
};

export default Subscriptions;
