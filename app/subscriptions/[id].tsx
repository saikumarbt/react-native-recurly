import SubscriptionFormModal from "@/components/SubscriptionFormModal";
import SubscriptionIcon from "@/components/SubscriptionIcon";
import { icons } from "@/constants/icons";
import { useCurrency } from "@/context/CurrencyContext";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import "@/global.css";
import { getCycleLabel, getDaysUntilRenewal } from "@/lib/billing";
import {
  formatCurrency,
  formatStatusLabel,
  formatSubscriptionDateTime,
} from "@/lib/utils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { styled } from "nativewind";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView) as any;
const PRIMARY = "#081126";

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View className="sub-row">
    <View className="sub-row-copy">
      <Text className="sub-label">{label}</Text>
      <Text className="sub-value" numberOfLines={1} ellipsizeMode="tail">
        {value}
      </Text>
    </View>
  </View>
);

const SubscriptionDetail = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const posthog = usePostHog();
  const { baseCurrency } = useCurrency();
  const {
    getSubscription,
    updateSubscription,
    deleteSubscription,
    pauseSubscription,
    resumeSubscription,
    cancelSubscription,
  } = useSubscriptions();
  const [isEditVisible, setEditVisible] = useState(false);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const subscription = id ? getSubscription(id) : undefined;

  const Header = () => (
    <View className="insights-header">
      <Pressable
        className="insights-icon-btn"
        onPress={goBack}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Image
          source={icons.back}
          resizeMode="contain"
          tintColor={PRIMARY}
          className="insights-icon-glyph"
        />
      </Pressable>
      <Text className="modal-title">Subscription</Text>
      {/* Spacer keeps the title centered against the back button. */}
      <View className="size-11" />
    </View>
  );

  if (!subscription) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Header />
        <View className="p-5">
          <Text className="home-empty-state">Subscription not found.</Text>
          <Pressable className="auth-button mt-5" onPress={goBack}>
            <Text className="auth-button-text">Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const fallback = "Not provided";
  const daysLeft = getDaysUntilRenewal(
    subscription.renewalDate ?? subscription.startDate,
    subscription.billingCycle ?? "monthly",
    subscription.customIntervalDays,
  );
  const isActive = subscription.status === "active";
  const isPaused = subscription.status === "paused";
  const isCancelled = subscription.status === "cancelled";

  // Opaque id only — no subscription name in analytics.
  const captureStatus = (event: string) =>
    posthog.capture(event, { subscription_id: subscription.id });

  const handleEdit = (draft: SubscriptionDraft) => {
    updateSubscription(subscription.id, draft);
    captureStatus("subscription_updated");
  };

  const handlePauseResume = () => {
    if (isPaused) {
      resumeSubscription(subscription.id);
      captureStatus("subscription_resumed");
    } else {
      pauseSubscription(subscription.id);
      captureStatus("subscription_paused");
    }
  };

  const handleReactivate = () => {
    resumeSubscription(subscription.id);
    captureStatus("subscription_reactivated");
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel subscription?",
      `${subscription.name} will be marked as cancelled. It stays in your history so you can see what you're saving.`,
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel subscription",
          style: "destructive",
          onPress: () => {
            cancelSubscription(subscription.id);
            captureStatus("subscription_cancelled");
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete subscription?",
      `${subscription.name} will be removed from all lists.`,
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteSubscription(subscription.id);
            captureStatus("subscription_deleted");
            goBack();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Header />
      <ScrollView
        contentContainerClassName="p-5 pb-30"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View
          className="sub-card mb-5"
          style={{ backgroundColor: subscription.color ?? undefined }}
        >
          <View className="sub-head">
            <View className="sub-main">
              <SubscriptionIcon name={subscription.name} size={64} />
              <View className="sub-copy">
                <Text numberOfLines={1} className="sub-title">
                  {subscription.name}
                </Text>
                <Text className="sub-meta">
                  {formatStatusLabel(subscription.status)}
                  {subscription.isTrial ? " · Trial" : ""}
                </Text>
              </View>
            </View>
            <View className="sub-price-box">
              <Text className="sub-price">
                {formatCurrency(subscription.price, baseCurrency)}
              </Text>
              <Text className="sub-billing">{subscription.billing}</Text>
            </View>
          </View>
          {isActive && daysLeft !== null && (
            <Text className="sub-meta mt-2">
              {daysLeft === 0
                ? "Renews today"
                : daysLeft === 1
                  ? "Renews tomorrow"
                  : `Renews in ${daysLeft} days`}
            </Text>
          )}
        </View>

        {/* Details */}
        <View className="sub-card bg-card mb-5">
          <View className="sub-details">
            <DetailRow
              label="Billing:"
              value={getCycleLabel(
                subscription.billingCycle ?? "monthly",
                subscription.customIntervalDays,
              )}
            />
            <DetailRow
              label="Payment:"
              value={subscription.paymentMethod?.trim() || fallback}
            />
            <DetailRow
              label="Category:"
              value={subscription.category?.trim() || fallback}
            />
            <DetailRow
              label="Started:"
              value={formatSubscriptionDateTime(subscription.startDate)}
            />
            <DetailRow
              label="Next renewal:"
              value={formatSubscriptionDateTime(subscription.renewalDate)}
            />
            {subscription.isTrial && (
              <DetailRow
                label="Trial ends:"
                value={formatSubscriptionDateTime(subscription.trialEndDate)}
              />
            )}
            {isCancelled && (
              <DetailRow
                label="Cancelled:"
                value={formatSubscriptionDateTime(subscription.cancelledAt)}
              />
            )}
          </View>
        </View>

        {/* Actions */}
        <View className="gap-3">
          <Pressable
            className="auth-button"
            onPress={() => setEditVisible(true)}
          >
            <Text className="auth-button-text">Edit</Text>
          </Pressable>

          {isCancelled ? (
            <Pressable
              className="auth-secondary-button"
              onPress={handleReactivate}
            >
              <Text className="auth-secondary-button-text">
                Reactivate subscription
              </Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                className="auth-secondary-button"
                onPress={handlePauseResume}
              >
                <Text className="auth-secondary-button-text">
                  {isPaused ? "Resume" : "Pause"}
                </Text>
              </Pressable>

              <Pressable className="sub-cancel" onPress={handleCancel}>
                <Text className="sub-cancel-text">Cancel subscription</Text>
              </Pressable>
            </>
          )}

          <Pressable className="items-center py-3" onPress={handleDelete}>
            <Text className="text-sm font-sans-semibold text-destructive">
              Delete from app
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <SubscriptionFormModal
        visible={isEditVisible}
        onClose={() => setEditVisible(false)}
        onSubmit={handleEdit}
        subscription={subscription}
      />
    </SafeAreaView>
  );
};

export default SubscriptionDetail;
