import TabBar from "@/components/TabBar";
import { tabs } from "@/constants/data";
import { hasOnboarded } from "@/lib/onboarding";
import { Redirect, Tabs } from "expo-router";

const TabLayout = () => {
  // Guest-first: no auth wall. Onboarding runs first for everyone; signing in
  // is optional (from Settings) and only needed later for Pro/backup.
  if (!hasOnboarded()) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{ title: tab.title }}
        />
      ))}
      {/* myrev Found review: lives in the tab navigator so the menu stays
          visible, but has no tab button of its own (reached from Insights/Home). */}
      <Tabs.Screen name="found" options={{ href: null }} />
    </Tabs>
  );
};

export default TabLayout;
