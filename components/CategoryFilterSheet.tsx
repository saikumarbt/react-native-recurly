import SheetBackdrop from "@/components/SheetBackdrop";
import { useTheme } from "@/context/ThemeContext";
import "@/global.css";
import clsx from "clsx";
import { useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

export interface CategoryOption {
  name: string;
  count: number;
}

interface CategoryFilterSheetProps {
  visible: boolean;
  categories: CategoryOption[];
  /** Currently-selected category names (empty = show all). */
  selected: Set<string>;
  /** Number of subscriptions the current selection resolves to (footer CTA). */
  resultCount: number;
  onToggle: (category: string) => void;
  onClear: () => void;
  onClose: () => void;
}

/**
 * Multi-select category filter used on the Subscriptions screen once a user has
 * more categories than fit comfortably as inline chips (see INLINE_CATEGORY_LIMIT).
 * Live-applies: toggling updates the list behind immediately; the footer button
 * and backdrop just dismiss. Search keeps it scannable at 14+ categories.
 */
const CategoryFilterSheet = ({
  visible,
  categories,
  selected,
  resultCount,
  onToggle,
  onClear,
  onClose,
}: CategoryFilterSheetProps) => {
  const [query, setQuery] = useState("");
  const { varStyle, palette, scheme } = useTheme();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, query]);

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  const hasSelection = selected.size > 0;

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
              <Text className="modal-title">Filter by category</Text>
              <Pressable
                onPress={onClear}
                disabled={!hasSelection}
                accessibilityRole="button"
                accessibilityLabel="Clear category filters"
                accessibilityState={{ disabled: !hasSelection }}
              >
                <Text
                  className={clsx(
                    "text-sm font-sans-bold",
                    hasSelection ? "text-accent" : "text-muted-foreground/40",
                  )}
                >
                  Clear
                </Text>
              </Pressable>
            </View>

            <View className="px-5 pt-4">
              <TextInput
                className="auth-input"
                value={query}
                onChangeText={setQuery}
                placeholder="Search categories"
                placeholderTextColor={palette.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.name}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerClassName="px-5 py-4 gap-2"
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selected.has(item.name);
                return (
                  <Pressable
                    onPress={() => onToggle(item.name)}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`${item.name}, ${item.count} ${
                      item.count === 1 ? "subscription" : "subscriptions"
                    }`}
                    accessibilityState={{ checked: isSelected }}
                    className={clsx(
                      "flex-row items-center gap-3 rounded-2xl border p-3",
                      isSelected
                        ? "border-accent bg-accent/10"
                        : "border-border bg-card",
                    )}
                  >
                    <View
                      className={clsx(
                        "size-6 items-center justify-center rounded-md border",
                        isSelected
                          ? "border-accent bg-accent"
                          : "border-border bg-background",
                      )}
                    >
                      {isSelected ? (
                        <Text className="text-xs font-sans-bold text-on-accent">
                          ✓
                        </Text>
                      ) : null}
                    </View>
                    <Text
                      className="min-w-0 flex-1 text-base font-sans-semibold text-primary"
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text className="text-sm font-sans-bold text-muted-foreground">
                      {item.count}
                    </Text>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text className="home-empty-state">No categories match.</Text>
              }
            />

            <View className="border-t border-border px-5 pb-8 pt-4">
              <Pressable
                onPress={handleClose}
                accessibilityRole="button"
                className="items-center rounded-2xl bg-accent py-4 active:opacity-80"
              >
                <Text className="text-base font-sans-bold text-on-accent">
                  {hasSelection
                    ? `Show ${resultCount} ${
                        resultCount === 1 ? "result" : "results"
                      }`
                    : "Show all"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default CategoryFilterSheet;
