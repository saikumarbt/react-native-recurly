import { formatCurrency } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, type TextProps } from "react-native";

interface AnimatedCounterProps extends TextProps {
  /** Target amount to count up to. */
  value: number;
  currency: string;
  /** Count-up duration in ms. */
  duration?: number;
}

/**
 * Renders a currency amount that animates from its previous value to the new
 * one (from 0 on first mount). Built on RN's Animated — no reanimated needed.
 */
const AnimatedCounter = ({
  value,
  currency,
  duration = 700,
  ...textProps
}: AnimatedCounterProps) => {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(v));
    const animation = Animated.timing(anim, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => {
      animation.stop();
      anim.removeListener(id);
    };
  }, [value, duration, anim]);

  return <Text {...textProps}>{formatCurrency(display, currency)}</Text>;
};

export default AnimatedCounter;
