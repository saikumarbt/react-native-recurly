import { useCurrency } from "@/context/CurrencyContext";
import { useEntitlement } from "@/context/EntitlementsContext";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import "@/global.css";
import { getMonthlyEquivalent } from "@/lib/billing";
import { suggestKeep } from "@/lib/downgrade";
import { FREE_ACTIVE_CAP } from "@/lib/limits";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "expo-router";
import { styled } from "nativewind";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView) as any;

// Pro→Free reconciliation (boardroom 2026-07-28): a lapsed user over the free
// active cap picks which FREE_ACTIVE_CAP subs stay active; the rest are locked
// (paused + view-only, "Reactivate with Pro"). Nothing is deleted; resubscribe
// restores everything. Forced screen (no dismiss) — the only exits are Confirm
// or Reactivate Pro.
export default function Reconcile() {
  const router = useRouter();
  const { subscriptions, lockSubscriptions } = useSubscriptions();
  const { isPro } = useEntitlement();
  const { baseCurrency } = useCurrency();

  const active = useMemo(
    () => subscriptions.filter((s) => (s.status ?? "active") === "active"),
    [subscriptions],
  );

  // Pre-select the suggested keep-set (soonest renewal / highest spend).
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(suggestKeep(subscriptions).keepIds),
  );

  const dismiss = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  // If they resubscribe (via the paywall) or somehow return to ≤ cap active,
  // this screen has nothing to do — dismiss.
  useEffect(() => {
    if (isPro || active.length <= FREE_ACTIVE_CAP) dismiss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro, active.length]);

  const money = (s: Subscription) =>
    formatCurrency(
      getMonthlyEquivalent(s.price, s.billingCycle ?? "monthly", s.customIntervalDays),
      baseCurrency,
    );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < FREE_ACTIVE_CAP) next.add(id);
      return next;
    });
  };

  const keepCount = selected.size;
  const lockCount = active.length - keepCount;
  const atMax = keepCount >= FREE_ACTIVE_CAP;
  const canConfirm = keepCount >= 1 && keepCount <= FREE_ACTIVE_CAP;

  const confirm = () => {
    if (!canConfirm) return;
    const lockIds = active.filter((s) => !selected.has(s.id)).map((s) => s.id);
    lockSubscriptions(lockIds);
    dismiss();
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="grow gap-4 px-6 pb-6 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-2">
          <Text className="text-xs font-sans-extrabold uppercase tracking-[2px] text-accent">
            Your Pro ended
          </Text>
          <Text className="text-3xl font-display-black leading-tight text-primary">
            Choose the {FREE_ACTIVE_CAP} to keep tracking
          </Text>
          <Text className="text-sm font-sans-medium text-muted-foreground">
            Free tracks {FREE_ACTIVE_CAP} subscriptions. Pick the ones to keep
            active — I&apos;ll pause the rest (nothing is deleted, and reactivating
            Pro brings them all back).
          </Text>
        </View>

        <Text className="text-sm font-sans-bold text-primary">
          Keeping {keepCount} of {active.length} · pausing {lockCount}
        </Text>

        <View className="gap-3">
          {active.map((s) => {
            const on = selected.has(s.id);
            const disabled = !on && atMax;
            return (
              <Pressable
                key={s.id}
                onPress={() => toggle(s.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on, disabled }}
                accessibilityLabel={`${s.name}, ${money(s)} per month`}
                className={
                  "flex-row items-center gap-3 rounded-2xl border p-4 " +
                  (on
                    ? "border-accent bg-accent/10"
                    : disabled
                      ? "border-border bg-card opacity-40"
                      : "border-border bg-card")
                }
              >
                <View
                  className={
                    "size-6 items-center justify-center rounded-md border " +
                    (on ? "border-accent bg-accent" : "border-border bg-background")
                  }
                >
                  {on ? (
                    <Text className="text-xs font-sans-bold text-on-accent">✓</Text>
                  ) : null}
                </View>
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-base font-sans-semibold text-primary"
                    numberOfLines={1}
                  >
                    {s.name}
                    {s.isTrial ? "  · trial" : ""}
                  </Text>
                  {s.category ? (
                    <Text className="text-xs font-sans-medium text-muted-foreground">
                      {s.category}
                    </Text>
                  ) : null}
                </View>
                <Text className="font-display-bold text-primary">{money(s)}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View className="gap-2 border-t border-border px-6 pb-8 pt-4">
        <Pressable
          onPress={confirm}
          disabled={!canConfirm}
          accessibilityRole="button"
          // Keep active: stable (see paywall) — dim disabled via inline opacity.
          className="items-center rounded-2xl bg-accent py-4 active:opacity-80"
          style={!canConfirm ? { opacity: 0.5 } : undefined}
        >
          <Text className="text-base font-sans-bold text-on-accent">
            Keep {keepCount}, pause {lockCount}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/paywall?source=downgrade")}
          accessibilityRole="button"
          className="items-center py-2"
        >
          <Text className="text-sm font-sans-bold text-accent">
            Reactivate Pro to keep all {active.length}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
