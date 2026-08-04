import { styled } from "nativewind";
import { type ComponentProps } from "react";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

// nativewind's styled() drops the `className` prop from its inferred types,
// which is why screens tended to cast it `as any`. Expose it once, typed to the
// underlying component's own props plus `className`, and reuse everywhere.
export const SafeAreaView = styled(RNSafeAreaView) as React.FC<
  ComponentProps<typeof RNSafeAreaView> & { className?: string }
>;
