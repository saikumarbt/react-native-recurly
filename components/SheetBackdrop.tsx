import type { ThemeName } from "@/constants/theme";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";

/**
 * Frosted-glass backdrop for bottom sheets: a BlurView over the app plus a
 * light dim for contrast. Sits behind the sheet's dismiss Pressable, so it
 * never intercepts touches. Android's blur is weaker, so it leans on a slightly
 * heavier dim there.
 */
const SheetBackdrop = ({ scheme }: { scheme: ThemeName }) => {
  const dark = scheme === "dark";
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <BlurView
        intensity={Platform.OS === "android" ? 50 : 24}
        tint={dark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: dark
              ? "rgba(0,0,0,0.38)"
              : "rgba(15,13,26,0.22)",
          },
        ]}
      />
    </View>
  );
};

export default SheetBackdrop;
