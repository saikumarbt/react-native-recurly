import CancelCelebration from "@/components/CancelCelebration";
import SheetBackdrop from "@/components/SheetBackdrop";
import { cancelGuideFor } from "@/constants/cancelGuides";
import { useCurrency } from "@/context/CurrencyContext";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import { useTheme } from "@/context/ThemeContext";
import "@/global.css";
import { getMonthlyEquivalent } from "@/lib/billing";
import { keepSubscription } from "@/lib/foundKept";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { AppState, Linking, Modal, Pressable, Text, View } from "react-native";

// The one cancel surface, used from Found and the detail screen.
// Model: myrev shows you how → you cancel at the service → myrev updates your
// tracker. myrev never cancels for you. Free gets the reconcile + a generic
// nudge; Pro gets curated steps + a direct link. Cancelling is never paywalled.

const GENERIC_STEPS = [
  "Open the service's account or billing page",
  "Find Manage plan or Subscription",
  "Cancel, then confirm",
];

const CancelFlowSheet = ({
  visible,
  subId,
  name,
  isPro,
  onClose,
  onResolved,
}: {
  visible: boolean;
  subId: string | null;
  name: string | null;
  isPro: boolean;
  onClose: () => void;
  /** Fired after the user resolves (cancelled or kept) so callers can refresh. */
  onResolved?: () => void;
}) => {
  const { varStyle, scheme } = useTheme();
  const { baseCurrency } = useCurrency();
  const { cancelSubscription, updateSubscription, getSubscription } =
    useSubscriptions();
  const posthog = usePostHog();

  const [stage, setStage] = useState<"guide" | "confirm">("guide");
  const [celebration, setCelebration] = useState<number | null>(null);
  const openedPage = useRef(false);

  const guide = name ? cancelGuideFor(name) : null;

  // Reset each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setStage("guide");
      openedPage.current = false;
    }
  }, [visible]);

  // If they opened the service's cancel page, ask for the outcome the moment
  // they return to the app — the natural confirmation point.
  useEffect(() => {
    if (!visible) return;
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active" && openedPage.current) setStage("confirm");
    });
    return () => sub.remove();
  }, [visible]);

  if (!subId || !name) return null;

  const markIntent = () =>
    updateSubscription(subId, { cancelPendingAt: new Date().toISOString() });

  const openCancelPage = () => {
    markIntent();
    posthog.capture("cancel_intent", { subscription_id: subId });
    openedPage.current = true;
    if (guide?.url) Linking.openURL(guide.url).catch(() => {});
  };

  const resolveCancelled = () => {
    const sub = getSubscription(subId);
    const monthly = sub
      ? getMonthlyEquivalent(
          sub.price,
          sub.billingCycle ?? "monthly",
          sub.customIntervalDays,
        )
      : 0;
    updateSubscription(subId, { cancelPendingAt: undefined });
    cancelSubscription(subId);
    posthog.capture("cancel_confirmed", { subscription_id: subId });
    onResolved?.();
    setCelebration(monthly); // celebration's onClose closes the sheet
  };

  const resolveKept = () => {
    updateSubscription(subId, { cancelPendingAt: undefined });
    keepSubscription(subId);
    posthog.capture("cancel_kept", { subscription_id: subId });
    onResolved?.();
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible && celebration === null}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View className="modal-overlay" style={varStyle}>
          <SheetBackdrop scheme={scheme} />
          <Pressable
            className="absolute inset-0"
            onPress={onClose}
            accessibilityLabel="Close"
          />
          <View className="modal-container p-6">
            <View className="sheet-handle" />

            {stage === "guide" ? (
              <>
                <Text className="text-xs font-sans-bold uppercase tracking-[2px] text-accent">
                  Cancel
                </Text>
                <Text className="mt-1 text-2xl font-display-semibold text-primary">
                  {name}
                </Text>
                <Text className="mt-2 text-sm font-sans-medium text-muted-foreground">
                  I can&apos;t cancel it for you. Here&apos;s how — then tell me
                  so your tracker stays accurate.
                </Text>

                <View className="mt-4 gap-3">
                  {(isPro ? (guide?.steps ?? GENERIC_STEPS) : GENERIC_STEPS).map(
                    (step, i) => (
                      <View key={i} className="flex-row gap-3">
                        <Text className="w-5 text-base font-sans-extrabold text-accent">
                          {i + 1}
                        </Text>
                        <Text className="flex-1 text-sm font-sans-medium text-primary">
                          {step}
                        </Text>
                      </View>
                    ),
                  )}
                </View>

                {isPro && guide?.url ? (
                  <Pressable
                    className="mt-5 items-center rounded-2xl bg-accent py-4"
                    onPress={openCancelPage}
                  >
                    <Text className="text-base font-sans-bold text-on-accent">
                      Open {name}&apos;s cancel page ↗
                    </Text>
                  </Pressable>
                ) : null}

                {!isPro ? (
                  <Text className="mt-4 text-center text-xs font-sans-medium text-muted-foreground">
                    ✦ Pro shows the exact steps and a one-tap cancel link.
                  </Text>
                ) : null}

                <Pressable
                  className="mt-3 items-center rounded-2xl border border-border py-3"
                  onPress={() => setStage("confirm")}
                >
                  <Text className="text-sm font-sans-bold text-primary">
                    I&apos;ve already cancelled it
                  </Text>
                </Pressable>
                <Pressable className="mt-1 items-center py-2" onPress={onClose}>
                  <Text className="text-sm font-sans-semibold text-muted-foreground">
                    Not now
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text className="text-2xl font-display-semibold text-primary">
                  Did you cancel {name}?
                </Text>
                <Text className="mt-2 text-sm font-sans-medium text-muted-foreground">
                  Tell me so myrev keeps your spend and savings accurate.
                </Text>
                <Pressable
                  className="mt-5 items-center rounded-2xl bg-accent py-4"
                  onPress={resolveCancelled}
                >
                  <Text className="text-base font-sans-bold text-on-accent">
                    Yes, it&apos;s cancelled
                  </Text>
                </Pressable>
                <Pressable
                  className="mt-2 items-center rounded-2xl border border-border py-3"
                  onPress={resolveKept}
                >
                  <Text className="text-sm font-sans-bold text-primary">
                    I&apos;m keeping it
                  </Text>
                </Pressable>
                <Pressable className="mt-1 items-center py-2" onPress={onClose}>
                  <Text className="text-sm font-sans-semibold text-muted-foreground">
                    Not yet — I&apos;ll decide later
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      <CancelCelebration
        visible={celebration !== null}
        name={name}
        monthlySaved={celebration ?? 0}
        currency={baseCurrency}
        onClose={() => {
          setCelebration(null);
          onClose();
        }}
      />
    </>
  );
};

export default CancelFlowSheet;
