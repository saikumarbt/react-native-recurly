/**
 * Coarse, non-identifying spend bucket for analytics. We never send exact
 * amounts to analytics — only which band a subscription falls into — so we
 * keep pricing insight without exposing a user's actual financials.
 *
 * @param monthly - monthly-equivalent amount in the user's base currency.
 */
export const priceBucket = (monthly: number): string => {
  if (!Number.isFinite(monthly) || monthly <= 0) return "unknown";
  if (monthly < 5) return "under_5";
  if (monthly < 15) return "5_15";
  if (monthly < 50) return "15_50";
  return "50_plus";
};

import { getKv, setKv } from "@/db/subscriptionsRepo";
import * as Localization from "expo-localization";

/**
 * kv flag for the analytics decision. "0" = allowed, "1" = denied, ABSENT =
 * undecided. Region-gated opt-in (boardroom 2026-07-30): outside the EEA/UK an
 * undecided user defaults to allowed (opt-out model); inside, analytics stays
 * OFF until they explicitly consent (GDPR opt-in).
 */
export const ANALYTICS_OPTOUT_KEY = "analytics_optout";

// EEA (EU-27 + Iceland, Liechtenstein, Norway) + the UK (UK GDPR). ISO 3166-1
// alpha-2, matched against the device region.
const GDPR_REGIONS = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES",
  "SE", "IS", "LI", "NO", "GB",
]);

/** True if the device region is in the EEA/UK (GDPR consent territory). */
export const isGdprRegion = (): boolean => {
  const region = Localization.getLocales()[0]?.regionCode?.toUpperCase();
  return !!region && GDPR_REGIONS.has(region);
};

/** Resolve whether analytics may run right now (explicit decision, else region default). */
export const analyticsAllowed = (): boolean => {
  const decision = getKv(ANALYTICS_OPTOUT_KEY);
  if (decision === "1") return false;
  if (decision === "0") return true;
  return !isGdprRegion(); // undecided: allowed outside the EEA/UK, off inside
};

/** An EEA/UK user who hasn't decided yet — show them the consent prompt. */
export const needsAnalyticsConsent = (): boolean =>
  getKv(ANALYTICS_OPTOUT_KEY) === null && isGdprRegion();

/** Persist an explicit analytics decision. */
export const setAnalyticsDecision = (allowed: boolean): void =>
  setKv(ANALYTICS_OPTOUT_KEY, allowed ? "0" : "1");
