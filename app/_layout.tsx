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

import AnimatedSplash from "@/components/AnimatedSplash";
import DowngradeWatcher from "@/components/DowngradeWatcher";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { EntitlementsProvider } from "@/context/EntitlementsContext";
import { SubscriptionsProvider } from "@/context/SubscriptionsContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { analyticsAllowed, needsAnalyticsConsent } from "@/lib/analytics";
import { hasOnboarded } from "@/lib/onboarding";
import { loginPurchases, logoutPurchases } from "@/lib/purchases";

SplashScreen.preventAutoHideAsync();

// myrev is a phone-first, single-column app. On iPad/large screens we cap the
// whole app to a centred column at this width (theme background fills the sides)
// rather than stretching phone layouts across the full display. Keep in sync
// with the .modal-container cap in global.css.
const TABLET_MAX_WIDTH = 600;

function PostHogUserIdentifier() {
  const posthog = usePostHog();
  const { isLoaded, isSignedIn, user } = useUser();

  // Apply the analytics decision on launch, before any capture. Region-gated:
  // an undecided EEA/UK user stays opted OUT until they consent (GDPR); elsewhere
  // undecided defaults to opted in (opt-out model). See lib/analytics.
  useEffect(() => {
    if (analyticsAllowed()) posthog.optIn();
    else posthog.optOut();
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
      // Tie RevenueCat purchases to the Clerk id so Pro follows the user across
      // devices (no-ops until RC is configured). Safe to call with the same id.
      void loginPurchases(user.id);

      // Fire only on a genuine signed-out -> signed-in transition.
      if (wasSignedIn.current === false) {
        posthog.capture("user_signed_in");
      }
    } else {
      // Capture before reset() so the event is still attributed to the user.
      if (wasSignedIn.current === true) {
        posthog.capture("user_signed_out");
        // Revert RC to an anonymous id on sign-out (only on a real transition,
        // so a launch-as-guest doesn't fire a needless logOut).
        void logoutPurchases();
      }
      posthog.reset();
    }

    wasSignedIn.current = isSignedIn ?? false;
  }, [isLoaded, isSignedIn, user, posthog]);

  return null;
}

function RootLayoutContent() {
  const router = useRouter();
  const { palette } = useTheme();
  const [splashDone, setSplashDone] = useState(false);

  // Region-gated analytics consent (GDPR): once past the splash, an onboarded
  // EEA/UK user who hasn't decided yet gets the one-time opt-in prompt. Analytics
  // is already OFF for them until they accept (see PostHog init above); this just
  // lets them turn it on. Shown once per launch.
  const consentPrompted = useRef(false);
  useEffect(() => {
    if (!splashDone || consentPrompted.current) return;
    if (hasOnboarded() && needsAnalyticsConsent()) {
      consentPrompted.current = true;
      router.push("/analytics-consent");
    }
  }, [splashDone, router]);

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
    // Outer fills the whole screen with the theme background; the inner column
    // caps at TABLET_MAX_WIDTH and centers, so on iPad the app is a clean centred
    // column (phone-first, no stretched layouts) with the theme colour on the
    // sides — seamless, not a black letterbox. On phones the column is full width.
    // Theme switch is driven by Appearance.setColorScheme() in ThemeProvider.
    <View className="flex-1" style={{ backgroundColor: palette.background }}>
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: TABLET_MAX_WIDTH,
          alignSelf: "center",
        }}
      >
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
          {/* Full-height add sheet: the route itself must be transparent (not the
              Stack's opaque palette.background) so the active tab stays visible,
              dimmed, behind the form's own slide-up Modal. Otherwise the route
              paints a solid screen over the tabs and the background reads blank. */}
          <Stack.Screen
            name="add"
            options={{
              presentation: "transparentModal",
              animation: "none",
              contentStyle: { backgroundColor: "transparent" },
            }}
          />
          <Stack.Screen
            name="cap-wall"
            options={{
              presentation: "transparentModal",
              animation: "fade",
              contentStyle: { backgroundColor: "transparent" },
            }}
          />
          {/* Pro paywall — a full modal card (opaque; not the transparent
              sheet the cap wall uses) so the tiers + trial read as their own
              screen. Reached from every Pro-upsell CTA. */}
          <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
          {/* Downgrade reconciliation — a forced full-screen choice (no swipe
              dismiss): a lapsed over-cap user picks which 5 subs stay active. */}
          <Stack.Screen
            name="reconcile"
            options={{
              presentation: "fullScreenModal",
              gestureEnabled: false,
            }}
          />
          {/* GDPR analytics opt-in prompt (EEA/UK) — transparent centred card. */}
          <Stack.Screen
            name="analytics-consent"
            options={{
              presentation: "transparentModal",
              animation: "fade",
              contentStyle: { backgroundColor: "transparent" },
            }}
          />
        </Stack>
        {!splashDone ? (
          <AnimatedSplash onFinish={() => setSplashDone(true)} />
        ) : null}
        <DowngradeWatcher />
      </View>
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
              <EntitlementsProvider>
                <ThemeProvider>
                  <RootLayoutContent />
                </ThemeProvider>
              </EntitlementsProvider>
            </SubscriptionsProvider>
          </CurrencyProvider>
        </ClerkProvider>
      </PostHogProvider>
    </GestureHandlerRootView>
  );
}
