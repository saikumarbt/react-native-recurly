import { FadeInUp, PressableScale } from "@/components/motion";
import PulsingDot from "@/components/PulsingDot";
import SubscriptionFormModal from "@/components/SubscriptionFormModal";
import SubscriptionIcon from "@/components/SubscriptionIcon";
import { icons } from "@/constants/icons";
import { success } from "@/lib/haptics";
import { useCurrency } from "@/context/CurrencyContext";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import "@/global.css";
import {
  addInterval,
  getCycleLabel,
  getNextRenewal,
  pendingRenewal,
} from "@/lib/billing";
import { cardTint } from "@/lib/brand";
import { duplicateActiveNames, normalizeName } from "@/lib/duplicates";
import {
  formatCurrency,
  formatStatusLabel,
  formatSubscriptionDateTime,
} from "@/lib/utils";
import dayjs from "dayjs";
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
    subscriptions,
    getSubscription,
    updateSubscription,
    deleteSubscription,
    pauseSubscription,
    resumeSubscription,
    cancelSubscription,
  } = useSubscriptions();
  const [isEditVisible, setEditVisible] = useState(false);
  const [highlightDate, setHighlightDate] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [checkinSnoozed, setCheckinSnoozed] = useState(false);

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
  // Compute the live next renewal from the anchor so the displayed date and
  // the countdown always agree and never show a stale/past stored value.
  const nextRenewal = getNextRenewal(
    subscription.renewalDate ?? subscription.startDate,
    subscription.billingCycle ?? "monthly",
    subscription.customIntervalDays,
  );
  const daysLeft = nextRenewal
    ? nextRenewal.startOf("day").diff(dayjs().startOf("day"), "day")
    : null;
  const isActive = subscription.status === "active";
  const isPaused = subscription.status === "paused";
  const isCancelled = subscription.status === "cancelled";

  // A charge that has come due since the user last confirmed a renewal — drives
  // the "did it renew?" check-in. Date-confirm (dateAssumed) takes priority.
  const pending =
    isActive && !subscription.dateAssumed
      ? pendingRenewal(
          subscription.startDate,
          subscription.billingCycle ?? "monthly",
          subscription.confirmedThrough,
          subscription.customIntervalDays,
        )
      : null;

  // Another active, non-acknowledged sub shares this name → possible duplicate.
  const isDuplicate =
    !subscription.duplicateAcknowledged &&
    duplicateActiveNames(subscriptions).has(normalizeName(subscription.name));

  // Opaque id only — no subscription name in analytics.
  const captureStatus = (event: string) =>
    posthog.capture(event, { subscription_id: subscription.id });

  const handleEdit = (draft: SubscriptionDraft) => {
    const wasAssumed = !!subscription.dateAssumed;
    updateSubscription(subscription.id, draft);
    captureStatus("subscription_updated");
    // Confirming a quick-add date is a small win; celebrate, and if it was the
    // last one still assumed, mark the whole set as accurate.
    if (wasAssumed && draft.dateAssumed === false) {
      success();
      const remaining = subscriptions.filter(
        (s) =>
          s.status === "active" && s.dateAssumed && s.id !== subscription.id,
      ).length;
      if (remaining === 0) {
        setJustCompleted(true);
        setTimeout(() => setJustCompleted(false), 2600);
      }
    }
  };

  const handleRenewed = () => {
    if (!pending) return;
    // Advance BOTH: mark this occurrence confirmed, and move the next-renewal
    // date to the following cycle so the detail shows the real next date.
    const next = addInterval(
      pending,
      subscription.billingCycle ?? "monthly",
      subscription.customIntervalDays,
    );
    updateSubscription(subscription.id, {
      confirmedThrough: pending.toISOString(),
      renewalDate: next.toISOString(),
    });
    captureStatus("renewal_confirmed");
    success();
  };

  const handleRenewalCancelled = () => {
    cancelSubscription(subscription.id);
    captureStatus("subscription_cancelled");
  };

  const handleKeepDuplicate = () => {
    // It's intentional (a partner's / child's) — stop flagging it as a dup.
    updateSubscription(subscription.id, { duplicateAcknowledged: true });
    captureStatus("duplicate_kept");
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
        { text: "Cancel", style: "cancel" },
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
        {justCompleted && (
          <FadeInUp>
            <View className="mb-5 flex-row items-center gap-3 rounded-2xl border border-success bg-success/10 p-4">
              <Text className="text-lg text-success">✓</Text>
              <Text className="flex-1 text-sm font-sans-bold text-primary">
                All set — your reminders are now accurate.
              </Text>
            </View>
          </FadeInUp>
        )}

        {isDuplicate && (
          <FadeInUp>
            <View className="mb-5 rounded-2xl border border-destructive bg-destructive/10 p-4">
              <Text className="text-sm font-sans-bold text-primary">
                Possible duplicate
              </Text>
              <Text className="mt-0.5 text-xs font-sans-medium text-muted-foreground">
                You already track another active “{subscription.name}”. If this
                one&apos;s meant to be separate — a different plan or account —
                keep it and rename it (e.g. “{subscription.name} – work”) so you
                can tell them apart. If it was a mistake, delete it.
              </Text>
              <View className="mt-3 flex-row gap-2">
                <PressableScale onPress={handleKeepDuplicate}>
                  <View className="rounded-xl border border-border bg-card px-4 py-2">
                    <Text className="text-sm font-sans-semibold text-primary">
                      Keep it
                    </Text>
                  </View>
                </PressableScale>
                <PressableScale onPress={handleDelete}>
                  <View
                    className="rounded-xl px-4 py-2"
                    style={{ backgroundColor: "#dc2626" }}
                  >
                    <Text
                      className="text-sm font-sans-bold"
                      style={{ color: "#ffffff" }}
                    >
                      Delete this one
                    </Text>
                  </View>
                </PressableScale>
              </View>
            </View>
          </FadeInUp>
        )}

        {/* Hero */}
        <View
          className="sub-card mb-5"
          style={{ backgroundColor: cardTint(subscription.name) }}
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

        {subscription.dateAssumed && isActive && (
          <FadeInUp>
            <PressableScale
              onPress={() => {
                setHighlightDate(true);
                setEditVisible(true);
              }}
            >
              <View
                className="mb-5 flex-row items-center gap-3 rounded-2xl border p-4"
                style={{
                  borderColor: "#E0952F",
                  backgroundColor: "rgba(224,149,47,0.08)",
                }}
              >
                <PulsingDot size={10} />
                <View className="flex-1">
                  <Text className="text-sm font-sans-bold text-primary">
                    Confirm your renewal date
                  </Text>
                  <Text className="mt-0.5 text-xs font-sans-medium text-muted-foreground">
                    So reminders land on the right day. Add a payment method too
                    (optional).
                  </Text>
                </View>
                <Text
                  className="text-base font-sans-bold"
                  style={{ color: "#E0952F" }}
                >
                  Fix ›
                </Text>
              </View>
            </PressableScale>
          </FadeInUp>
        )}

        {pending && !checkinSnoozed && (
          <FadeInUp>
            <View className="mb-5 rounded-2xl border border-accent bg-accent/10 p-4">
              <Text className="text-sm font-sans-bold text-primary">
                Did {subscription.name} renew?
              </Text>
              <Text className="mt-0.5 text-xs font-sans-medium text-muted-foreground">
                A {getCycleLabel(
                  subscription.billingCycle ?? "monthly",
                  subscription.customIntervalDays,
                ).toLowerCase()}{" "}
                charge was due {pending.format("MMM D")}. Confirm so your
                tracking stays accurate.
              </Text>
              <View className="mt-3 flex-row items-center gap-2">
                <PressableScale onPress={handleRenewed}>
                  <View className="rounded-xl bg-accent px-4 py-2">
                    <Text className="text-sm font-sans-bold text-primary">
                      Yes, renewed
                    </Text>
                  </View>
                </PressableScale>
                <PressableScale onPress={handleRenewalCancelled}>
                  <View className="rounded-xl border border-border bg-card px-4 py-2">
                    <Text className="text-sm font-sans-semibold text-primary">
                      I cancelled
                    </Text>
                  </View>
                </PressableScale>
                <Pressable
                  onPress={() => setCheckinSnoozed(true)}
                  className="px-2 py-2"
                >
                  <Text className="text-sm font-sans-semibold text-muted-foreground">
                    Not yet
                  </Text>
                </Pressable>
              </View>
            </View>
          </FadeInUp>
        )}

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
              value={
                nextRenewal ? nextRenewal.format("MMM D, YYYY") : fallback
              }
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
            onPress={() => {
              setHighlightDate(false);
              setEditVisible(true);
            }}
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
        onClose={() => {
          setEditVisible(false);
          setHighlightDate(false);
        }}
        onSubmit={handleEdit}
        subscription={subscription}
        highlightDate={highlightDate}
      />
    </SafeAreaView>
  );
};

export default SubscriptionDetail;
