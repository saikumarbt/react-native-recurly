import * as Haptics from "expo-haptics";

/**
 * Thin wrappers around expo-haptics. Fire-and-forget and self-silencing so
 * callers never need to guard for unsupported hardware / rejected promises.
 */

/** Light selection tap — e.g. toggling a choice. */
export const tapLight = (): void => {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

/** Success notification — e.g. committing an add or a celebration. */
export const success = (): void => {
  void Haptics.notificationAsync(
    Haptics.NotificationFeedbackType.Success,
  ).catch(() => {});
};
