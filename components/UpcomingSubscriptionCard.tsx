import SubscriptionIcon from "@/components/SubscriptionIcon";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import clsx from "clsx";
import { Text, View } from "react-native";

const UpcomingSubscriptionCard = ({
  name,
  price,
  daysLeft,
}: UpcomingSubscription) => {
  const { baseCurrency } = useCurrency();
  const meta = !Number.isFinite(daysLeft)
    ? "Scheduled"
    : daysLeft <= 0
      ? "Due today"
      : daysLeft === 1
        ? "Tomorrow"
        : `${daysLeft} days left`;
  const isDueSoon = Number.isFinite(daysLeft) && daysLeft <= 3;

  return (
    <View className="upcoming-card">
      <View className="upcoming-row">
        <SubscriptionIcon name={name} size={56} />
        <View className="min-w-0 flex-1">
          <Text className="upcoming-price" numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(price, baseCurrency)}
          </Text>
          <Text
            className={clsx("upcoming-meta", isDueSoon && "text-accent")}
            numberOfLines={1}
          >
            {meta}
          </Text>
        </View>
      </View>
      <Text className="upcoming-name" numberOfLines={1} ellipsizeMode="tail">
        {name}
      </Text>
    </View>
  );
};

export default UpcomingSubscriptionCard;
