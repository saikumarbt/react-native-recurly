import BackButton from "@/components/BackButton";
import CancelFlowSheet from "@/components/CancelFlowSheet";
import { useCurrency } from "@/context/CurrencyContext";
import { useEntitlement } from "@/context/EntitlementsContext";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import "@/global.css";
import { computeFound } from "@/lib/found";
import { getKeptSubIds } from "@/lib/foundKept";
import { formatCurrency } from "@/lib/utils";
import { Redirect } from "expo-router";
import { styled } from "nativewind";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView) as any;

// Pro-only review screen for "myrev Found". Lives in the tabs navigator (as a
// hidden screen — no tab button) so the bottom menu stays visible, matching the
// other main screens; scrolls for any number of services. Free users never
// reach here (their card is a teaser); guard anyway.
const FoundReview = () => {
  const { subscriptions } = useSubscriptions();
  const { baseCurrency } = useCurrency();
  const { isPro } = useEntitlement();
  const [cancelFor, setCancelFor] = useState<{ id: string; name: string } | null>(
    null,
  );
  // Bump on resolve so "kept" suppression + cancellations reflect immediately.
  const [rev, setRev] = useState(0);
  const found = useMemo(
    () => computeFound(subscriptions, getKeptSubIds()),
    // `rev` isn't read directly — it forces a recompute after a "keep"/cancel
    // resolves (kept ids live in kv, not props).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subscriptions, rev],
  );

  if (!isPro) return <Redirect href="/insights" />;

  const money = (n: number) => formatCurrency(n, baseCurrency);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="insights-header">
        <BackButton />
        <Text className="modal-title">myrev Found</Text>
        <View className="size-11" />
      </View>

      <ScrollView
        contentContainerClassName="grow gap-5 p-5 pb-32"
        showsVerticalScrollIndicator={false}
      >
        {found.count === 0 ? (
          <Text className="home-empty-state">
            Nothing to review right now. I&apos;ll flag savings here as they come
            up.
          </Text>
        ) : (
          <>
            <View className="rounded-3xl border border-accent bg-accent/5 p-5">
              <Text className="text-xs font-sans-bold uppercase tracking-wide text-muted-foreground">
                up to
              </Text>
              <Text className="text-4xl font-sans-extrabold text-accent">
                {money(found.annualSavings)}
                <Text className="text-base font-sans-bold">/yr to cut</Text>
              </Text>
            </View>

            {/* Overlap decisions — keep the one you use */}
            {found.groups.map((g) => (
              <View
                key={g.key}
                className="rounded-3xl border border-border bg-card p-5"
              >
                <Text className="text-base font-sans-bold text-primary">
                  {g.members.length} {g.category} tools do similar things
                </Text>
                <Text className="mt-0.5 text-sm font-sans-medium text-muted-foreground">
                  Keep the one you use — save up to {money(g.bestSave)}/yr.
                </Text>
                <View className="mt-4 gap-3">
                  {g.members.map((m) => {
                    const opt = g.keepOptions.find(
                      (k) => k.keepSubId === m.subId,
                    );
                    return (
                      <View
                        key={m.subId}
                        className="flex-row items-center justify-between border-t border-border/50 pt-3"
                      >
                        <View className="flex-1 pr-2">
                          <Text className="text-sm font-sans-semibold text-primary">
                            {m.name}
                          </Text>
                          <Text className="text-xs font-sans-medium text-muted-foreground">
                            {money(m.annual / 12)}/mo · keep this, save{" "}
                            {money(opt?.save ?? 0)}/yr
                          </Text>
                        </View>
                        <Pressable
                          className="rounded-full border border-accent px-4 py-2"
                          onPress={() =>
                            setCancelFor({ id: m.subId, name: m.name })
                          }
                        >
                          <Text className="text-sm font-sans-bold text-accent">
                            Cancel
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}

            {/* Simple findings — duplicates, bundles */}
            {found.findings.map((f) => (
              <View
                key={f.key}
                className="flex-row items-center justify-between rounded-3xl border border-border bg-card p-5"
              >
                <View className="flex-1 pr-2">
                  <Text className="text-sm font-sans-semibold text-primary">
                    {f.label}
                  </Text>
                  <Text className="text-xs font-sans-medium text-muted-foreground">
                    {f.detail} · save {money(f.annualSaving)}/yr
                  </Text>
                </View>
                <Pressable
                  className="rounded-full border border-accent px-4 py-2"
                  onPress={() => setCancelFor({ id: f.subId, name: f.label })}
                >
                  <Text className="text-sm font-sans-bold text-accent">
                    Cancel
                  </Text>
                </Pressable>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <CancelFlowSheet
        visible={cancelFor !== null}
        subId={cancelFor?.id ?? null}
        name={cancelFor?.name ?? null}
        isPro={isPro}
        onClose={() => setCancelFor(null)}
        onResolved={() => setRev((r) => r + 1)}
      />
    </SafeAreaView>
  );
};

export default FoundReview;
