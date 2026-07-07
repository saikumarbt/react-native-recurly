import { resolveSubscriptionIcon } from "@/constants/icons";
import "@/global.css";
import clsx from "clsx";
import dayjs from "dayjs";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

const FREQUENCIES = ["Monthly", "Yearly"] as const;
type Frequency = (typeof FREQUENCIES)[number];

const CATEGORIES = [
  "Entertainment",
  "AI Tools",
  "Developer Tools",
  "Design",
  "Productivity",
  "Cloud",
  "Music",
  "Other",
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Entertainment: "#f5c542",
  "AI Tools": "#b8d4e3",
  "Developer Tools": "#e8def8",
  Design: "#f7c8d0",
  Productivity: "#b8e8d0",
  Cloud: "#c8d8f0",
  Music: "#f5d5b8",
  Other: "#e5e0d0",
};

const DEFAULT_COLOR = "#e8def8";

const CreateSubscriptionModal = ({
  visible,
  onClose,
  onCreate,
}: CreateSubscriptionModalProps) => {
  const posthog = usePostHog();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("Monthly");
  const [category, setCategory] = useState<string | null>(null);

  const trimmedName = name.trim();
  const parsedPrice = parseFloat(price);
  const isValid =
    trimmedName.length > 0 && !Number.isNaN(parsedPrice) && parsedPrice > 0;

  const trimmedPaymentMethod = paymentMethod.trim();

  const resetForm = () => {
    setName("");
    setPrice("");
    setPaymentMethod("");
    setFrequency("Monthly");
    setCategory(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    if (!isValid) {
      return;
    }

    const startDate = dayjs();
    const renewalDate =
      frequency === "Yearly"
        ? startDate.add(1, "year")
        : startDate.add(1, "month");

    const subscription: Subscription = {
      id: `${trimmedName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      icon: resolveSubscriptionIcon(trimmedName),
      name: trimmedName,
      price: parsedPrice,
      currency: "USD",
      frequency,
      billing: frequency,
      category: category ?? undefined,
      paymentMethod: trimmedPaymentMethod || undefined,
      status: "active",
      startDate: startDate.toISOString(),
      renewalDate: renewalDate.toISOString(),
      color: category ? CATEGORY_COLORS[category] : DEFAULT_COLOR,
    };

    posthog.capture("subscription_created", {
      subscription_id: subscription.id,
      name: trimmedName,
      price: parsedPrice,
      currency: "USD",
      frequency,
      category: category ?? "Uncategorized",
    });

    onCreate(subscription);
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View className="modal-overlay">
          <View className="modal-container">
            <View className="modal-header">
              <Text className="modal-title">New Subscription</Text>
              <Pressable className="modal-close" onPress={handleClose}>
                <Text className="modal-close-text">×</Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerClassName="modal-body"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View className="auth-field">
                <Text className="auth-label">Name</Text>
                <TextInput
                  className="auth-input"
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Netflix"
                  placeholderTextColor="#666666"
                  autoCapitalize="words"
                />
              </View>

              <View className="auth-field">
                <Text className="auth-label">Price</Text>
                <TextInput
                  className="auth-input"
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0.00"
                  placeholderTextColor="#666666"
                  keyboardType="decimal-pad"
                />
              </View>

              <View className="auth-field">
                <Text className="auth-label">Payment</Text>
                <TextInput
                  className="auth-input"
                  value={paymentMethod}
                  onChangeText={setPaymentMethod}
                  placeholder="e.g. Visa ending in 4242"
                  placeholderTextColor="#666666"
                  autoCapitalize="words"
                />
              </View>

              <View className="auth-field">
                <Text className="auth-label">Frequency</Text>
                <View className="picker-row">
                  {FREQUENCIES.map((option) => {
                    const active = frequency === option;
                    return (
                      <Pressable
                        key={option}
                        className={clsx(
                          "picker-option",
                          active && "picker-option-active",
                        )}
                        onPress={() => setFrequency(option)}
                      >
                        <Text
                          className={clsx(
                            "picker-option-text",
                            active && "picker-option-text-active",
                          )}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View className="auth-field">
                <Text className="auth-label">Category</Text>
                <View className="category-scroll">
                  {CATEGORIES.map((option) => {
                    const active = category === option;
                    return (
                      <Pressable
                        key={option}
                        className={clsx(
                          "category-chip",
                          active && "category-chip-active",
                        )}
                        onPress={() =>
                          setCategory((current) =>
                            current === option ? null : option,
                          )
                        }
                      >
                        <Text
                          className={clsx(
                            "category-chip-text",
                            active && "category-chip-text-active",
                          )}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Pressable
                className={clsx("auth-button", !isValid && "auth-button-disabled")}
                onPress={handleSubmit}
                disabled={!isValid}
              >
                <Text className="auth-button-text">Add Subscription</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default CreateSubscriptionModal;
