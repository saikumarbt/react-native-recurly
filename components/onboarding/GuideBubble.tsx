import "@/global.css";
import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";

/**
 * The branded "guide" presence: a circular brand mark + a speech bubble with a
 * single short line. Fades/slides in whenever the line changes, so each step of
 * onboarding feels like the guide speaking. No mascot art — restyled later with
 * the Midnight Ledger rebrand.
 *
 * Styling lives on inner Views; the Animated.View only carries the transform
 * (NativeWind v5-preview doesn't reliably apply className to Animated.View).
 */
const GuideBubble = ({ text }: { text: string }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(8);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [text, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <View className="flex-row items-start gap-3">
        <View className="guide-avatar">
          <Text className="guide-avatar-text">R</Text>
        </View>
        <View className="guide-bubble">
          <Text className="guide-bubble-text">{text}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

export default GuideBubble;
