import ListHeading from "@/components/ListHeading";
import SubscriptionCard from "@/components/SubscriptionCard";
import { useCurrency } from "@/context/CurrencyContext";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import "@/global.css";
import { getMonthlyEquivalent } from "@/lib/billing";
import { formatCurrency, formatCurrencyShort } from "@/lib/utils";
import clsx from "clsx";
import { useRouter } from "expo-router";
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
  const router = useRouter();

  const stats = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === "active");
    const cancelled = subscriptions.filter((s) => s.status === "cancelled");

    const monthlyTotal = active.reduce((sum, s) => sum + monthlyOf(s), 0);
    const savedMonthly = cancelled.reduce((sum, s) => sum + monthlyOf(s), 0);
    const trialCount = active.filter((s) => s.isTrial).length;

    // Top subscriptions by monthly-equivalent cost → each bar is a real
    // subscription from the list, so the chart reconciles with what the user
    // sees below and with the Home total.
    const chart = active
      .map((sub) => ({ label: sub.name, amount: monthlyOf(sub) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, MAX_BARS);
    const maxAmount = Math.max(...chart.map((c) => c.amount), 1);

    return {
      monthlyTotal,
      yearlyTotal: monthlyTotal * 12,
      savedMonthly,
      activeCount: active.length,
      trialCount,
      cancelledCount: cancelled.length,
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
            {stats.activeCount}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="gap-5 p-5 pb-30"
        showsVerticalScrollIndicator={false}
      >
        {/* Headline stats */}
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
        <View className="flex-row gap-3">
          <StatTile
            label="Active subs"
            value={String(stats.activeCount)}
          />
          <StatTile
            label="Saved / mo"
            value={formatCurrency(stats.savedMonthly, baseCurrency)}
            accent
          />
        </View>
        <View className="flex-row gap-3">
          <StatTile label="On trial" value={String(stats.trialCount)} />
          <StatTile label="Cancelled" value={String(stats.cancelledCount)} />
        </View>

        {/* Spend by category */}
        <View>
          <ListHeading title="Top subscriptions" />
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

        {/* History */}
        <View>
          <ListHeading title="History" />
          <View className="gap-4">
            {subscriptions.length === 0 ? (
              <Text className="home-empty-state">No subscriptions yet.</Text>
            ) : (
              subscriptions.map((subscription) => (
                <SubscriptionCard
                  key={subscription.id}
                  {...subscription}
                  expanded={false}
                  onPress={() =>
                    router.push(`/subscriptions/${subscription.id}`)
                  }
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Insights;
