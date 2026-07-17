import { useMemo } from "react";
import { Dimensions, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

/**
 * In-house confetti — a short burst of falling, spinning pieces driven by
 * Reanimated. No new animation library (per the animation-stack decision):
 * plain Animated.Views with per-piece shared values. Purely decorative, so it
 * self-silences and needs no interaction. Mint-forward palette to match the
 * "celebrate not spending" money-accent.
 */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const COLORS = ["#4ADE9C", "#7DA7F4", "#F4B860", "#EA7A53", "#F2F5FA"];

type Piece = {
  x: number;
  size: number;
  color: string;
  delay: number;
  drift: number;
  spins: number;
  radius: number;
};

const buildPieces = (count: number): Piece[] =>
  Array.from({ length: count }, () => {
    const size = 7 + Math.random() * 7;
    return {
      x: Math.random() * SCREEN_W,
      size,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 400,
      drift: (Math.random() - 0.5) * 120,
      spins: 1 + Math.random() * 2,
      // Mix of confetti squares and round dots.
      radius: Math.random() > 0.5 ? size / 2 : 2,
    };
  });

const ConfettiPiece = ({ piece, duration }: { piece: Piece; duration: number }) => {
  const progress = useSharedValue(0);
  progress.value = withDelay(
    piece.delay,
    withTiming(1, { duration, easing: Easing.out(Easing.quad) }),
  );

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [
        { translateY: interpolate(p, [0, 1], [-40, SCREEN_H + 40]) },
        { translateX: interpolate(p, [0, 1], [0, piece.drift]) },
        { rotate: `${p * 360 * piece.spins}deg` },
      ],
      // Fade out over the last third of the fall.
      opacity: interpolate(p, [0, 0.7, 1], [1, 1, 0]),
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          left: piece.x,
          width: piece.size,
          height: piece.size,
          borderRadius: piece.radius,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  );
};

const Confetti = ({
  count = 44,
  duration = 2200,
}: {
  count?: number;
  duration?: number;
}) => {
  const pieces = useMemo(() => buildPieces(count), [count]);
  return (
    <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
      {pieces.map((piece, i) => (
        <ConfettiPiece key={i} piece={piece} duration={duration} />
      ))}
    </View>
  );
};

export default Confetti;
