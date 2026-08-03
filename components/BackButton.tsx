import { icons } from "@/constants/icons";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import { Image, Pressable } from "react-native";

/**
 * The one back control, used on every non-tab screen. A 44×44 circular target
 * (iOS/Android minimum) with hit-slop, a chevron glyph, and a screen-reader
 * label. Defaults to popping the stack, falling back to Home when there's
 * nothing to pop (e.g. cold-start deep link) so it never dead-ends.
 */
const BackButton = ({
  onPress,
  label = "Go back",
}: {
  onPress?: () => void;
  label?: string;
}) => {
  const router = useRouter();
  const { palette } = useTheme();
  const handlePress =
    onPress ?? (() => (router.canGoBack() ? router.back() : router.replace("/")));

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="size-11 items-center justify-center rounded-full active:opacity-60"
    >
      <Image
        source={icons.back}
        resizeMode="contain"
        tintColor={palette.foreground}
        className="size-6"
      />
    </Pressable>
  );
};

export default BackButton;
