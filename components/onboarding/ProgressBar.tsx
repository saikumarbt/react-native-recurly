import "@/global.css";
import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";

/**
 * Mockup-style onboarding progress: a filled track that animates forward as the
 * user advances, with an "n / N" count. Width animates on the JS thread but it's
 * a single short tween per step, so cost is trivial.
 */
const ProgressBar = ({ count, index }: { count: number; index: number }) => {
  const fraction = Math.min(1, Math.max(0, (index + 1) / count));
  const anim = useRef(new Animated.Value(fraction)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: fraction,
      duration: 320,
      useNativeDriver: false,
    }).start();
  }, [fraction, anim]);

  return (
    <View className="progress-row">
      <View className="progress-track">
        <Animated.View
          className="progress-fill"
          style={{
            width: anim.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
            }),
          }}
        />
      </View>
      <Text className="progress-count">
        {index + 1}/{count}
      </Text>
    </View>
  );
};

export default ProgressBar;
