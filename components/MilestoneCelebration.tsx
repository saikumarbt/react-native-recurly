import AnimatedCounter from "@/components/AnimatedCounter";
import Confetti from "@/components/Confetti";
import { FadeInUp, PressableScale } from "@/components/motion";
import { useTheme } from "@/context/ThemeContext";
import { success } from "@/lib/haptics";
import { useEffect } from "react";
import { Modal, Text, View } from "react-native";

interface MilestoneCelebrationProps {
  visible: boolean;
  /** The milestone amount reached (annualised savings). */
  amount: number;
  currency: string;
  onClose: () => void;
}

/**
 * A retention beat: when the user's cancelled-subscription savings cross a
 * milestone, celebrate it. Fully theme-aware (palette tokens, on-accent button
 * text) so it reads in light and dark; mint = money-positive, on-thesis.
 */
const MilestoneCelebration = ({
  visible,
  amount,
  currency,
  onClose,
}: MilestoneCelebrationProps) => {
  const { palette } = useTheme();

  useEffect(() => {
    if (visible) success();
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        {visible ? <Confetti /> : null}
        <FadeInUp>
          <View
            style={{
              width: "100%",
              maxWidth: 340,
              borderRadius: 28,
              backgroundColor: palette.card,
              borderWidth: 1,
              borderColor: palette.border,
              padding: 32,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 44 }}>🎉</Text>
            <Text
              style={{
                fontFamily: "sans-bold",
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: palette.success,
                marginTop: 14,
              }}
            >
              Milestone
            </Text>
            <AnimatedCounter
              value={amount}
              currency={currency}
              duration={900}
              style={{
                fontFamily: "display-black",
                fontSize: 46,
                color: palette.success,
                marginTop: 4,
              }}
            />
            <Text
              style={{
                fontFamily: "sans-medium",
                fontSize: 14,
                color: palette.mutedForeground,
                textAlign: "center",
                marginTop: 10,
                lineHeight: 20,
              }}
            >
              saved a year by cancelling subscriptions you don&apos;t need.
              Keep it up 💪
            </Text>
            <PressableScale onPress={onClose}>
              <View
                style={{
                  marginTop: 22,
                  backgroundColor: palette.accent,
                  borderRadius: 16,
                  paddingVertical: 14,
                  paddingHorizontal: 40,
                }}
              >
                <Text
                  style={{
                    color: palette.onAccent,
                    fontFamily: "sans-bold",
                    fontSize: 15,
                  }}
                >
                  Keep going
                </Text>
              </View>
            </PressableScale>
          </View>
        </FadeInUp>
      </View>
    </Modal>
  );
};

export default MilestoneCelebration;
