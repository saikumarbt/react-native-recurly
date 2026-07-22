import { useTheme } from "@/context/ThemeContext";
import { useEffect } from "react";
import { AccessibilityInfo, StyleSheet, Text } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/**
 * The myrev launch moment: after the native splash hides (fonts ready), the
 * mark springs in, the wordmark + tagline fade up, a brief hold, then the whole
 * overlay fades out to reveal the app — a single signature beat, in-house
 * Reanimated (no animation library). Honours reduce-motion.
 */
const AnimatedSplash = ({ onFinish }: { onFinish: () => void }) => {
  const { palette } = useTheme();
  const cover = useSharedValue(1);
  const markScale = useSharedValue(0.62);
  const markOpacity = useSharedValue(0);
  const wordOpacity = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      if (reduced) {
        // No motion: a short, plain hold then reveal.
        markOpacity.value = 1;
        markScale.value = 1;
        wordOpacity.value = 1;
        cover.value = withDelay(
          600,
          withTiming(0, { duration: 250 }, (done) => {
            if (done) runOnJS(onFinish)();
          }),
        );
        return;
      }
      markOpacity.value = withTiming(1, { duration: 380 });
      markScale.value = withSpring(1, { damping: 12, stiffness: 140 });
      wordOpacity.value = withDelay(280, withTiming(1, { duration: 380 }));
      cover.value = withDelay(
        1350,
        withTiming(0, { duration: 460 }, (done) => {
          if (done) runOnJS(onFinish)();
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [cover, markOpacity, markScale, wordOpacity, onFinish]);

  const coverStyle = useAnimatedStyle(() => ({ opacity: cover.value }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ scale: markScale.value }],
  }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: wordOpacity.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: palette.background,
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
        },
        coverStyle,
      ]}
    >
      <Animated.View
        style={[
          {
            width: 88,
            height: 88,
            borderRadius: 26,
            backgroundColor: palette.accent,
            alignItems: "center",
            justifyContent: "center",
          },
          markStyle,
        ]}
      >
        <Text
          style={{ color: palette.onAccent, fontFamily: "display-black", fontSize: 44 }}
        >
          m
        </Text>
      </Animated.View>
      <Animated.View style={[{ alignItems: "center", marginTop: 18 }, wordStyle]}>
        <Text
          style={{
            fontFamily: "display-semibold",
            fontSize: 26,
            color: palette.foreground,
          }}
        >
          myrev
        </Text>
        <Text
          style={{
            fontFamily: "sans-bold",
            fontSize: 11,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: palette.mutedForeground,
            marginTop: 5,
          }}
        >
          know what renews
        </Text>
      </Animated.View>
    </Animated.View>
  );
};

export default AnimatedSplash;
