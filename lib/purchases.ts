import { Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesEntitlementInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases";

// RevenueCat entitlement identifier that unlocks Pro. MUST match the entitlement
// created in the RC dashboard exactly.
export const PRO_ENTITLEMENT = "pro";

// Public SDK key — safe to ship client-side (EXPO_PUBLIC_ is inlined into the
// bundle; that's fine for a PUBLIC key, never for the sk_ secret key). For the
// RevenueCat Test Store this is a single `test_`-prefixed key used on both
// platforms. When real stores are added later, set the platform keys instead
// (appl_ for iOS, goog_ for Android) and they take precedence.
const API_KEY =
  Platform.select({
    ios: process.env.EXPO_PUBLIC_RC_API_KEY_IOS,
    android: process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID,
  }) ?? process.env.EXPO_PUBLIC_RC_API_KEY;

let configured = false;
export const isPurchasesConfigured = () => configured;

/**
 * Configure the SDK once, at app launch. No-ops when no key is set, so the app
 * runs on the dev entitlement toggle until RevenueCat is wired.
 *
 * A Test Store key (`test_`) is honoured ONLY in a dev build: RevenueCat
 * deliberately halts a RELEASE build initialised with a test key, so we skip
 * configuring in that case rather than let the app crash. Real store keys
 * (appl_/goog_) configure in every build.
 */
export function configurePurchases(): void {
  if (configured || !API_KEY) return;
  if (API_KEY.startsWith("test_") && !__DEV__) {
    console.warn(
      "[purchases] Test Store key in a production build — skipping configure. " +
        "Set a real appl_/goog_ key for release builds.",
    );
    return;
  }
  try {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey: API_KEY });
    configured = true;
  } catch (e) {
    // Native module missing (e.g. Expo Go without a dev build) — stay on the
    // dev toggle rather than crash.
    console.warn("[purchases] configure failed", e);
  }
}

/** The active Pro entitlement (with trial/renewal/expiry detail), or null. */
export const proEntitlementOf = (
  info: CustomerInfo | null | undefined,
): PurchasesEntitlementInfo | null =>
  info?.entitlements.active[PRO_ENTITLEMENT] ?? null;

/** True when the CustomerInfo grants the Pro entitlement. */
export const isProActive = (info: CustomerInfo | null | undefined): boolean =>
  proEntitlementOf(info) !== null;

/**
 * Downgrade signal for a lapsed Pro entitlement (boardroom 2026-07-28 flow):
 * distinguishes an involuntary billing failure (grace/retry — treat generously)
 * from a voluntary cancel. Reads the entitlement whether active or not.
 */
export const lapseReason = (
  info: CustomerInfo | null | undefined,
): "billing_issue" | "cancelled" | "none" => {
  const ent = info?.entitlements.all[PRO_ENTITLEMENT];
  if (!ent) return "none";
  if (ent.billingIssueDetectedAt) return "billing_issue";
  if (ent.unsubscribeDetectedAt) return "cancelled";
  return "none";
};

export async function fetchCustomerInfo(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

/** Link purchases to the signed-in Clerk user (so Pro follows them cross-device). */
export async function loginPurchases(appUserId: string): Promise<void> {
  if (!configured) return;
  try {
    await Purchases.logIn(appUserId);
  } catch (e) {
    console.warn("[purchases] logIn failed", e);
  }
}

export async function logoutPurchases(): Promise<void> {
  if (!configured) return;
  try {
    await Purchases.logOut();
  } catch (e) {
    console.warn("[purchases] logOut failed", e);
  }
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!configured) return null;
  try {
    return (await Purchases.getOfferings()).current ?? null;
  } catch {
    return null;
  }
}

export async function purchase(
  pkg: PurchasesPackage,
): Promise<{ ok: boolean; cancelled: boolean; info?: CustomerInfo }> {
  if (!configured) return { ok: false, cancelled: false };
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { ok: true, cancelled: false, info: customerInfo };
  } catch (e: unknown) {
    const cancelled = !!(e as { userCancelled?: boolean })?.userCancelled;
    return { ok: false, cancelled };
  }
}

export async function restore(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  try {
    return await Purchases.restorePurchases();
  } catch {
    return null;
  }
}

export { Purchases };
export type {
  CustomerInfo,
  PurchasesEntitlementInfo,
  PurchasesOffering,
  PurchasesPackage,
};
