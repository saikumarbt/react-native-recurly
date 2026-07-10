import { getKv, setKv } from "@/db/subscriptionsRepo";
import { getLocales } from "expo-localization";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const KV_KEY = "base_currency";

/** Device locale currency, or USD if unavailable. */
const localeCurrency = (): string => getLocales()[0]?.currencyCode ?? "USD";

interface CurrencyContextValue {
  /** The single app-wide currency all amounts are entered and shown in. */
  baseCurrency: string;
  setBaseCurrency: (code: string) => void;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  // Persisted preference wins; otherwise fall back to the device locale.
  const [baseCurrency, setBaseCurrencyState] = useState<string>(
    () => getKv(KV_KEY) ?? localeCurrency(),
  );

  const setBaseCurrency = useCallback((code: string) => {
    setKv(KV_KEY, code);
    setBaseCurrencyState(code);
  }, []);

  const value = useMemo(
    () => ({ baseCurrency, setBaseCurrency }),
    [baseCurrency, setBaseCurrency],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
