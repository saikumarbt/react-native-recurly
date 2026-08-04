import type { ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  FadeInUp as FadeInUpEntrance,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

/**
 * In-house motion helpers over Reanimated — library-like ergonomics, zero new
 * dependencies. NOTE: NativeWind v5 clobbers the `style` prop on an
 * Animated.View, so these wrappers never take a className; pass styled children
 * (Views with classNames) inside instead.
 */

/** Springy fade + slide-up entrance. Plays on mount (re-key to replay). */
export const FadeInUp = ({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) => (
  <Animated.View
    entering={FadeInUpEntrance.springify().damping(16).mass(0.6).delay(delay)}
    style={style}
  >
    {children}
  </Animated.View>
);

/**
 * A Pressable whose content springs down slightly while pressed — the subtle
 * tactile feedback every primary button should have. Wrap styled children
 * (e.g. a View with the `auth-button` class) so the whole control scales.
 */
// Accessibility props aren't inferred from the wrapped children, so accept and
// forward them explicitly (e.g. the tab-bar FAB needs role/label).
type A11yProps = Pick<
  PressableProps,
  | "accessible"
  | "accessibilityRole"
  | "accessibilityLabel"
  | "accessibilityHint"
  | "accessibilityState"
>;

export const PressableScale = ({
  children,
  onPress,
  disabled,
  style,
  ...a11y
}: {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
} & A11yProps) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      {...a11y}
      onPressIn={() => {
        scale.set(withSpring(0.96, { damping: 15, stiffness: 220 }));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, { damping: 12, stiffness: 180 }));
      }}
    >
      <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
    </Pressable>
  );
};
