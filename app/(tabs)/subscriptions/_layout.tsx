import { Stack } from "expo-router";

// Nested stack INSIDE the Subscriptions tab: the list (index) pushes the detail
// ([id]) while the parent tab bar stays visible, so the menu persists on the
// detail screen and Back pops to the list. Headers are custom per screen.
export default function SubscriptionsStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
