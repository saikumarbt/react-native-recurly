import "@/global.css";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";

import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { PostHogProvider, usePostHog } from "posthog-react-native";

SplashScreen.preventAutoHideAsync();

function PostHogUserIdentifier() {
  const posthog = usePostHog();
  const { isLoaded, isSignedIn, user } = useUser();

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
    } else {
      posthog.reset();
    }
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
        <RootLayoutContent />
      </ClerkProvider>
    </PostHogProvider>
  );
}
