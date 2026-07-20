import { tabs } from "@/constants/data";
import { components } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { hasOnboarded } from "@/lib/onboarding";
import { clsx } from "clsx";
import { Redirect, Tabs } from "expo-router";
import { Image, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const tabBar = components.tabBar;

const TabIcon = ({ focused, icon }: TabIconProps) => {
  const { palette } = useTheme();
  // Glyph PNGs are single-colour with alpha, so tint them per theme/focus:
  // on-accent white inside the active pill, muted otherwise.
  return (
    <View className="tabs-icon">
      <View className={clsx("tabs-pill", focused && "tabs-active")}>
        <Image
          source={icon}
          resizeMode="contain"
          className="tabs-glyph"
          tintColor={focused ? palette.onAccent : palette.mutedForeground}
        />
      </View>
    </View>
  );
};

const TabLayout = () => {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();

  // Guest-first: no auth wall. Onboarding runs first for everyone; signing in
  // is optional (from Settings) and only needed later for Pro/backup.
  if (!hasOnboarded()) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          bottom: Math.max(insets.bottom, tabBar.horizontalInset),
          height: tabBar.height,
          marginHorizontal: tabBar.horizontalInset,
          borderRadius: tabBar.radius,
          backgroundColor: palette.raised,
          borderWidth: 1,
          borderColor: palette.border,
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarItemStyle: {
          paddingVertical: tabBar.height / 2 - tabBar.iconFrame / 1.6,
        },
        tabBarIconStyle: {
          width: tabBar.iconFrame,
          height: tabBar.iconFrame,
          alignItems: "center",
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon={tab.icon} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
};

export default TabLayout;
