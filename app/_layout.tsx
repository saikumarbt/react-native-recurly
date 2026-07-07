import "@/global.css";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { useEffect, useRef } from "react";

import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { PostHogProvider, usePostHog } from "posthog-react-native";

import { SubscriptionsProvider } from "@/context/SubscriptionsContext";

SplashScreen.preventAutoHideAsync();

function PostHogUserIdentifier() {
  const posthog = usePostHog();
  const { isLoaded, isSignedIn, user } = useUser();
  // Tracks the previous auth state so we only capture on real transitions.
  // `null` means "not yet known" (initial mount), which must not count as a
  // sign-in/sign-out event (e.g. reopening the app while already signed in).
  const wasSignedIn = useRef<boolean | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (isSignedIn && user) {
      const properties: Record<string, string> = {};
      const email = user.primaryEmailAddress?.emailAddress;
      if (email) {
        properties.email = email;
      }
      if (user.fullName) {
        properties.name = user.fullName;
      }
      posthog.identify(user.id, properties);

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

  return <Stack screenOptions={{ headerShown: false }} />;
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
        <SubscriptionsProvider>
          <RootLayoutContent />
        </SubscriptionsProvider>
      </ClerkProvider>
    </PostHogProvider>
  );
}
