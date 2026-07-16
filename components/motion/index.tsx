import type { ReactNode } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
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
export const PressableScale = ({
  children,
  onPress,
  disabled,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
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
