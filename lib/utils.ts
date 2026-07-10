import dayjs from "dayjs";

/**
 * Formats a numeric value as a currency string using Intl (Hermes ships full
 * Intl on RN 0.81+), so all ISO 4217 currencies render correctly.
 *
 * @param value - The number to format.
 * @param currency - ISO 4217 currency code (e.g., "USD", "EUR"). Defaults to "USD".
 */
export function formatCurrency(
  value: number,
  currency: string = "USD",
): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // Fallback for invalid currency codes.
    return `${currency} ${value.toFixed(2)}`;
  }
}

/**
 * Compact currency for tight spaces (chart axes, tiles): "$1.2K", "€340".
 */
export function formatCurrencyShort(
  value: number,
  currency: string = "USD",
): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value)}`;
  }
}

export const formatSubscriptionDateTime = (value?: string): string => {
  if (!value) return "Not provided";
  const parsedDate = dayjs(value);
  return parsedDate.isValid()
    ? parsedDate.format("MM/DD/YYYY")
    : "Not provided";
};

export const formatStatusLabel = (value?: string): string => {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
};
