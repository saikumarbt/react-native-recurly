import PickerSheet, { type PickerItem } from "@/components/PickerSheet";
import SubscriptionIcon from "@/components/SubscriptionIcon";
import { BRAND_ICONS } from "@/constants/brandIcons";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import "@/global.css";
import {
  BILLING_CYCLE_KEYS,
  getCycleLabel,
  resolveNextRenewal,
  type BillingCycle,
} from "@/lib/billing";
import { normalizeName } from "@/lib/duplicates";
import { formatSubscriptionDateTime } from "@/lib/utils";
import DateTimePicker from "@react-native-community/datetimepicker";
import clsx from "clsx";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

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

const BRAND_ITEMS: PickerItem[] = BRAND_ICONS.map((brand) => ({
  value: brand.title,
  label: brand.title,
  keywords: brand.keywords.join(" "),
}));

const SubscriptionFormModal = ({
  visible,
  onClose,
  onSubmit,
  subscription,
  highlightDate,
}: SubscriptionFormModalProps) => {
  const isEdit = !!subscription;
  const { subscriptions } = useSubscriptions();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [customDays, setCustomDays] = useState("30");
  const [category, setCategory] = useState<string | null>(null);
  const [isTrial, setIsTrial] = useState(false);
  const [trialDays, setTrialDays] = useState("7");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  // After a create, we keep the modal open on a success prompt so the user can
  // add another subscription in a row (bulk-add momentum).
  const [showAddedPrompt, setShowAddedPrompt] = useState(false);
  const [showDuplicatePrompt, setShowDuplicatePrompt] = useState(false);

  const resetForm = useCallback(() => {
    setName("");
    setPrice("");
    setPaymentMethod("");
    setBillingCycle("monthly");
    setCustomDays("30");
    setCategory(null);
    setIsTrial(false);
    setTrialDays("7");
    setStartDate(new Date());
  }, []);

  // Prefill when opening in edit mode (or reset when opening in create mode).
  useEffect(() => {
    if (!visible) return;
    setShowDatePicker(false);
    setShowAddedPrompt(false);
    setShowDuplicatePrompt(false);
    if (subscription) {
      setName(subscription.name);
      setPrice(String(subscription.price));
      setPaymentMethod(subscription.paymentMethod ?? "");
      setBillingCycle(subscription.billingCycle ?? "monthly");
      setCustomDays(String(subscription.customIntervalDays ?? 30));
      setCategory(subscription.category ?? null);
      setIsTrial(!!subscription.isTrial);
      setTrialDays(
        subscription.trialEndDate
          ? String(
              Math.max(
                1,
                dayjs(subscription.trialEndDate).diff(dayjs(), "day"),
              ),
            )
          : "7",
      );
      setStartDate(
        subscription.startDate ? new Date(subscription.startDate) : new Date(),
      );
    } else {
      resetForm();
    }
  }, [visible, subscription, resetForm]);

  const trimmedName = name.trim();
  const parsedPrice = parseFloat(price);
  const parsedCustomDays = parseInt(customDays, 10);
  const parsedTrialDays = parseInt(trialDays, 10);
  const customIntervalDays =
    billingCycle === "custom" ? parsedCustomDays : undefined;
  const isValid =
    trimmedName.length > 0 &&
    !Number.isNaN(parsedPrice) &&
    parsedPrice > 0 &&
    (billingCycle !== "custom" ||
      (!Number.isNaN(parsedCustomDays) && parsedCustomDays > 0)) &&
    (!isTrial || (!Number.isNaN(parsedTrialDays) && parsedTrialDays > 0));

  // Live preview of the derived next renewal, shown under the date field.
  const nextRenewalPreview = resolveNextRenewal(
    startDate.toISOString(),
    billingCycle,
    customIntervalDays,
  );

  const commit = (acknowledgeDuplicate = false) => {
    const startIso = startDate.toISOString();
    const nextRenewal = resolveNextRenewal(
      startIso,
      billingCycle,
      customIntervalDays,
    );

    const draft: SubscriptionDraft = {
      name: trimmedName,
      price: parsedPrice,
      paymentMethod: paymentMethod.trim() || undefined,
      billingCycle,
      customIntervalDays,
      category: category ?? undefined,
      status: subscription?.status ?? "active",
      startDate: startIso,
      renewalDate:
        nextRenewal?.toISOString() ?? dayjs().add(1, "month").toISOString(),
      // The user picked/confirmed the date here, so it's no longer an
      // assumption — clears any quick-add nudge flag.
      dateAssumed: false,
      // Re-anchor the renewal check-in to the confirmed first-payment date, so
      // charges due since then surface as "did it renew?".
      confirmedThrough: startIso,
      isTrial,
      trialEndDate: isTrial
        ? dayjs().add(parsedTrialDays, "day").toISOString()
        : undefined,
      color: category ? CATEGORY_COLORS[category] : DEFAULT_COLOR,
    };

    // "Add it anyway" past the duplicate warning = an explicit decision, so mark
    // it acknowledged (never re-flagged as a duplicate). Only set on that path
    // so normal adds/edits don't disturb an existing flag.
    if (acknowledgeDuplicate) {
      draft.duplicateAcknowledged = true;
    } else if (
      isEdit &&
      subscription &&
      normalizeName(subscription.name) !== normalizeName(trimmedName)
    ) {
      // A prior acknowledgement was granted for the old name. Renaming may
      // collide with a different sub, so clear it and let the new name be
      // re-evaluated for duplicates.
      draft.duplicateAcknowledged = false;
    }

    onSubmit(draft);
    // Edits close immediately; a new add offers "add another" to keep momentum.
    if (isEdit) {
      onClose();
    } else {
      setShowAddedPrompt(true);
    }
  };

  const handleSubmit = () => {
    if (!isValid) return;
    // Confirm BEFORE adding an accidental duplicate of an active sub — never
    // hard-block (some people legitimately track two of the same). Shown as an
    // in-modal step, not an OS Alert (Alert is unreliable over a RN Modal).
    if (!isEdit) {
      const duplicate = subscriptions.some(
        (s) =>
          s.status === "active" &&
          normalizeName(s.name) === normalizeName(trimmedName),
      );
      if (duplicate) {
        setShowDuplicatePrompt(true);
        return;
      }
    }
    commit();
  };

  const onDateChange = (event: { type: string }, selected?: Date) => {
    // Android's dialog is one-shot: close it here. iOS uses an inline spinner
    // that stays open until the user taps Done.
    if (Platform.OS !== "ios") setShowDatePicker(false);
    if (event.type !== "dismissed" && selected) setStartDate(selected);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View className="modal-overlay">
          {/* Tapping the dimmed area (incl. the exposed top strip) dismisses. */}
          <Pressable
            className="absolute inset-0"
            onPress={onClose}
            accessibilityLabel="Close"
          />
          <View className="modal-container">
            <View className="modal-header">
              <Text className="modal-title">
                {showDuplicatePrompt
                  ? "Already tracking this?"
                  : showAddedPrompt
                    ? "Subscription added"
                    : isEdit
                      ? "Edit Subscription"
                      : "New Subscription"}
              </Text>
              <Pressable className="modal-close" onPress={onClose}>
                <Text className="modal-close-text">×</Text>
              </Pressable>
            </View>

            {showDuplicatePrompt ? (
              <View className="modal-body items-center gap-2">
                <View className="my-2 size-16 items-center justify-center rounded-full bg-destructive/15">
                  <Text className="text-3xl font-sans-extrabold text-destructive">
                    !
                  </Text>
                </View>
                <Text className="text-center text-lg font-sans-bold text-primary">
                  You already track {trimmedName}
                </Text>
                <Text className="auth-helper text-center">
                  If this one&apos;s meant to be separate — a different plan or
                  account — rename it (e.g. “{trimmedName} – work”) so they&apos;re
                  easy to tell apart. Or add it anyway — we won&apos;t flag it
                  again.
                </Text>
                <Pressable
                  className="auth-button w-full"
                  onPress={() => setShowDuplicatePrompt(false)}
                >
                  <Text className="auth-button-text">Rename it</Text>
                </Pressable>
                <Pressable
                  className="items-center py-2"
                  onPress={() => {
                    setShowDuplicatePrompt(false);
                    commit(true);
                  }}
                >
                  <Text className="text-sm font-sans-semibold text-muted-foreground">
                    Add it anyway
                  </Text>
                </Pressable>
              </View>
            ) : showAddedPrompt ? (
              <View className="modal-body items-center">
                <View className="my-2 size-16 items-center justify-center rounded-full bg-success">
                  <Text className="text-3xl font-sans-extrabold text-background">
                    ✓
                  </Text>
                </View>
                <Text className="text-lg font-sans-bold text-primary">
                  Added to your list
                </Text>
                <Text className="auth-helper text-center">
                  Track another, or tap Done.
                </Text>
                <Pressable
                  className="auth-button w-full"
                  onPress={() => {
                    resetForm();
                    setShowAddedPrompt(false);
                  }}
                >
                  <Text className="auth-button-text">Add another</Text>
                </Pressable>
                <Pressable className="items-center py-2" onPress={onClose}>
                  <Text className="text-sm font-sans-semibold text-muted-foreground">
                    Done
                  </Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView
                contentContainerClassName="modal-body"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
              <View className="auth-field">
                <View className="flex-row items-center justify-between">
                  <Text className="auth-label">Name</Text>
                  <Pressable onPress={() => setShowBrandPicker(true)}>
                    <Text className="text-sm font-sans-semibold text-accent">
                      Browse brands
                    </Text>
                  </Pressable>
                </View>
                <View className="flex-row items-center gap-3">
                  {trimmedName ? <SubscriptionIcon name={trimmedName} size={44} /> : null}
                  <TextInput
                    className="auth-input flex-1"
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Netflix"
                    placeholderTextColor="#666666"
                    autoCapitalize="words"
                  />
                </View>
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
                <Text className="auth-label">Payment (optional)</Text>
                <TextInput
                  className="auth-input"
                  value={paymentMethod}
                  onChangeText={setPaymentMethod}
                  placeholder="e.g. Visa ending in 4242"
                  placeholderTextColor="#666666"
                  autoCapitalize="words"
                />
              </View>

              <View
                className="auth-field"
                style={
                  highlightDate
                    ? {
                        borderWidth: 1.5,
                        borderColor: "#E0952F",
                        borderRadius: 16,
                        padding: 12,
                        backgroundColor: "rgba(224,149,47,0.06)",
                      }
                    : undefined
                }
              >
                <Text className="auth-label">Started on</Text>
                {Platform.OS === "ios" ? (
                  // Compact themed pill: opens a popover and dismisses itself
                  // on selection. themeVariant keeps text dark on our light UI.
                  <View className="flex-row">
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display="compact"
                      themeVariant="light"
                      accentColor="#ea7a53"
                      maximumDate={new Date()}
                      onChange={onDateChange}
                    />
                  </View>
                ) : (
                  <>
                    <Pressable
                      className="auth-input"
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text className="text-base font-sans-medium text-primary">
                        {dayjs(startDate).format("MMM D, YYYY")}
                      </Text>
                    </Pressable>
                    {showDatePicker && (
                      <DateTimePicker
                        value={startDate}
                        mode="date"
                        display="default"
                        maximumDate={new Date()}
                        onChange={onDateChange}
                      />
                    )}
                  </>
                )}
                <Text
                  className="auth-helper"
                  style={highlightDate ? { color: "#E0952F" } : undefined}
                >
                  {highlightDate
                    ? "Set the real date this renews so your reminder is accurate."
                    : "When you first subscribed. We use it to work out your next renewal."}
                </Text>
              </View>

              <View className="auth-field">
                <Text className="auth-label">Billing cycle</Text>
                <View className="category-scroll">
                  {BILLING_CYCLE_KEYS.map((cycle) => {
                    const active = billingCycle === cycle;
                    return (
                      <Pressable
                        key={cycle}
                        className={clsx(
                          "category-chip",
                          active && "category-chip-active",
                        )}
                        onPress={() => setBillingCycle(cycle)}
                      >
                        <Text
                          className={clsx(
                            "category-chip-text",
                            active && "category-chip-text-active",
                          )}
                        >
                          {getCycleLabel(cycle)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {billingCycle === "custom" && (
                  <TextInput
                    className="auth-input"
                    value={customDays}
                    onChangeText={setCustomDays}
                    placeholder="Interval in days, e.g. 45"
                    placeholderTextColor="#666666"
                    keyboardType="number-pad"
                  />
                )}
                {nextRenewalPreview && (
                  <Text className="auth-helper">
                    Next renewal:{" "}
                    <Text className="font-sans-bold text-primary">
                      {formatSubscriptionDateTime(
                        nextRenewalPreview.toISOString(),
                      )}
                    </Text>
                  </Text>
                )}
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

              <View className="auth-field">
                <View className="flex-row items-center justify-between">
                  <Text className="auth-label">Free trial</Text>
                  <Switch value={isTrial} onValueChange={setIsTrial} />
                </View>
                {isTrial && (
                  <TextInput
                    className="auth-input"
                    value={trialDays}
                    onChangeText={setTrialDays}
                    placeholder="Days until trial ends, e.g. 7"
                    placeholderTextColor="#666666"
                    keyboardType="number-pad"
                  />
                )}
              </View>

              <Pressable
                className={clsx(
                  "auth-button",
                  !isValid && "auth-button-disabled",
                )}
                onPress={handleSubmit}
                disabled={!isValid}
              >
                <Text className="auth-button-text">
                  {isEdit ? "Save Changes" : "Add Subscription"}
                </Text>
              </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <PickerSheet
        visible={showBrandPicker}
        title="Choose brand"
        items={BRAND_ITEMS}
        selected={trimmedName}
        placeholder="Search brands"
        onSelect={setName}
        onClose={() => setShowBrandPicker(false)}
        renderLeading={(item) => <SubscriptionIcon name={item.value} size={36} />}
      />
    </Modal>
  );
};

export default SubscriptionFormModal;
