import "@/global.css";
import { success } from "@/lib/haptics";
import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

interface CelebrationOverlayProps {
  title: string;
  subtitle?: string;
  /** Called once the celebration finishes (advance to Home). */
  onDone: () => void;
}

// A handful of dots that burst outward from the checkmark — DIY confetti, no
// asset files. Offsets are the final translation; colors are theme tokens.
const CONFETTI = [
  { x: -84, y: -48, color: "#ea7a53" },
  { x: 88, y: -56, color: "#16a34a" },
  { x: -64, y: 64, color: "#081126" },
  { x: 74, y: 56, color: "#ea7a53" },
  { x: 4, y: -96, color: "#16a34a" },
  { x: 14, y: 92, color: "#ea7a53" },
];

/**
 * Full-screen success moment: an SVG checkmark springs in, confetti bursts, a
 * short line fades up, and a success haptic fires. Auto-advances via onDone.
 * Pure react-native-svg + Animated — no animation library / asset files.
 */
const CelebrationOverlay = ({
  title,
  subtitle,
  onDone,
}: CelebrationOverlayProps) => {
  const scale = useRef(new Animated.Value(0)).current;
  const copyOpacity = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    success();
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(burst, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(copyOpacity, {
          toValue: 1,
          duration: 320,
          delay: 140,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1000),
    ]).start(() => onDone());
  }, [scale, copyOpacity, burst, onDone]);

  return (
    <View className="celebrate-overlay">
      <View className="items-center justify-center">
        {CONFETTI.map((dot, i) => (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              height: 12,
              width: 12,
              borderRadius: 6,
              backgroundColor: dot.color,
              opacity: burst.interpolate({
                inputRange: [0, 0.7, 1],
                outputRange: [0, 1, 0],
              }),
              transform: [
                {
                  translateX: burst.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, dot.x],
                  }),
                },
                {
                  translateY: burst.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, dot.y],
                  }),
                },
                { scale: burst },
              ],
            }}
          />
        ))}
        <Animated.View style={{ transform: [{ scale }] }}>
          <Svg width={112} height={112} viewBox="0 0 96 96">
            <Circle cx={48} cy={48} r={48} fill="#16a34a" />
            <Path
              d="M27 49 L42 64 L69 32"
              stroke="#fff9e3"
              strokeWidth={9}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Animated.View>
      </View>
      <Animated.View style={{ opacity: copyOpacity }}>
        <View className="items-center gap-2">
          <Text className="celebrate-title">{title}</Text>
          {subtitle ? (
            <Text className="celebrate-subtitle">{subtitle}</Text>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
};

export default CelebrationOverlay;
