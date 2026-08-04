import SheetBackdrop from "@/components/SheetBackdrop";
import SubscriptionIcon from "@/components/SubscriptionIcon";
import { groupOnboardingBrands } from "@/constants/onboardingBrands";
import { useTheme } from "@/context/ThemeContext";
import "@/global.css";
import clsx from "clsx";
import { useMemo, useState } from "react";
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

interface BrandPickerSheetProps {
  visible: boolean;
  /** Currently-chosen brand title (highlighted), if any. */
  selected?: string;
  onSelect: (title: string) => void;
  onClose: () => void;
}

/**
 * The add-subscription "browse brands" picker — the same grouped-by-category,
 * searchable grid the onboarding picker uses, so brand selection looks and
 * behaves identically everywhere (single-select here). Reuses
 * groupOnboardingBrands for one source of truth on ordering/grouping.
 */
const BrandPickerSheet = ({
  visible,
  selected,
  onSelect,
  onClose,
}: BrandPickerSheetProps) => {
  const [query, setQuery] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null | undefined>(
    undefined,
  );
  const { varStyle, palette, scheme } = useTheme();
  const groups = useMemo(() => groupOnboardingBrands(query), [query]);
  const trimmedQuery = query.trim();
  // While searching, every group is force-expanded and headers are inert;
  // computed once (not per-category in the map below).
  const searching = trimmedQuery.length > 0;
  const effectiveOpen =
    openCategory === undefined ? groups[0]?.category : openCategory;
  const hasExactMatch = useMemo(() => {
    const q = trimmedQuery.toLowerCase();
    return groups.some((g) => g.brands.some((b) => b.title.toLowerCase() === q));
  }, [groups, trimmedQuery]);

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  const pick = (title: string) => {
    onSelect(title);
    handleClose();
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
        <View className="modal-overlay" style={varStyle}>
          <SheetBackdrop scheme={scheme} />
          <Pressable
            className="absolute inset-0"
            onPress={handleClose}
            accessibilityLabel="Close"
          />
          <View className="modal-container">
            <View className="sheet-handle" />
            <View className="modal-header">
              <Text className="modal-title">Choose subscription</Text>
              <Pressable className="modal-close" onPress={handleClose}>
                <Text className="modal-close-text">×</Text>
              </Pressable>
            </View>

            <View className="px-5 pt-4">
              <TextInput
                className="auth-input"
                value={query}
                onChangeText={setQuery}
                placeholder="Search subscriptions"
                placeholderTextColor={palette.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerClassName="gap-4 px-5 py-4"
            >
              {/* Add exactly what was typed — so a service not in the catalog is
                  never a dead end. Hidden when it already matches a brand below. */}
              {trimmedQuery.length > 0 && !hasExactMatch && (
                <Pressable
                  onPress={() => pick(trimmedQuery)}
                  className="flex-row items-center gap-3 rounded-2xl border border-accent bg-accent/10 p-4"
                >
                  <SubscriptionIcon name={trimmedQuery} size={40} />
                  <View className="flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-sm font-sans-bold text-primary"
                    >
                      Use &ldquo;{trimmedQuery}&rdquo;
                    </Text>
                    <Text className="text-xs font-sans-medium text-muted-foreground">
                      Add it as a custom subscription
                    </Text>
                  </View>
                  <Text className="text-lg font-sans-bold text-accent">＋</Text>
                </Pressable>
              )}
              {groups.length === 0 ? (
                trimmedQuery.length > 0 ? null : (
                  <Text className="home-empty-state">
                    Start typing to find a subscription.
                  </Text>
                )
              ) : (
                groups.map(({ category, brands }) => {
                  const expanded = searching || category === effectiveOpen;
                  return (
                    <View
                      key={category}
                      className="overflow-hidden rounded-2xl border border-border bg-card"
                    >
                      <Pressable
                        onPress={() =>
                          !searching &&
                          setOpenCategory(expanded ? null : category)
                        }
                        disabled={searching}
                        accessibilityRole="button"
                        accessibilityState={{ expanded, disabled: searching }}
                        className="flex-row items-center justify-between px-4 py-3.5"
                      >
                        <Text className="text-sm font-sans-bold text-primary">
                          {category}
                        </Text>
                        <Text className="text-base font-sans-bold text-muted-foreground">
                          {expanded ? "▾" : "▸"}
                        </Text>
                      </Pressable>
                      {expanded ? (
                        <View className="flex-row flex-wrap justify-between gap-y-4 px-4 pb-4">
                          {brands.map((brand) => (
                            <Pressable
                              key={brand.title}
                              onPress={() => pick(brand.title)}
                              style={{ width: "31%" }}
                              className={clsx(
                                "items-center gap-2 rounded-2xl border p-3",
                                brand.title === selected
                                  ? "border-accent bg-accent/10"
                                  : "border-border bg-background",
                              )}
                            >
                              <SubscriptionIcon name={brand.title} size={44} />
                              <Text
                                numberOfLines={1}
                                className="text-xs font-sans-semibold text-primary"
                              >
                                {brand.title}
                              </Text>
                            </Pressable>
                          ))}
                          {brands.length % 3 !== 0 ? (
                            <View style={{ width: "31%" }} />
                          ) : null}
                          {brands.length % 3 === 1 ? (
                            <View style={{ width: "31%" }} />
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default BrandPickerSheet;
