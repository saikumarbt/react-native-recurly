import { useEntitlement } from "@/context/EntitlementsContext";
import "@/global.css";
import { manageSubscriptions } from "@/lib/purchases";
import { Pressable, Text, View } from "react-native";

/**
 * Grace-period winback (boardroom 2026-07-28). While the user is STILL Pro but
 * the entitlement is lapsing — a billing issue (payment failed, in the store's
 * retry grace) or a pending voluntary cancel (won't renew) — surface a gentle
 * banner so they can fix it before losing Pro. Renders nothing otherwise.
 */
export default function WinbackBanner() {
  const { isPro, proEntitlement } = useEntitlement();
  if (!isPro || !proEntitlement) return null;

  const billingIssue = !!proEntitlement.billingIssueDetectedAt;
  const cancelling =
    !billingIssue &&
    !!proEntitlement.unsubscribeDetectedAt &&
    proEntitlement.willRenew === false;
  if (!billingIssue && !cancelling) return null;

  const until = proEntitlement.expirationDate
    ? new Date(proEntitlement.expirationDate).toLocaleDateString()
    : null;

  const title = billingIssue ? "Payment issue" : "Your Pro is ending";
  const body = billingIssue
    ? "Update your payment method to keep Pro — otherwise you'll drop to the free plan."
    : until
      ? `Pro ends ${until}. Reactivate to keep unlimited tracking and myrev Found.`
      : "Reactivate to keep unlimited tracking and myrev Found.";

  return (
    <View className="mb-4 rounded-2xl border border-warning bg-warning/10 p-4">
      <Text className="text-sm font-sans-bold text-primary">{title}</Text>
      <Text className="mt-0.5 text-xs font-sans-medium text-muted-foreground">
        {body}
      </Text>
      <Pressable
        onPress={() => void manageSubscriptions()}
        accessibilityRole="button"
        className="mt-3 items-center rounded-xl bg-accent py-2.5 active:opacity-80"
      >
        <Text className="text-sm font-sans-bold text-on-accent">
          {billingIssue ? "Update payment" : "Reactivate"}
        </Text>
      </Pressable>
    </View>
  );
}
