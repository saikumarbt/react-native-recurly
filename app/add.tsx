import SubscriptionFormModal from "@/components/SubscriptionFormModal";
import { useEntitlement } from "@/context/EntitlementsContext";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import { priceBucket } from "@/lib/analytics";
import { getMonthlyEquivalent } from "@/lib/billing";
import { success } from "@/lib/haptics";
import { canAddActive } from "@/lib/limits";
import { markNudgeSeen } from "@/lib/nudges";
import { Redirect, useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";

/**
 * Global "add subscription" surface, reached from the center ＋ FAB on any tab.
 * Rendered as a transparent modal route so the full-height form sheet slides up
 * over whichever tab is active. Closing pops back to that tab.
 */
export default function AddSubscription() {
  const router = useRouter();
  const { subscriptions, addSubscription } = useSubscriptions();
  const { isPro } = useEntitlement();
  const posthog = usePostHog();

  // Choke-point guard: /add is a route, so a deep link (myrev://add) or any
  // stray navigation could open it directly, bypassing the FAB / Home button
  // gates. Redirect an over-cap free user to the cap wall so the form never
  // opens and no subscription can be created past the limit.
  if (!canAddActive(subscriptions, isPro)) {
    return <Redirect href="/cap-wall" />;
  }

  const handleCreate = (draft: SubscriptionDraft) => {
    const created = addSubscription(draft);
    success();
    // First-add nudge is satisfied no matter where the add happened.
    markNudgeSeen("add_first");
    // Non-identifying signal only: no name, no exact price, no currency.
    posthog.capture("subscription_created", {
      subscription_id: created.id,
      billing_cycle: created.billingCycle ?? "monthly",
      category: created.category ?? "Uncategorized",
      is_trial: !!created.isTrial,
      price_bucket: priceBucket(
        getMonthlyEquivalent(
          created.price,
          created.billingCycle ?? "monthly",
          created.customIntervalDays,
        ),
      ),
    });
  };

  return (
    <SubscriptionFormModal
      visible
      onClose={() => router.back()}
      onSubmit={handleCreate}
    />
  );
}
