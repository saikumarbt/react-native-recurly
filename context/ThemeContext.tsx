import {
  palettes,
  themeVars,
  type Palette,
  type ThemeName,
} from "@/constants/theme";
import { getKv, setKv } from "@/db/subscriptionsRepo";
import { vars } from "nativewind";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

export type ThemePreference = ThemeName | "system";
const KV_KEY = "theme_preference";

interface ThemeContextValue {
  /** Resolved active scheme (system preference already applied). */
  scheme: ThemeName;
  /** The user's choice: light | dark | system. */
  preference: ThemePreference;
  /** Active palette for inline styles / non-className props. */
  palette: Palette;
  /** vars() style — spread on a root View so token classes swap per theme.
   * Also applied inside RN Modals, which are separate roots and don't inherit
   * the app-root variables. */
  varStyle: ReturnType<typeof vars>;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const readPreference = (): ThemePreference => {
  const v = getKv(KV_KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const os = useColorScheme(); // live OS scheme: "light" | "dark" | null
  const [preference, setPref] = useState<ThemePreference>(readPreference);

  const scheme: ThemeName =
    preference === "system" ? (os === "dark" ? "dark" : "light") : preference;

  const setPreference = useCallback((next: ThemePreference) => {
    setKv(KV_KEY, next);
    setPref(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      scheme,
      preference,
      palette: palettes[scheme],
      varStyle: vars(themeVars(scheme)),
      setPreference,
    }),
    [scheme, preference, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
};
