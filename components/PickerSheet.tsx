import { useTheme } from "@/context/ThemeContext";
import "@/global.css";
import { useMemo, useState, type ReactNode } from "react";
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

export interface PickerItem {
  value: string;
  label: string;
  sublabel?: string;
  /** Extra text matched by the search box. */
  keywords?: string;
}

interface PickerSheetProps {
  visible: boolean;
  title: string;
  items: PickerItem[];
  selected?: string;
  placeholder?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  /** Optional leading visual (brand icon, etc.) per row. */
  renderLeading?: (item: PickerItem) => ReactNode;
}

/** Generic searchable single-select bottom sheet. */
const PickerSheet = ({
  visible,
  title,
  items,
  selected,
  placeholder = "Search",
  onSelect,
  onClose,
  renderLeading,
}: PickerSheetProps) => {
  const [query, setQuery] = useState("");
  const { varStyle, palette } = useTheme();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      `${item.label} ${item.sublabel ?? ""} ${item.keywords ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [items, query]);

  const handleClose = () => {
    setQuery("");
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
        <View className="modal-overlay" style={varStyle}>
          <Pressable
            className="absolute inset-0"
            onPress={handleClose}
            accessibilityLabel="Close"
          />
          <View className="modal-container">
            <View className="sheet-handle" />
            <View className="modal-header">
              <Text className="modal-title">{title}</Text>
              <Pressable className="modal-close" onPress={handleClose}>
                <Text className="modal-close-text">×</Text>
              </Pressable>
            </View>

            <View className="px-5 pt-4">
              <TextInput
                className="auth-input"
                value={query}
                onChangeText={setQuery}
                placeholder={placeholder}
                placeholderTextColor={palette.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              contentContainerClassName="px-5 py-4 gap-2"
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = item.value === selected;
                return (
                  <Pressable
                    className={clsxRow(isSelected)}
                    onPress={() => {
                      onSelect(item.value);
                      handleClose();
                    }}
                  >
                    {renderLeading?.(item)}
                    <View className="min-w-0 flex-1">
                      <Text className="text-base font-sans-semibold text-primary" numberOfLines={1}>
                        {item.label}
                      </Text>
                      {item.sublabel ? (
                        <Text className="text-sm font-sans-medium text-muted-foreground" numberOfLines={1}>
                          {item.sublabel}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Text className="text-lg font-sans-bold text-accent">✓</Text>
                    ) : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text className="home-empty-state">No matches.</Text>
              }
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const clsxRow = (selected: boolean) =>
  `flex-row items-center gap-3 rounded-2xl border p-3 ${
    selected ? "border-accent bg-accent/10" : "border-border bg-card"
  }`;

export default PickerSheet;
