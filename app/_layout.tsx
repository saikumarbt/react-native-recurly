import "@/global.css";
import { icons } from "@/constants/icons";
import { Asset } from "expo-asset";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { SplashScreen, Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ClerkProvider, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { PostHogProvider, usePostHog } from "posthog-react-native";

import { View } from "react-native";

import { CurrencyProvider } from "@/context/CurrencyContext";
import { SubscriptionsProvider } from "@/context/SubscriptionsContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { getKv } from "@/db/subscriptionsRepo";
import { ANALYTICS_OPTOUT_KEY } from "@/lib/analytics";

SplashScreen.preventAutoHideAsync();

function PostHogUserIdentifier() {
  const posthog = usePostHog();
  const { isLoaded, isSignedIn, user } = useUser();

  // Apply the persisted analytics opt-out on launch (before any capture).
  useEffect(() => {
    if (getKv(ANALYTICS_OPTOUT_KEY) === "1") {
      posthog.optOut();
    } else {
      posthog.optIn();
    }
  }, [posthog]);
  // Tracks the previous auth state so we only capture on real transitions.
  // `null` means "not yet known" (initial mount), which must not count as a
  // sign-in/sign-out event (e.g. reopening the app while already signed in).
  const wasSignedIn = useRef<boolean | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (isSignedIn && user) {
      // Identify by the opaque Clerk id only. PII (email/name) intentionally
      // stays out of analytics — it lives in Clerk (auth) and, later, the
      // marketing list. PostHog holds behavior keyed to this id.
      posthog.identify(user.id);

      // Fire only on a genuine signed-out -> signed-in transition.
      if (wasSignedIn.current === false) {
        posthog.capture("user_signed_in");
      }
    } else {
      // Capture before reset() so the event is still attributed to the user.
      if (wasSignedIn.current === true) {
        posthog.capture("user_signed_out");
      }
      posthog.reset();
    }

    wasSignedIn.current = isSignedIn ?? false;
  }, [isLoaded, isSignedIn, user, posthog]);

  return null;
}

function RootLayoutContent() {
  const router = useRouter();
  const { palette, varStyle } = useTheme();

  // Tapping a reminder deep-links to that subscription. The response can arrive
  // before the navigator is mounted (a cold start launched by the tap), so we
  // buffer the route and flush it once `ready` — never push before the router
  // has a mounted navigator.
  const [pendingSubId, setPendingSubId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const id = response?.notification.request.content.data?.subscriptionId;
        if (active && typeof id === "string") {
          setPendingSubId(id);
        }
      },
    );
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  const [fontsLoaded, fontError] = useFonts({
    "sans-regular": require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    "sans-medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
    "sans-semibold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "sans-bold": require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
    "sans-extrabold": require("../assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
    "sans-light": require("../assets/fonts/PlusJakartaSans-Light.ttf"),
    // Fraunces (72pt optical size) — editorial display face for large numerals
    // and headlines only; body/UI stays Plus Jakarta Sans.
    "display-semibold": require("../assets/fonts/Fraunces_72pt-SemiBold.ttf"),
    "display-black": require("../assets/fonts/Fraunces_72pt-Black.ttf"),
  });

  // Preload the tab-bar icons so the whole bar paints at once. Otherwise the
  // white glyphs decode a frame after the navy bar, and only the active Home
  // pill shows first — a visible "pop-in" of the rest of the menu.
  const [iconsLoaded, setIconsLoaded] = useState(false);
  useEffect(() => {
    Asset.loadAsync(Object.values(icons))
      .catch(() => {})
      .finally(() => setIconsLoaded(true));
  }, []);

  const ready = fontsLoaded && iconsLoaded;

  useEffect(() => {
    if (fontError) {
      throw fontError;
    }
    // Guest-first: reveal the UI as soon as fonts + tab icons are ready — don't
    // wait on Clerk auth (it resolves in the background; screens show the guest
    // state and update when it loads). Avoids a visible startup delay.
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready, fontError]);

  // Flush a buffered notification deep-link once the navigator is mounted.
  useEffect(() => {
    if (ready && pendingSubId) {
      router.push(`/subscriptions/${pendingSubId}`);
      setPendingSubId(null);
    }
  }, [ready, pendingSubId, router]);

  if (!ready) {
    return null;
  }

  return (
    // Apply the active theme's tokens at the app root via vars(); every
    // bg-*/text-* class resolves to the current light/dark palette.
    <View style={[{ flex: 1, backgroundColor: palette.background }, varStyle]}>
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: palette.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
        <Stack.Screen name="subscriptions/[id]" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error(
      "Missing env variable: EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not defined",
    );
  }

  const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;

  if (!posthogApiKey) {
    throw new Error(
      "Missing env variable: EXPO_PUBLIC_POSTHOG_KEY is not defined",
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PostHogProvider
        apiKey={posthogApiKey}
        options={{ host: process.env.EXPO_PUBLIC_POSTHOG_HOST }}
      >
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <PostHogUserIdentifier />
          <CurrencyProvider>
            <SubscriptionsProvider>
              <ThemeProvider>
                <RootLayoutContent />
              </ThemeProvider>
            </SubscriptionsProvider>
          </CurrencyProvider>
        </ClerkProvider>
      </PostHogProvider>
    </GestureHandlerRootView>
  );
}
