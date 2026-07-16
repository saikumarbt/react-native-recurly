import "@/global.css";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

/**
 * The branded "guide" presence: a circular brand mark + a speech bubble with a
 * single short line. Re-keyed by `text` so it springs in fresh on each step.
 * No className on the Animated.View (NativeWind clobbers it) — styling lives on
 * the inner Views. Restyled later with the Midnight Ledger rebrand.
 */
const GuideBubble = ({ text }: { text: string }) => (
  <Animated.View key={text} entering={FadeInDown.springify().damping(15).mass(0.6)}>
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

export default GuideBubble;
