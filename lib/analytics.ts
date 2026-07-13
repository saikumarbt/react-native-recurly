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

/** kv flag key for the analytics opt-out preference. */
export const ANALYTICS_OPTOUT_KEY = "analytics_optout";
