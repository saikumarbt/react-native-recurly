import SubscriptionIcon from "@/components/SubscriptionIcon";
import { useCurrency } from "@/context/CurrencyContext";
import { getDaysUntilRenewal } from "@/lib/billing";
import {
  formatCurrency,
  formatStatusLabel,
  formatSubscriptionDateTime,
} from "@/lib/utils";
import clsx from "clsx";
import { Pressable, Text, View } from "react-native";

/** Human renewal countdown for active subs. */
const renewalCountdown = (days: number | null): string => {
  if (days === null) return "";
  if (days <= 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
};

const SubscriptionCard = ({
  name,
  price,
  billing,
  color,
  category,
  plan,
  renewalDate,
  onPress,
  expanded,
  paymentMethod,
  startDate,
  status,
  billingCycle,
  customIntervalDays,
}: SubscriptionCardProps) => {
  const { baseCurrency } = useCurrency();
  const fallback = "Not provided";

  const isActive = status === "active" || status === undefined;
  const daysLeft = isActive
    ? getDaysUntilRenewal(
        renewalDate ?? startDate,
        billingCycle ?? "monthly",
        customIntervalDays,
      )
    : null;
  const isDueSoon = daysLeft !== null && daysLeft <= 3;

  // Meta line: status for paused/cancelled, renewal countdown for active.
  const metaText =
    status === "paused"
      ? "Paused"
      : status === "cancelled"
        ? "Cancelled"
        : renewalCountdown(daysLeft);

  return (
    <Pressable
      onPress={onPress}
      className={clsx(
        "sub-card",
        expanded ? "sub-card-expanded" : "bg-card",
        !isActive && "opacity-60",
      )}
      style={!expanded && color ? { backgroundColor: color } : undefined}
    >
      <View className="sub-head">
        <View className="sub-main">
          <SubscriptionIcon name={name} size={64} />
          <View className="sub-copy">
            <Text numberOfLines={1} className="sub-title">
              {name}
            </Text>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              className={clsx(
                "sub-meta",
                isDueSoon && "font-sans-bold text-accent",
              )}
            >
              {metaText}
            </Text>
          </View>
        </View>
        <View className="sub-price-box">
          <Text className="sub-price">{formatCurrency(price, baseCurrency)}</Text>
          <Text className="sub-billing">{billing}</Text>
        </View>
      </View>
      {expanded && (
        <View className="sub-body">
          <View className="sub-details">
            <View className="sub-row">
              <View className="sub-row-copy">
                <Text className="sub-label">Payment:</Text>
                <Text
                  className="sub-value"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {paymentMethod?.trim() || fallback}
                </Text>
              </View>
            </View>
            <View className="sub-row">
              <View className="sub-row-copy">
                <Text className="sub-label">Category:</Text>
                <Text
                  className="sub-value"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {category?.trim() || plan?.trim() || fallback}
                </Text>
              </View>
            </View>
            <View className="sub-row">
              <View className="sub-row-copy">
                <Text className="sub-label">Started:</Text>
                <Text
                  className="sub-value"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {startDate ? formatSubscriptionDateTime(startDate) : fallback}
                </Text>
              </View>
            </View>
            <View className="sub-row">
              <View className="sub-row-copy">
                <Text className="sub-label">Renewal Date:</Text>
                <Text
                  className="sub-value"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {renewalDate
                    ? formatSubscriptionDateTime(renewalDate)
                    : fallback}
                </Text>
              </View>
            </View>
            <View className="sub-row">
              <View className="sub-row-copy">
                <Text className="sub-label">Status:</Text>
                <Text
                  className="sub-value"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {status ? formatStatusLabel(status) : fallback}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
};

export default SubscriptionCard;
