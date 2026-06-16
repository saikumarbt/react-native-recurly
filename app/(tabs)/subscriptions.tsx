import { styled } from "nativewind";
import { Text } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView) as any;

const subscriptions = () => {
  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <Text>subscriptions</Text>
    </SafeAreaView>
  );
};
export default subscriptions;
