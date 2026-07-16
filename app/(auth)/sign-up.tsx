import { useSignUp } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import { styled } from "nativewind";
import { usePostHog } from "posthog-react-native";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView) as any;

export default function SignUp() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();
  const posthog = usePostHog();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");

  const handleSubmit = async () => {
    const { error } = await signUp.password({
      emailAddress,
      password,
    });
    if (error) {
      console.error(JSON.stringify(error, null, 2));
      return;
    }

    if (!error) await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    await signUp.verifications.verifyEmailCode({
      code,
    });

    if (signUp.status === "complete") {
      posthog.capture("user_signed_up");
      await signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            console.log(session?.currentTask);
            return;
          }
          router.replace("/");
        },
      });
    } else {
      console.error("Sign-up attempt not complete:", signUp);
    }
  };

  if (
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0
  ) {
    return (
      <SafeAreaView className="auth-screen">
        <View className="auth-content">
          <Text className="auth-title">Verify your account</Text>
          <Text className="auth-subtitle">
            Enter the code sent to your email.
          </Text>

          <View className="auth-card">
            <View className="auth-form">
              <View className="auth-field">
                <Text className="auth-label">Verification Code</Text>
                <TextInput
                  className="auth-input"
                  value={code}
                  placeholder="Enter your verification code"
                  placeholderTextColor="#666666"
                  onChangeText={(code) => setCode(code)}
                  keyboardType="numeric"
                />
                {errors?.fields?.code && (
                  <Text className="auth-error">
                    {errors.fields.code.message}
                  </Text>
                )}
              </View>

              <Pressable
                className={`auth-button ${fetchStatus === "fetching" ? "auth-button-disabled" : ""}`}
                onPress={handleVerify}
                disabled={fetchStatus === "fetching"}
              >
                <Text className="auth-button-text">Verify</Text>
              </Pressable>

              <Pressable
                className="auth-secondary-button mt-4"
                onPress={() => signUp.verifications.sendEmailCode()}
              >
                <Text className="auth-secondary-button-text">
                  I need a new code
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="auth-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView className="auth-scroll">
          <View className="auth-content">
            <Pressable
              className="mb-2 flex-row items-center gap-1 self-start py-2"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/")
              }
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back to app"
            >
              <Text className="text-2xl font-sans-medium text-muted-foreground">
                ‹
              </Text>
              <Text className="text-sm font-sans-semibold text-muted-foreground">
                Back
              </Text>
            </Pressable>
            <View className="auth-brand-block">
              <View className="auth-logo-wrap">
                <View className="auth-logo-mark">
                  <Text className="auth-logo-mark-text">R</Text>
                </View>
                <View>
                  <Text className="auth-wordmark">Recurrly</Text>
                  <Text className="auth-wordmark-sub">SMART BILLING</Text>
                </View>
              </View>

              <Text className="auth-title">Create an account</Text>
              <Text className="auth-subtitle">
                Start tracking your subscriptions and never miss a payment.
              </Text>
            </View>
            <View className="auth-card">
              <View className="auth-form">
                <View className="auth-field">
                  <Text className="auth-label">Email address</Text>
                  <TextInput
                    className="auth-input"
                    autoCapitalize="none"
                    value={emailAddress}
                    placeholder="Enter email"
                    placeholderTextColor="#666666"
                    onChangeText={(emailAddress) =>
                      setEmailAddress(emailAddress)
                    }
                    keyboardType="email-address"
                  />
                  {errors?.fields?.emailAddress && (
                    <Text className="auth-error">
                      {errors.fields.emailAddress.message}
                    </Text>
                  )}
                </View>

                <View className="auth-field">
                  <Text className="auth-label">Password</Text>
                  <TextInput
                    className="auth-input"
                    value={password}
                    placeholder="Enter password"
                    placeholderTextColor="#666666"
                    secureTextEntry={true}
                    onChangeText={(password) => setPassword(password)}
                  />
                  {errors?.fields?.password && (
                    <Text className="auth-error">
                      {errors.fields.password.message}
                    </Text>
                  )}
                </View>

                <Pressable
                  className={`auth-button ${!emailAddress || !password || fetchStatus === "fetching" ? "auth-button-disabled" : ""}`}
                  onPress={handleSubmit}
                  disabled={
                    !emailAddress || !password || fetchStatus === "fetching"
                  }
                >
                  <Text className="auth-button-text">Sign up</Text>
                </Pressable>
              </View>
            </View>

            <View className="auth-link-row">
              <Text className="auth-link-copy">Already have an account?</Text>
              <Link href="/(auth)/sign-in">
                <Text className="auth-link">Sign in</Text>
              </Link>
            </View>

            {/* Required for sign-up flows. Clerk's bot sign-up protection is enabled by default */}
            <View nativeID="clerk-captcha" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
