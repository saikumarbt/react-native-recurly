import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

/**
 * A small dot that gently pulses (scale + opacity) to draw attention to an
 * item that needs action — e.g. a subscription whose renewal date is still
 * assumed. Inline styles only (NativeWind clobbers className on Animated.View).
 */
const PulsingDot = ({
  size = 8,
  color = "#E0952F",
}: {
  size?: number;
  color?: string;
}) => {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [p]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.5 + p.value * 0.5,
    transform: [{ scale: 0.85 + p.value * 0.35 }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
};

export default PulsingDot;
