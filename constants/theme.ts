// myrev design tokens — one violet system, two themes (Porcelain light,
// Violet Midnight dark). `palettes` are plain JS colors for inline styles;
// `themeVars` are the same values as CSS custom properties for NativeWind's
// vars(), applied at the app root so every bg-*/text-* class swaps per theme.

export type ThemeName = "light" | "dark";

export const palettes = {
  light: {
    background: "#f4f2f9",
    foreground: "#191427",
    card: "#ffffff",
    raised: "#ffffff",
    muted: "#ece9f4",
    mutedForeground: "rgba(25, 20, 39, 0.6)",
    faint: "rgba(25, 20, 39, 0.5)",
    primary: "#191427", // = foreground (text); bg-primary reads as inverse surface
    accent: "#6e5be4",
    accentPress: "#7e6dea",
    onAccent: "#ffffff",
    border: "rgba(30, 22, 54, 0.09)",
    success: "#2fbf82",
    warning: "#d98a1f",
    destructive: "#e0525f",
    info: "#4f7fe0",
    subscription: "#efeafb",
  },
  dark: {
    background: "#0f0d1a",
    foreground: "#f3f1fb",
    card: "#191627",
    raised: "#221d34",
    muted: "#221d34",
    mutedForeground: "rgba(243, 241, 251, 0.62)",
    faint: "rgba(243, 241, 251, 0.56)",
    primary: "#f3f1fb",
    accent: "#6e5be4",
    accentPress: "#7e6dea",
    onAccent: "#ffffff",
    border: "rgba(255, 255, 255, 0.09)",
    success: "#34d399",
    warning: "#f5b860",
    destructive: "#f47174",
    info: "#7da7f4",
    subscription: "#251f3a",
  },
} as const satisfies Record<ThemeName, Record<string, string>>;

export type Palette = (typeof palettes)[ThemeName];

/** CSS custom-property map for NativeWind vars(), derived from a palette. */
export const themeVars = (name: ThemeName): Record<string, string> => {
  const p = palettes[name];
  return {
    "--color-background": p.background,
    "--color-foreground": p.foreground,
    "--color-card": p.card,
    "--color-raised": p.raised,
    "--color-muted": p.muted,
    "--color-muted-foreground": p.mutedForeground,
    "--color-faint": p.faint,
    "--color-primary": p.primary,
    "--color-accent": p.accent,
    "--color-accent-press": p.accentPress,
    "--color-on-accent": p.onAccent,
    "--color-border": p.border,
    "--color-success": p.success,
    "--color-warning": p.warning,
    "--color-destructive": p.destructive,
    "--color-info": p.info,
    "--color-subscription": p.subscription,
  };
};

/** Back-compat: default (light) palette for any remaining static import. */
export const colors = palettes.light;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  18: 72,
  20: 80,
  24: 96,
  30: 120,
} as const;

export const components = {
  tabBar: {
    height: spacing[18],
    horizontalInset: spacing[5],
    radius: spacing[8],
    iconFrame: spacing[12],
    itemPaddingVertical: spacing[2],
  },
} as const;

export const theme = {
  palettes,
  spacing,
  components,
} as const;
