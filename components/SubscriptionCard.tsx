import PulsingDot from "@/components/PulsingDot";
import SubscriptionIcon from "@/components/SubscriptionIcon";
import { useCurrency } from "@/context/CurrencyContext";
import { getDaysUntilRenewal, pendingRenewal } from "@/lib/billing";
import { cardTint } from "@/lib/brand";
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
  dateAssumed,
  confirmedThrough,
  isDuplicate,
}: SubscriptionCardProps) => {
  const { baseCurrency } = useCurrency();
  const fallback = "Not provided";

  const isActive = status === "active" || status === undefined;
  // A charge came due since the user last confirmed → "did it renew?" signal
  // (date-confirm takes priority, so only when not still assumed).
  const pendingCheckin =
    isActive && !dateAssumed
      ? pendingRenewal(
          startDate,
          billingCycle ?? "monthly",
          confirmedThrough,
          customIntervalDays,
        )
      : null;
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

  // Each card gets a soft, unique wash of its brand colour so the list is
  // scannable and memorable (colour-coding). A coloured left edge makes cards
  // that need attention pop out pre-attentively (duplicate > confirm-date >
  // renewed?).
  const tint = cardTint(name);
  const warningColor = isDuplicate
    ? "#dc2626"
    : dateAssumed && isActive
      ? "#E0952F"
      : pendingCheckin
        ? "#EA7A53"
        : null;

  return (
    <Pressable
      onPress={onPress}
      className={clsx(
        "sub-card",
        expanded ? "sub-card-expanded" : "bg-card",
        !isActive && "opacity-60",
      )}
      style={({ pressed }) => [
        !expanded ? { backgroundColor: tint } : null,
        !expanded && warningColor
          ? { borderLeftWidth: 5, borderLeftColor: warningColor }
          : null,
        pressed && !expanded ? { opacity: 0.9 } : null,
      ]}
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
            {isDuplicate && !expanded ? (
              <View className="mt-1 flex-row items-center gap-1.5">
                <PulsingDot size={7} color="#dc2626" />
                <Text
                  style={{ color: "#dc2626" }}
                  className="text-xs font-sans-semibold"
                >
                  Possible duplicate
                </Text>
              </View>
            ) : dateAssumed && isActive && !expanded ? (
              <View className="mt-1 flex-row items-center gap-1.5">
                <PulsingDot size={7} />
                <Text
                  style={{ color: "#E0952F" }}
                  className="text-xs font-sans-semibold"
                >
                  Confirm date
                </Text>
              </View>
            ) : pendingCheckin && !expanded ? (
              <View className="mt-1 flex-row items-center gap-1.5">
                <PulsingDot size={7} color="#ea7a53" />
                <Text
                  style={{ color: "#ea7a53" }}
                  className="text-xs font-sans-semibold"
                >
                  Renewed?
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <View className="sub-price-box">
          <Text className="sub-price">{formatCurrency(price, baseCurrency)}</Text>
          <Text className="sub-billing">{billing}</Text>
        </View>
        {!expanded && (
          <Text className="ml-1 text-2xl font-sans-medium text-muted-foreground">
            ›
          </Text>
        )}
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
