import SheetBackdrop from "@/components/SheetBackdrop";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import { useTheme } from "@/context/ThemeContext";
import { FREE_ACTIVE_CAP, countActive } from "@/lib/limits";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";

/**
 * Kind cap wall shown when a free user tries to add past FREE_ACTIVE_CAP active
 * subscriptions. Assistant-voice, not a barricade. Existing data is never
 * touched — this only blocks the new add. CTA routes to "/paywall?source=cap_wall".
 */
export default function CapWall() {
  const router = useRouter();
  const { palette, varStyle, scheme } = useTheme();
  const { subscriptions } = useSubscriptions();
  const posthog = usePostHog();

  // The user hit the free cap — a key conversion-funnel signal.
  useEffect(() => {
    posthog.capture("cap_hit", { active_count: countActive(subscriptions) });
    // Fire once per time the wall is shown (route mounts on each blocked add).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View className="modal-overlay" style={varStyle}>
      <SheetBackdrop scheme={scheme} />
      <Pressable
        className="absolute inset-0"
        onPress={() => router.back()}
        accessibilityLabel="Close"
      />
      <View className="modal-container p-6">
        <View className="sheet-handle" />
        <View className="flex-row items-center gap-3">
          <View
            className="size-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: palette.accent }}
          >
            <Text className="font-display-black text-lg text-on-accent">m</Text>
          </View>
          <Text className="text-2xl font-display-semibold text-primary">
            You&apos;re tracking {FREE_ACTIVE_CAP}.
          </Text>
        </View>
        <Text className="mt-3 text-base font-sans-medium text-muted-foreground">
          You&apos;re clearly on top of this. Go unlimited and I&apos;ll watch
          every subscription, not just {FREE_ACTIVE_CAP}.
        </Text>
        <Pressable
          className="mt-6 items-center rounded-2xl bg-accent py-4"
          onPress={() => {
            router.back();
            router.push("/paywall?source=cap_wall");
          }}
        >
          <Text className="text-base font-sans-bold text-on-accent">
            Go unlimited with Pro
          </Text>
        </Pressable>
        <Pressable className="mt-1 items-center py-3" onPress={() => router.back()}>
          <Text className="text-sm font-sans-semibold text-muted-foreground">
            Not now
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
