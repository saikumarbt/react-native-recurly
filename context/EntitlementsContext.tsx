import { getKv, setKv } from "@/db/subscriptionsRepo";
import {
  Purchases,
  configurePurchases,
  fetchCustomerInfo,
  isProActive,
  isPurchasesConfigured,
  logoutPurchases,
  proEntitlementOf,
  restore as restorePurchasesSdk,
  type PurchasesEntitlementInfo,
} from "@/lib/purchases";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// Single source of truth for "is this user Pro?". Every gated surface reads
// `useEntitlement().isPro` — never a product id — so swapping the dev override
// for the real RevenueCat `pro` entitlement later changes nothing downstream.
//
// For now `isPro` comes only from a DEV override (a kv flag toggled in Settings),
// so the whole free/Pro split can be built and validated before any billing
// exists. When RevenueCat lands, OR this with the live entitlement:
//   isPro = devPro || customerInfo.entitlements.active["pro"] != null
const DEV_KEY = "pro_dev_override";

interface EntitlementsValue {
  /** True when the user has Pro access (dev override in dev, else RevenueCat). */
  isPro: boolean;
  /** Dev-only: flip the Pro override to exercise gated surfaces. */
  devPro: boolean;
  setDevPro: (on: boolean) => void;
  /**
   * True once the entitlement is settled — immediately if RevenueCat isn't
   * configured (dev toggle is synchronous), else after the first CustomerInfo
   * read. Downgrade reconciliation waits for this so a real Pro user isn't
   * briefly mistaken for "lapsed" during the async load on launch.
   */
  ready: boolean;
  /** The active Pro entitlement (trial/renewal/expiry detail), or null. Null
   *  when Pro comes from the dev override or when not Pro. */
  proEntitlement: PurchasesEntitlementInfo | null;
  /** Re-run Restore Purchases (RevenueCat); resolves true if Pro is now active. */
  restorePurchases: () => Promise<boolean>;
  /** Reset RevenueCat to an anonymous user + clear the dev override. Called on
   *  account deletion so no entitlement lingers on the device. */
  resetEntitlements: () => Promise<void>;
}

const EntitlementsContext = createContext<EntitlementsValue | null>(null);

export const EntitlementsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [devPro, setDevProState] = useState<boolean>(
    () => getKv(DEV_KEY) === "1",
  );

  const setDevPro = useCallback((on: boolean) => {
    setKv(DEV_KEY, on ? "1" : "0");
    setDevProState(on);
  }, []);

  // Live RevenueCat entitlement. Starts null; configured + read on mount, then
  // kept fresh via the CustomerInfo listener (purchase, restore, expiry, grace).
  const [proEntitlement, setProEntitlement] =
    useState<PurchasesEntitlementInfo | null>(null);
  const [ready, setReady] = useState(false);
  const rcPro = proEntitlement !== null;

  useEffect(() => {
    configurePurchases();
    if (!isPurchasesConfigured()) {
      setReady(true); // no key → entitlement is just the (synchronous) dev toggle
      return;
    }
    let active = true;
    const apply = (info: Parameters<typeof isProActive>[0]) => {
      if (active) setProEntitlement(proEntitlementOf(info));
    };
    void fetchCustomerInfo().then((info) => {
      apply(info);
      if (active) setReady(true);
    });
    Purchases.addCustomerInfoUpdateListener(apply);
    return () => {
      active = false;
      Purchases.removeCustomerInfoUpdateListener(apply);
    };
  }, []);

  const restorePurchases = useCallback(async () => {
    const info = await restorePurchasesSdk();
    const ent = proEntitlementOf(info);
    setProEntitlement(ent);
    return ent !== null;
  }, []);

  const resetEntitlements = useCallback(async () => {
    setDevProState(false);
    setKv(DEV_KEY, "0");
    setProEntitlement(null);
    await logoutPurchases(); // back to a fresh anonymous RC user
  }, []);

  // The dev override is honoured ONLY in development builds; the live RevenueCat
  // entitlement applies in every build. So in a shipped app `isPro` comes solely
  // from RevenueCat — a leftover or injected `pro_dev_override` kv flag (local
  // SQLite is on-device and writable) can never unlock Pro in production.
  const isPro = (__DEV__ && devPro) || rcPro;

  const value = useMemo<EntitlementsValue>(
    () => ({
      isPro,
      devPro,
      setDevPro,
      ready,
      proEntitlement,
      restorePurchases,
      resetEntitlements,
    }),
    [
      isPro,
      devPro,
      setDevPro,
      ready,
      proEntitlement,
      restorePurchases,
      resetEntitlements,
    ],
  );

  return (
    <EntitlementsContext.Provider value={value}>
      {children}
    </EntitlementsContext.Provider>
  );
};

export const useEntitlement = (): EntitlementsValue => {
  const ctx = useContext(EntitlementsContext);
  if (!ctx)
    throw new Error("useEntitlement must be used within an EntitlementsProvider");
  return ctx;
};
