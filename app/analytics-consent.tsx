import "@/global.css";
import { setAnalyticsDecision } from "@/lib/analytics";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { Pressable, Text, View } from "react-native";

// GDPR region-gated analytics opt-in (boardroom 2026-07-30). Only presented to
// EEA/UK users who haven't decided yet; analytics is OFF until they accept here.
// A definitive choice either way is persisted, so this never shows again.
export default function AnalyticsConsent() {
  const router = useRouter();
  const posthog = usePostHog();

  const decide = (allowed: boolean) => {
    setAnalyticsDecision(allowed);
    if (allowed) posthog.optIn();
    else posthog.optOut();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <View className="flex-1 justify-end bg-black/40 px-5 pb-10">
      <View className="gap-3 rounded-3xl border border-border bg-background p-6">
        <Text className="text-xs font-sans-extrabold uppercase tracking-[2px] text-accent">
          Your privacy
        </Text>
        <Text className="text-2xl font-display-black leading-tight text-primary">
          Help improve myrev?
        </Text>
        <Text className="text-sm font-sans-medium text-muted-foreground">
          Share anonymous usage stats so I can see what&apos;s working — never
          your name, the services you track, or any amounts. It&apos;s off until
          you say yes, and you can change it anytime in Settings.
        </Text>

        <Pressable
          onPress={() => decide(true)}
          accessibilityRole="button"
          className="mt-2 items-center rounded-2xl bg-accent py-4 active:opacity-80"
        >
          <Text className="text-base font-sans-bold text-on-accent">
            Sure, share anonymous stats
          </Text>
        </Pressable>
        <Pressable
          onPress={() => decide(false)}
          accessibilityRole="button"
          className="items-center rounded-2xl py-3 active:opacity-70"
        >
          <Text className="text-sm font-sans-bold text-muted-foreground">
            No thanks
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
