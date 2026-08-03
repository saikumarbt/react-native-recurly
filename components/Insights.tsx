import { useCurrency } from "@/context/CurrencyContext";
import { useEntitlement } from "@/context/EntitlementsContext";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import { useTheme } from "@/context/ThemeContext";
import "@/global.css";
import { getMonthlyEquivalent } from "@/lib/billing";
import { computeFound } from "@/lib/found";
import { getKeptSubIds } from "@/lib/foundKept";
import { formatCurrency } from "@/lib/utils";
import clsx from "clsx";
import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { styled } from "nativewind";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView) as any;

// myrev Found: the deterministic engine (lib/found.ts) computes the number +
// findings on-device. Free sees the number + count; Pro sees the findings list
// and cancel guidance. Gated on useEntitlement().isPro. (AI-reasoned picks = v2.)

const MAX_CATEGORIES = 4;
const UNCATEGORIZED = "Uncategorized";

const monthlyOf = (sub: Subscription) =>
  getMonthlyEquivalent(
    sub.price,
    sub.billingCycle ?? "monthly",
    sub.customIntervalDays,
  );

const categoryOf = (sub: Subscription): string =>
  sub.category?.trim() || sub.plan?.trim() || UNCATEGORIZED;

const StatTile = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "info" | "warning";
}) => (
  <View className="insights-stat-tile">
    <Text
      className={clsx(
        "insights-stat-value",
        tone === "success" && "text-success",
        tone === "info" && "text-info",
        tone === "warning" && "text-warning",
      )}
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {value}
    </Text>
    <Text className="insights-stat-label" numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const Insights = () => {
  const { subscriptions } = useSubscriptions();
  const { baseCurrency } = useCurrency();
  const { palette } = useTheme();
  const router = useRouter();
  const { isPro } = useEntitlement();
  const found = useMemo(
    () => computeFound(subscriptions, getKeptSubIds()),
    [subscriptions],
  );

  // A fixed, theme-aware ramp so each category reads distinctly; the biggest
  // category always gets the brand accent.
  const CATEGORY_COLORS = [
    palette.accent,
    "#9b8bef",
    palette.warning,
    palette.info,
    palette.success,
  ];

  const stats = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === "active");
    const paused = subscriptions.filter((s) => s.status === "paused");
    const cancelled = subscriptions.filter((s) => s.status === "cancelled");

    // Spend = active subs actually being charged. Free trials cost nothing until
    // they convert, so they're excluded here (surfaced as the trial count + the
    // next-month projection below). Savings = recurring value of cancellations.
    const paying = active.filter((s) => !s.isTrial);
    const trials = active.filter((s) => s.isTrial);
    const monthlyTotal = paying.reduce((sum, s) => sum + monthlyOf(s), 0);
    const savedMonthly = cancelled.reduce((sum, s) => sum + monthlyOf(s), 0);

    // Next-month projection: trials whose free period ends within the next month
    // will start billing, so they lift next month's recurring spend. Deterministic
    // — no ledger needed. Delta is 0 (line hidden) when nothing converts soon.
    const horizon = dayjs().add(1, "month");
    const convertingSoon = trials.filter(
      (t) => t.trialEndDate && dayjs(t.trialEndDate).isBefore(horizon),
    );
    const projectionDelta = convertingSoon.reduce(
      (sum, s) => sum + monthlyOf(s),
      0,
    );

    // Category breakdown (top N + "Other"), each vs. the biggest for bar width.
    const byCategory = new Map<string, number>();
    for (const sub of paying) {
      const key = categoryOf(sub);
      byCategory.set(key, (byCategory.get(key) ?? 0) + monthlyOf(sub));
    }
    let categories = Array.from(byCategory, ([label, amount]) => ({
      label,
      amount,
    })).sort((a, b) => b.amount - a.amount);
    if (categories.length > MAX_CATEGORIES) {
      const head = categories.slice(0, MAX_CATEGORIES);
      const otherTotal = categories
        .slice(MAX_CATEGORIES)
        .reduce((sum, c) => sum + c.amount, 0);
      categories = [...head, { label: "Other", amount: otherTotal }];
    }
    const maxCategory = Math.max(...categories.map((c) => c.amount), 1);

    return {
      monthlyTotal,
      yearlyTotal: monthlyTotal * 12,
      savedMonthly,
      savedYearly: savedMonthly * 12,
      projectionDelta,
      nextMonthTotal: monthlyTotal + projectionDelta,
      categories,
      maxCategory,
      payingCount: paying.length,
      trialCount: trials.length,
      pausedCount: paused.length,
      cancelledCount: cancelled.length,
      totalCount: subscriptions.length,
    };
  }, [subscriptions]);

  const topCategory = stats.categories[0];
  const topShare = stats.monthlyTotal
    ? Math.round((topCategory?.amount ?? 0) / stats.monthlyTotal * 100)
    : 0;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="grow gap-5 p-5 pb-32"
        showsVerticalScrollIndicator={false}
      >
        <View className="list-head">
          <Text className="list-title">Insights</Text>
          <View className="rounded-full border border-border bg-card px-3 py-1">
            <Text className="text-xs font-sans-bold text-muted-foreground">
              {stats.totalCount} total
            </Text>
          </View>
        </View>

        {/* 1 · SPEND — hero + per-year + compact next-month projection */}
        <View className="rounded-3xl border border-border bg-card p-5">
          <Text className="text-xs font-sans-bold uppercase tracking-[2px] text-muted-foreground">
            You&apos;re spending
          </Text>
          <Text className="mt-1 text-5xl font-display-black text-primary">
            {formatCurrency(stats.monthlyTotal, baseCurrency)}
          </Text>
          <Text className="mt-1 text-sm font-sans-medium text-muted-foreground">
            a month · ≈ {formatCurrency(stats.yearlyTotal, baseCurrency)} a year
          </Text>
          {stats.projectionDelta > 0 && (
            <Text className="mt-1 text-xs font-sans-medium text-faint">
              Next month ~
              <Text className="font-sans-bold text-primary">
                {formatCurrency(stats.nextMonthTotal, baseCurrency)}
              </Text>{" "}
              <Text className="font-sans-bold text-warning">
                ▲ {formatCurrency(stats.projectionDelta, baseCurrency)}
              </Text>{" "}
              as trials convert
            </Text>
          )}
          {stats.trialCount > 0 && (
            <Text className="mt-2 text-xs font-sans-medium text-muted-foreground">
              Excludes {stats.trialCount} on a free trial — not billed until they
              convert.
            </Text>
          )}
        </View>

        {/* 2 · WHERE YOUR MONEY GOES — category bars (Home shows a slim teaser) */}
        <View className="rounded-3xl border border-border bg-card p-5">
          <Text className="text-xs font-sans-bold uppercase tracking-[2px] text-muted-foreground">
            Where your money goes
          </Text>
          {stats.categories.length === 0 ? (
            <Text className="mt-3 text-sm font-sans-medium text-muted-foreground">
              Add an active subscription to see your spending breakdown.
            </Text>
          ) : (
            <>
              {topCategory && (
                <Text className="mb-3 mt-2 text-xs font-sans-medium text-muted-foreground">
                  <Text className="font-sans-bold text-primary">
                    {topCategory.label}
                  </Text>{" "}
                  is your biggest —{" "}
                  <Text className="font-sans-bold text-primary">{topShare}%</Text>{" "}
                  of spend.
                </Text>
              )}
              <View className="gap-3">
                {stats.categories.map((cat, i) => {
                  const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                  const share = stats.monthlyTotal
                    ? Math.round((cat.amount / stats.monthlyTotal) * 100)
                    : 0;
                  const pct = Math.max(
                    (cat.amount / stats.maxCategory) * 100,
                    4,
                  );
                  return (
                    <View key={cat.label}>
                      <View className="mb-1.5 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <View
                            className="size-2 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <Text className="text-sm font-sans-medium text-primary">
                            {cat.label}
                          </Text>
                        </View>
                        <Text className="text-sm font-sans-medium text-muted-foreground">
                          <Text className="font-display-semibold text-primary">
                            {formatCurrency(cat.amount, baseCurrency)}
                          </Text>{" "}
                          · {share}%
                        </Text>
                      </View>
                      <View className="h-2 overflow-hidden rounded-full bg-muted">
                        <View
                          className="h-2 rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>

        {/* 3 · CUT FROM CANCELLATIONS — the "celebrate not spending" hero */}
        <View className="rounded-3xl border border-success/20 bg-success/10 p-5">
          <Text className="text-xs font-sans-bold uppercase tracking-[2px] text-success">
            Cut from cancellations
          </Text>
          {stats.cancelledCount > 0 ? (
            <View className="mt-1 flex-row items-end justify-between">
              <Text className="text-3xl font-sans-extrabold text-success">
                {formatCurrency(stats.savedMonthly, baseCurrency)}
                <Text className="text-base font-sans-bold"> / mo</Text>
              </Text>
              <View className="items-end">
                <Text className="text-xs font-sans-medium text-muted-foreground">
                  a year
                </Text>
                <Text className="text-lg font-sans-extrabold text-success">
                  {formatCurrency(stats.savedYearly, baseCurrency)}
                </Text>
              </View>
            </View>
          ) : (
            <Text className="mt-1 text-sm font-sans-medium text-muted-foreground">
              Cancel a subscription and we&apos;ll track what it saves you.
            </Text>
          )}
        </View>

        {/* 4 · myrev FOUND — compact summary. Number free; the decisions live on
            the Pro review screen (scales to any number of services). */}
        {found.count > 0 && (
          <Pressable
            onPress={() =>
              isPro ? router.push("/found") : router.push("/(auth)/sign-in")
            }
            className="rounded-3xl border border-accent bg-card p-5"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-sans-bold uppercase tracking-[2px] text-accent">
                ✦ myrev Found
              </Text>
              {!isPro && (
                <View className="rounded-full border border-accent px-2.5 py-1">
                  <Text className="text-[11px] font-sans-bold text-accent">Pro</Text>
                </View>
              )}
            </View>
            <Text className="mt-2 text-xs font-sans-bold uppercase tracking-wide text-muted-foreground">
              up to
            </Text>
            <Text className="text-3xl font-sans-extrabold text-accent">
              {formatCurrency(found.annualSavings, baseCurrency)}
              <Text className="text-base font-sans-bold">/yr to cut</Text>
            </Text>
            <Text className="mt-1 text-sm font-sans-medium text-muted-foreground">
              across {found.count} {found.count === 1 ? "way" : "ways"} to save.
            </Text>
            <View className="mt-4 items-center rounded-2xl bg-accent py-3">
              <Text className="text-sm font-sans-bold text-on-accent">
                {isPro ? "Review & save →" : "Start 3-day free trial"}
              </Text>
            </View>
          </Pressable>
        )}

        {/* 5 · PORTFOLIO — reconciles with the Subscriptions list */}
        <View className="gap-3">
          <Text className="ml-1 text-xs font-sans-bold uppercase tracking-[2px] text-muted-foreground">
            Your portfolio
          </Text>
          <View className="flex-row gap-3">
            <StatTile label="Paying" value={String(stats.payingCount)} />
            <StatTile
              label="On trial"
              value={String(stats.trialCount)}
              tone="info"
            />
          </View>
          <View className="flex-row gap-3">
            <StatTile
              label="Paused"
              value={String(stats.pausedCount)}
              tone="warning"
            />
            <StatTile
              label="Cancelled"
              value={String(stats.cancelledCount)}
              tone="success"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Insights;
