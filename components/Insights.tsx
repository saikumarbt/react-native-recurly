import ListHeading from "@/components/ListHeading";
import { useCurrency } from "@/context/CurrencyContext";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import "@/global.css";
import { getMonthlyEquivalent } from "@/lib/billing";
import { formatCurrency, formatCurrencyShort } from "@/lib/utils";
import clsx from "clsx";
import { styled } from "nativewind";
import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView) as any;

const CHART_HEIGHT = 200;
const MAX_BARS = 6;

const monthlyOf = (sub: Subscription) =>
  getMonthlyEquivalent(
    sub.price,
    sub.billingCycle ?? "monthly",
    sub.customIntervalDays,
  );

const StatTile = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) => (
  <View className="insights-stat-tile">
    <Text className="insights-stat-value" numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text
      className={clsx("insights-stat-label", accent && "text-success")}
      numberOfLines={1}
    >
      {label}
    </Text>
  </View>
);

const Insights = () => {
  const { subscriptions } = useSubscriptions();
  const { baseCurrency } = useCurrency();

  const stats = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === "active");
    const paused = subscriptions.filter((s) => s.status === "paused");
    const cancelled = subscriptions.filter((s) => s.status === "cancelled");

    // Spend matches Home: active subs that are actually being charged. Free
    // trials cost nothing until they convert, so they're excluded (surfaced as
    // the trial count below). Savings = recurring value of what was cancelled.
    const paying = active.filter((s) => !s.isTrial);
    const monthlyTotal = paying.reduce((sum, s) => sum + monthlyOf(s), 0);
    const savedMonthly = cancelled.reduce((sum, s) => sum + monthlyOf(s), 0);

    // Mutually-exclusive portfolio buckets that reconcile with the History
    // list: paying + onTrial + paused + cancelled === subscriptions.length.
    const trialCount = active.length - paying.length;
    const payingCount = paying.length;

    // Top subscriptions by monthly-equivalent cost — each bar is a paying
    // subscription, so the chart reconciles with the list and the Home total.
    const chart = paying
      .map((sub) => ({ label: sub.name, amount: monthlyOf(sub) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, MAX_BARS);
    const maxAmount = Math.max(...chart.map((c) => c.amount), 1);

    return {
      monthlyTotal,
      yearlyTotal: monthlyTotal * 12,
      savedMonthly,
      savedYearly: savedMonthly * 12,
      payingCount,
      trialCount,
      pausedCount: paused.length,
      cancelledCount: cancelled.length,
      totalCount: subscriptions.length,
      chart,
      maxAmount,
    };
  }, [subscriptions]);

  const axisLabels = [1, 0.75, 0.5, 0.25].map((f) =>
    formatCurrencyShort(stats.maxAmount * f, baseCurrency),
  );

  const barHeightFor = (amount: number) =>
    Math.max((amount / stats.maxAmount) * CHART_HEIGHT, 6);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="insights-header">
        <Text className="modal-title">Insights</Text>
        <View className="insights-icon-btn">
          <Text className="text-base font-sans-bold text-primary">
            {stats.totalCount}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="gap-5 p-5 pb-30"
        showsVerticalScrollIndicator={false}
      >
        {/* Spend */}
        <View className="flex-row gap-3">
          <StatTile
            label="Per month"
            value={formatCurrency(stats.monthlyTotal, baseCurrency)}
          />
          <StatTile
            label="Per year"
            value={formatCurrency(stats.yearlyTotal, baseCurrency)}
          />
        </View>
        {stats.trialCount > 0 && (
          <Text className="-mt-3 text-xs font-sans-medium text-muted-foreground">
            Excludes {stats.trialCount} on a free trial — not billed until they
            convert.
          </Text>
        )}

        {/* Savings — the "celebrate not spending" hero */}
        <View className="rounded-3xl border border-border bg-card p-5">
          <Text className="text-xs font-sans-bold uppercase tracking-[2px] text-muted-foreground">
            Cut from cancellations
          </Text>
          {stats.cancelledCount > 0 ? (
            <>
              <Text className="mt-1 text-3xl font-sans-extrabold text-success">
                {formatCurrency(stats.savedMonthly, baseCurrency)}
                <Text className="text-base font-sans-bold"> / mo</Text>
              </Text>
              <Text className="text-sm font-sans-medium text-muted-foreground">
                ≈ {formatCurrency(stats.savedYearly, baseCurrency)} a year back
                in your pocket
              </Text>
            </>
          ) : (
            <Text className="mt-1 text-sm font-sans-medium text-muted-foreground">
              Cancel a subscription and we&apos;ll track what it saves you.
            </Text>
          )}
        </View>

        {/* Portfolio — reconciles with the History list below */}
        <View className="gap-3">
          <View className="flex-row gap-3">
            <StatTile label="Paying" value={String(stats.payingCount)} />
            <StatTile label="On trial" value={String(stats.trialCount)} />
          </View>
          <View className="flex-row gap-3">
            <StatTile label="Paused" value={String(stats.pausedCount)} />
            <StatTile
              label="Cancelled"
              value={String(stats.cancelledCount)}
              accent
            />
          </View>
        </View>

        {/* Where the money goes */}
        <View>
          <ListHeading title="Where your money goes" />
          {stats.chart.length === 0 ? (
            <View className="insights-chart-card">
              <Text className="home-empty-state">
                Add an active subscription to see your spending breakdown.
              </Text>
            </View>
          ) : (
            <View className="insights-chart-card">
              <View className="flex-row">
                <View
                  className="insights-axis"
                  style={{ height: CHART_HEIGHT }}
                >
                  {axisLabels.map((label, i) => (
                    <Text key={i} className="insights-axis-label">
                      {label}
                    </Text>
                  ))}
                </View>

                <View className="flex-1">
                  <View className="relative" style={{ height: CHART_HEIGHT }}>
                    <View className="absolute inset-0 justify-between">
                      {axisLabels.map((_, i) => (
                        <View key={i} className="insights-gridline" />
                      ))}
                    </View>

                    <View
                      className="flex-row items-end justify-between"
                      style={{ height: CHART_HEIGHT }}
                    >
                      {stats.chart.map((entry, index) => {
                        const highlighted = index === 0;
                        return (
                          <View
                            key={entry.label}
                            className="insights-bar-track"
                          >
                            {highlighted && (
                              <View className="insights-tooltip">
                                <Text className="insights-tooltip-text">
                                  {formatCurrencyShort(
                                    entry.amount,
                                    baseCurrency,
                                  )}
                                </Text>
                              </View>
                            )}
                            <View
                              className={clsx(
                                "insights-bar",
                                highlighted && "insights-bar-active",
                              )}
                              style={{ height: barHeightFor(entry.amount) }}
                            />
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  <View className="mt-3 flex-row justify-between">
                    {stats.chart.map((entry) => (
                      <Text
                        key={entry.label}
                        className="insights-day-label"
                        numberOfLines={1}
                      >
                        {entry.label}
                      </Text>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default Insights;
