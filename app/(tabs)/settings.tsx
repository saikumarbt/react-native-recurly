import PickerSheet, { type PickerItem } from "@/components/PickerSheet";
import { CURRENCY_CODES, currencyName } from "@/constants/currencies";
import { useCurrency } from "@/context/CurrencyContext";
import images from "@/constants/images";
import { getKv, setKv } from "@/db/subscriptionsRepo";
import { ANALYTICS_OPTOUT_KEY } from "@/lib/analytics";
import { useClerk, useUser } from "@clerk/expo";
import dayjs from "dayjs";
import { styled } from "nativewind";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { Image, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const CURRENCY_ITEMS: PickerItem[] = CURRENCY_CODES.map((code) => ({
  value: code,
  label: code,
  sublabel: currencyName(code),
}));

const SafeAreaView = styled(RNSafeAreaView) as any;
const Settings = () => {
  const { signOut } = useClerk();
  const { user } = useUser();
  const { baseCurrency, setBaseCurrency } = useCurrency();
  const posthog = usePostHog();
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(
    () => getKv(ANALYTICS_OPTOUT_KEY) !== "1",
  );

  const toggleAnalytics = (enabled: boolean) => {
    setAnalyticsEnabled(enabled);
    setKv(ANALYTICS_OPTOUT_KEY, enabled ? "0" : "1");
    if (enabled) {
      posthog.optIn();
    } else {
      posthog.optOut();
    }
  };

  const displayName = user?.firstName || user?.fullName || user?.emailAddresses[0]?.emailAddress?.split("@")[0] || "User";
  const email = user?.emailAddresses[0]?.emailAddress || "No email";
  const memberSince = user?.createdAt ? dayjs(user.createdAt).format("MMMM D, YYYY") : "Recently";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="p-5 pb-30 flex-grow">
        <View className="list-head">
          <Text className="list-title">Settings</Text>
        </View>

        <View className="sub-card mt-2 mb-4 bg-card">
          <View className="flex-row items-center gap-4">
            <Image
              source={{ uri: user?.imageUrl || Image.resolveAssetSource(images.avatar).uri }}
              className="size-16 rounded-full"
            />
            <View className="flex-1">
              <Text className="text-xl font-sans-bold text-primary">{displayName}</Text>
              <Text className="text-sm font-sans-medium text-muted-foreground mt-1">{email}</Text>
            </View>
          </View>
        </View>

        <View className="sub-card bg-card">
          <Text className="text-lg font-sans-bold text-primary mb-4">Account Information</Text>
          
          <View className="flex-row items-center justify-between py-2 border-b border-border/50">
            <Text className="text-sm font-sans-medium text-muted-foreground">Status</Text>
            <Text className="text-sm font-sans-bold text-success">Active</Text>
          </View>

          <View className="flex-row items-center justify-between py-2">
            <Text className="text-sm font-sans-medium text-muted-foreground">Member Since</Text>
            <Text className="text-sm font-sans-bold text-primary">{memberSince}</Text>
          </View>
        </View>

        <View className="sub-card bg-card mt-4">
          <Text className="text-lg font-sans-bold text-primary mb-4">
            Preferences
          </Text>
          <Pressable
            className="flex-row items-center justify-between py-2"
            onPress={() => setShowCurrencyPicker(true)}
          >
            <View>
              <Text className="text-sm font-sans-medium text-muted-foreground">
                Currency
              </Text>
              <Text className="text-xs font-sans-medium text-muted-foreground/70 mt-0.5">
                Used for every amount you enter
              </Text>
            </View>
            <Text className="text-sm font-sans-bold text-primary">
              {baseCurrency} · {currencyName(baseCurrency)} ▾
            </Text>
          </Pressable>

          <View className="flex-row items-center justify-between py-2 border-t border-border/50 mt-2 pt-4">
            <View className="flex-1 pr-3">
              <Text className="text-sm font-sans-medium text-muted-foreground">
                Share anonymous analytics
              </Text>
              <Text className="text-xs font-sans-medium text-muted-foreground/70 mt-0.5">
                Usage only — never your subscription names, amounts, or email.
              </Text>
            </View>
            <Switch value={analyticsEnabled} onValueChange={toggleAnalytics} />
          </View>
        </View>

        <View className="mt-10">
          <Pressable 
            onPress={() => signOut()}
            className="auth-button"
          >
            <Text className="auth-button-text">Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>

      <PickerSheet
        visible={showCurrencyPicker}
        title="Choose currency"
        items={CURRENCY_ITEMS}
        selected={baseCurrency}
        placeholder="Search currency"
        onSelect={setBaseCurrency}
        onClose={() => setShowCurrencyPicker(false)}
      />
    </SafeAreaView>
  );
};
export default Settings;
