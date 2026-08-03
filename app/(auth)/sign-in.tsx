import BackButton from "@/components/BackButton";
import { useTheme } from "@/context/ThemeContext";
import { useSignIn } from "@clerk/expo";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { styled } from "nativewind";
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

export default function SignIn() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const { palette } = useTheme();
  const router = useRouter();
  // Optional post-auth destination (e.g. the paywall resuming a trial). Falls
  // back to the app root for a plain sign-in.
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const destination = (returnTo ?? "/") as Parameters<typeof router.replace>[0];

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);

  const handleSubmit = async () => {
    setFormError(null);
    const { error } = await signIn.password({
      emailAddress,
      password,
    });
    if (error) {
      // Expected states (wrong password, no such account) — show a friendly
      // message instead of throwing a dev error overlay.
      const first = (
        error as {
          errors?: { code?: string; message?: string; longMessage?: string }[];
        } | null
      )?.errors?.[0];
      if (first?.code === "form_identifier_not_found") {
        setFormError(
          "We couldn't find an account with that email. Sign up below to get started.",
        );
      } else if (first?.code === "form_password_incorrect") {
        setFormError("That password doesn't look right. Please try again.");
      } else {
        setFormError(
          first?.longMessage ||
            first?.message ||
            "Something went wrong signing in. Please try again.",
        );
      }
      return;
    }

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            console.log(session?.currentTask);
            return;
          }
          router.replace(destination);
        },
      });
    } else if (signIn.status === "needs_client_trust") {
      const emailCodeFactor = signIn.supportedSecondFactors.find(
        (factor) => factor.strategy === "email_code",
      );

      if (emailCodeFactor) {
        await signIn.mfa.sendEmailCode();
      }
    }
  };

  const handleVerify = async () => {
    await signIn.mfa.verifyEmailCode({ code });

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            console.log(session?.currentTask);
            return;
          }
          router.replace(destination);
        },
      });
    }
  };

  if (signIn.status === "needs_client_trust") {
    return (
      <SafeAreaView className="auth-screen">
        <View className="auth-content">
          <BackButton />
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
                  placeholderTextColor={palette.mutedForeground}
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
            <BackButton />
            <View className="auth-brand-block">
              <View className="auth-logo-wrap">
                <View className="auth-logo-mark">
                  <Text className="auth-logo-mark-text">m</Text>
                </View>
                <View>
                  <Text className="auth-wordmark">myrev</Text>
                  <Text className="auth-wordmark-sub">know what renews</Text>
                </View>
              </View>

              <Text className="auth-title">Welcome back</Text>
              <Text className="auth-subtitle">
                Sign in to manage your subscriptions
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
                    placeholderTextColor={palette.mutedForeground}
                    onChangeText={(emailAddress) =>
                      setEmailAddress(emailAddress)
                    }
                    keyboardType="email-address"
                  />
                </View>

                <View className="auth-field">
                  <Text className="auth-label">Password</Text>
                  <TextInput
                    className="auth-input"
                    value={password}
                    placeholder="Enter password"
                    placeholderTextColor={palette.mutedForeground}
                    secureTextEntry={true}
                    onChangeText={(password) => setPassword(password)}
                  />
                </View>

                {formError && (
                  <Text className="auth-error">{formError}</Text>
                )}

                <Pressable
                  className={`auth-button ${!emailAddress || !password || fetchStatus === "fetching" ? "auth-button-disabled" : ""}`}
                  onPress={handleSubmit}
                  disabled={
                    !emailAddress || !password || fetchStatus === "fetching"
                  }
                >
                  <Text className="auth-button-text">Sign in</Text>
                </Pressable>
              </View>
            </View>

            <View className="auth-link-row">
              <Text className="auth-link-copy">Don&apos;t have an account?</Text>
              <Link
                href={{
                  pathname: "/(auth)/sign-up",
                  params: returnTo ? { returnTo } : {},
                }}
              >
                <Text className="auth-link">Sign up</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
