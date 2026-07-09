import ListHeading from "@/components/ListHeading";
import SubscriptionCard from "@/components/SubscriptionCard";
import { INSIGHTS_SUMMARY, INSIGHTS_WEEKLY } from "@/constants/data";
import { icons } from "@/constants/icons";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import "@/global.css";
import { formatCurrency } from "@/lib/utils";
import clsx from "clsx";
import { styled } from "nativewind";
import { useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView) as any;

const CHART_HEIGHT = 200;
const AXIS_MAX = 45;
const AXIS_LABELS = [45, 35, 25, 15, 5];
const PRIMARY = "#081126";

const barHeightFor = (amount: number) =>
  Math.max((amount / AXIS_MAX) * CHART_HEIGHT, 6);

const Insights = () => {
  const { subscriptions } = useSubscriptions();
  const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<
    string | null
  >(null);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="insights-header">
        <Text className="modal-title">Monthly Insights</Text>
        <View className="insights-icon-btn">
          <Image
            source={icons.menu}
            resizeMode="contain"
            tintColor={PRIMARY}
            className="insights-icon-glyph"
          />
        </View>
      </View>

      <ScrollView
        contentContainerClassName="gap-5 p-5 pb-30"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <ListHeading title="Upcoming" />
          <View className="insights-chart-card">
            <View className="flex-row">
              <View className="insights-axis" style={{ height: CHART_HEIGHT }}>
                {AXIS_LABELS.map((value) => (
                  <Text key={value} className="insights-axis-label">
                    {value}
                  </Text>
                ))}
              </View>

              <View className="flex-1">
                <View className="relative" style={{ height: CHART_HEIGHT }}>
                  <View className="absolute inset-0 justify-between">
                    {AXIS_LABELS.map((value) => (
                      <View key={value} className="insights-gridline" />
                    ))}
                  </View>

                  <View
                    className="flex-row items-end justify-between"
                    style={{ height: CHART_HEIGHT }}
                  >
                    {INSIGHTS_WEEKLY.map((entry) => (
                      <View key={entry.day} className="insights-bar-track">
                        {entry.highlighted && (
                          <View className="insights-tooltip">
                            <Text className="insights-tooltip-text">
                              {formatCurrency(entry.amount)}
                            </Text>
                          </View>
                        )}
                        <View
                          className={clsx(
                            "insights-bar",
                            entry.highlighted && "insights-bar-active",
                          )}
                          style={{ height: barHeightFor(entry.amount) }}
                        />
                      </View>
                    ))}
                  </View>
                </View>

                <View className="mt-3 flex-row justify-between">
                  {INSIGHTS_WEEKLY.map((entry) => (
                    <Text key={entry.day} className="insights-day-label">
                      {entry.day}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>

        <View className="insights-expense-card">
          <View>
            <Text className="insights-expense-label">Expenses</Text>
            <Text className="insights-expense-period">
              {INSIGHTS_SUMMARY.period}
            </Text>
          </View>
          <View>
            <Text className="insights-expense-amount">
              {`-${formatCurrency(INSIGHTS_SUMMARY.amount)}`}
            </Text>
            <Text className="insights-expense-change">
              {`+${INSIGHTS_SUMMARY.changePercent}%`}
            </Text>
          </View>
        </View>

        <View>
          <ListHeading title="History" />
          <View className="gap-4">
            {subscriptions.map((subscription) => (
              <SubscriptionCard
                key={subscription.id}
                {...subscription}
                expanded={expandedSubscriptionId === subscription.id}
                onPress={() =>
                  setExpandedSubscriptionId((currentId) =>
                    currentId === subscription.id ? null : subscription.id,
                  )
                }
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Insights;
