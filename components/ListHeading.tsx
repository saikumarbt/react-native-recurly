import { Text, TouchableOpacity, View } from "react-native";

const ListHeading = ({ title, actionLabel, onAction }: ListHeadingProps) => {
  return (
    <View className="list-head">
      <Text className="list-title">{title}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity className="list-action" onPress={onAction}>
          <Text className="list-action-text">{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export default ListHeading;
