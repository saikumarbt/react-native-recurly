import { PressableScale } from "@/components/motion";
import { tabs } from "@/constants/data";
import { icons } from "@/constants/icons";
import { components } from "@/constants/theme";
import { useEntitlement } from "@/context/EntitlementsContext";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import { useTheme } from "@/context/ThemeContext";
import { canAddActive } from "@/lib/limits";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { clsx } from "clsx";
import { useRouter } from "expo-router";
import { Image, type ImageSourcePropType, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const tabBar = components.tabBar;

/** One tinted glyph in its (optionally active) pill — matches the mockup navbar. */
const TabButton = ({
  icon,
  label,
  focused,
  onPress,
}: {
  icon: ImageSourcePropType;
  label: string;
  focused: boolean;
  onPress: () => void;
}) => {
  const { palette } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center"
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
    >
      <View className={clsx("tabs-pill", focused && "tabs-active")}>
        <Image
          source={icon}
          resizeMode="contain"
          className="tabs-glyph"
          tintColor={focused ? palette.onAccent : palette.mutedForeground}
        />
      </View>
    </Pressable>
  );
};

/**
 * Custom bottom bar: the four tabs split around a raised center ＋ FAB that
 * opens the global add sheet (/add) from whatever tab is active. Board decision
 * 2026-07-22 — Calendar cut, ＋ promoted to an enlarged center action.
 */
const TabBar = ({ state, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const { palette, scheme } = useTheme();
  const { subscriptions } = useSubscriptions();
  const { isPro } = useEntitlement();
  const router = useRouter();

  // Free tier caps active subscriptions; at the cap the ＋ opens the cap wall
  // instead of the add sheet (existing data is untouched).
  const openAdd = () =>
    router.push(canAddActive(subscriptions, isPro) ? "/add" : "/cap-wall");

  const go = (routeName: string, routeKey: string, isFocused: boolean) => {
    const event = navigation.emit({
      type: "tabPress",
      target: routeKey,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  // Look up each tab's route by NAME (not index) so hidden routes like `found`
  // never shift the four visible buttons. Render order → [Home, Subscriptions]
  // ＋ FAB ＋ [Insights, Settings].
  const button = (i: number) => {
    const tab = tabs[i];
    if (!tab) return null;
    const routeIndex = state.routes.findIndex((r) => r.name === tab.name);
    const route = state.routes[routeIndex];
    if (!route) return null;
    const focused = state.index === routeIndex;
    return (
      <TabButton
        key={route.key}
        icon={tab.icon}
        label={tab.title}
        focused={focused}
        onPress={() => go(route.name, route.key, focused)}
      />
    );
  };

  const dark = scheme === "dark";
  return (
    <View
      className="tab-bar-shell"
      style={{
        bottom: Math.max(insets.bottom, tabBar.horizontalInset),
        marginHorizontal: tabBar.horizontalInset,
        backgroundColor: palette.raised,
        // A stronger hairline + a soft shadow so the near-white bar lifts off
        // the near-white light background; in dark the raised fill already
        // separates, so the shadow is just a subtle depth cue.
        borderColor: dark ? palette.border : "rgba(30,22,54,0.10)",
        shadowColor: dark ? "#000000" : "#4c3c78",
        shadowOpacity: dark ? 0.4 : 0.16,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
        elevation: 12,
      }}
    >
      {button(0)}
      {button(1)}

      <View className="flex-1 items-center">
        {/* PressableScale doesn't forward a11y props, so set them here. */}
        <PressableScale
          onPress={openAdd}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Add subscription"
        >
          <View
            className="tab-fab"
            style={{
              backgroundColor: palette.accent,
              shadowColor: palette.accent,
              shadowOpacity: 0.35,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 8 },
              elevation: 8,
            }}
          >
            <Image
              source={icons.add}
              resizeMode="contain"
              className="tab-fab-glyph"
              tintColor={palette.onAccent}
            />
          </View>
        </PressableScale>
      </View>

      {button(2)}
      {button(3)}
    </View>
  );
};

export default TabBar;
