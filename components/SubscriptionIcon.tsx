import { getIconVisual } from "@/lib/brand";
import { Text, View } from "react-native";
import { SvgXml } from "react-native-svg";

interface SubscriptionIconProps {
  name: string;
  /** Tile size in px (square). Defaults to 64 (matches list cards). */
  size?: number;
}

/**
 * Unified subscription icon: a consistent rounded tile whose panel color varies
 * by brand. Renders the brand's vector logo when known, otherwise a colored
 * first-letter monogram — so every subscription gets a clean, on-style icon.
 */
const SubscriptionIcon = ({ name, size = 64 }: SubscriptionIconProps) => {
  const { background, glyph, svg, monogram } = getIconVisual(name);
  const radius = Math.round(size * 0.25);
  const glyphSize = Math.round(size * 0.56);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {svg ? (
        <SvgXml xml={svg} width={glyphSize} height={glyphSize} color={glyph} />
      ) : (
        <Text
          style={{
            color: glyph,
            fontSize: Math.round(size * 0.42),
            fontFamily: "sans-bold",
          }}
        >
          {monogram}
        </Text>
      )}
    </View>
  );
};

export default SubscriptionIcon;
