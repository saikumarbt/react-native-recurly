import "@/global.css";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { useEffect, useRef } from "react";

import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { PostHogProvider, usePostHog } from "posthog-react-native";

import { CurrencyProvider } from "@/context/CurrencyContext";
import { SubscriptionsProvider } from "@/context/SubscriptionsContext";
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
  const { isLoaded: authLoaded } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    "sans-regular": require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    "sans-medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
    "sans-semibold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "sans-bold": require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
    "sans-extrabold": require("../assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
    "sans-light": require("../assets/fonts/PlusJakartaSans-Light.ttf"),
  });

  useEffect(() => {
    if (fontError) {
      throw fontError;
    }
    if (fontsLoaded && authLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, authLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
      <Stack.Screen name="subscriptions/[id]" />
    </Stack>
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
    <PostHogProvider
      apiKey={posthogApiKey}
      options={{ host: process.env.EXPO_PUBLIC_POSTHOG_HOST }}
    >
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <PostHogUserIdentifier />
        <CurrencyProvider>
          <SubscriptionsProvider>
            <RootLayoutContent />
          </SubscriptionsProvider>
        </CurrencyProvider>
      </ClerkProvider>
    </PostHogProvider>
  );
}
