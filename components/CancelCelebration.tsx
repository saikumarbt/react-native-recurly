import AnimatedCounter from "@/components/AnimatedCounter";
import Confetti from "@/components/Confetti";
import { FadeInUp, PressableScale } from "@/components/motion";
import { success } from "@/lib/haptics";
import { formatCurrency } from "@/lib/utils";
import * as Sharing from "expo-sharing";
import { useEffect, useRef } from "react";
import { Modal, Share, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";

const MINT = "#4ADE9C";
const INK = "#0A0E1A";
const SURFACE = "#131A2E";
const TEXT = "#F2F5FA";
const TEXT_DIM = "rgba(242,245,250,0.62)";

export interface CancelCelebrationProps {
  visible: boolean;
  /** Name of the subscription that was cancelled. */
  name: string;
  /** Monthly-equivalent amount the user no longer pays. */
  monthlySaved: number;
  currency: string;
  onClose: () => void;
}

/**
 * The emotional payoff of cancelling: we celebrate NOT spending (the one thing
 * every competitor forgets to do). A mint confetti burst + count-up of what the
 * user just saved, and a self-contained share card — the viral loop from the
 * plan ("every cancelled subscription is a shareable stat"). The card is a
 * plain, inline-styled View so `captureRef` renders it identically off-screen.
 */
const CancelCelebration = ({
  visible,
  name,
  monthlySaved,
  currency,
  onClose,
}: CancelCelebrationProps) => {
  const cardRef = useRef<View>(null);
  const yearlySaved = monthlySaved * 12;

  useEffect(() => {
    if (visible) success();
  }, [visible]);

  const handleShare = async () => {
    try {
      const uri = await captureRef(cardRef, { format: "png", quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Share your savings",
        });
      } else {
        // Fallback for platforms without the native share sheet.
        await Share.share({
          message: `I just cancelled ${name} and I'm saving ${formatCurrency(
            yearlySaved,
            currency,
          )}/yr. Tracked with Recurrly.`,
        });
      }
    } catch {
      // User dismissed the sheet or capture failed — nothing to recover.
    }
  };

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
          backgroundColor: "rgba(10,14,26,0.72)",
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
              maxWidth: 360,
              alignItems: "center",
            }}
          >
            {/* The shareable card (also the on-screen centerpiece). */}
            <View
              ref={cardRef}
              collapsable={false}
              style={{
                width: "100%",
                borderRadius: 28,
                backgroundColor: SURFACE,
                paddingVertical: 36,
                paddingHorizontal: 28,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "rgba(74,222,156,0.35)",
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: MINT,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 18,
                }}
              >
                <Text
                  style={{ fontSize: 34, color: INK, fontFamily: "sans-extrabold" }}
                >
                  ✓
                </Text>
              </View>

              <Text
                style={{
                  color: TEXT_DIM,
                  fontSize: 13,
                  fontFamily: "sans-semibold",
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                }}
              >
                You just saved
              </Text>

              <AnimatedCounter
                value={yearlySaved}
                currency={currency}
                duration={900}
                style={{
                  color: MINT,
                  fontSize: 44,
                  fontFamily: "sans-extrabold",
                  marginTop: 6,
                }}
              />
              <Text
                style={{
                  color: TEXT,
                  fontSize: 15,
                  fontFamily: "sans-semibold",
                  marginTop: 2,
                }}
              >
                a year
              </Text>

              <Text
                style={{
                  color: TEXT_DIM,
                  fontSize: 14,
                  fontFamily: "sans-medium",
                  marginTop: 14,
                  textAlign: "center",
                }}
              >
                by cancelling {name} ·{" "}
                {formatCurrency(monthlySaved, currency)}/mo
              </Text>

              <Text
                style={{
                  color: MINT,
                  fontSize: 13,
                  fontFamily: "sans-bold",
                  letterSpacing: 1,
                  marginTop: 20,
                }}
              >
                RECURRLY
              </Text>
            </View>

            {/* Actions (outside the captured card). */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
              <PressableScale onPress={handleShare}>
                <View
                  style={{
                    backgroundColor: MINT,
                    borderRadius: 16,
                    paddingVertical: 14,
                    paddingHorizontal: 28,
                  }}
                >
                  <Text
                    style={{
                      color: INK,
                      fontSize: 15,
                      fontFamily: "sans-bold",
                    }}
                  >
                    Share
                  </Text>
                </View>
              </PressableScale>
              <PressableScale onPress={onClose}>
                <View
                  style={{
                    borderRadius: 16,
                    paddingVertical: 14,
                    paddingHorizontal: 28,
                    borderWidth: 1,
                    borderColor: "rgba(242,245,250,0.25)",
                  }}
                >
                  <Text
                    style={{
                      color: TEXT,
                      fontSize: 15,
                      fontFamily: "sans-semibold",
                    }}
                  >
                    Done
                  </Text>
                </View>
              </PressableScale>
            </View>
          </View>
        </FadeInUp>
      </View>
    </Modal>
  );
};

export default CancelCelebration;
