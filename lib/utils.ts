import dayjs from "dayjs";

/**
 * Formats a numeric value as a currency string.
 *
 * @param value - The number to format.
 * @param currency - ISO 4217 currency code (e.g., "USD", "EUR").
 *                   Defaults to "USD".
 * @returns A string formatted as US dollars with two decimal places.
 *          If Intl.NumberFormat fails, falls back to a simple `${symbol}value.toFixed(2)`.
 */
export function formatCurrency(
  value: number,
  currency: string = "USD",
): string {
  try {
    // Resolve the appropriate currency symbol for the requested currency.
    // For now, we only provide a mapping for USD; other currencies fall back to the code.
    const currencySymbolMap: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
    };
    const symbol = currencySymbolMap[currency.toUpperCase()] ?? currency;

    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(value);
  } catch (e) {
    // Fallback: simple string concatenation with two decimal places.
    const fallbackSymbol = currency === "USD" ? "$" : `${currency}`;
    return `${fallbackSymbol}${value.toFixed(2)}`;
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

/**
 * Days from today until a subscription's next renewal.
 *
 * Renewals are recurring, so a renewal date in the past is rolled forward by
 * the billing interval (monthly/yearly) until it lands on or after today.
 *
 * @returns Whole days until the next renewal, or `null` when the date is invalid.
 */
export const getDaysUntilRenewal = (
  renewalDate: string | undefined,
  billing: string | undefined,
): number | null => {
  const today = dayjs().startOf("day");
  let next = dayjs(renewalDate).startOf("day");
  if (!next.isValid()) return null;

  const unit = billing?.trim().toLowerCase() === "yearly" ? "year" : "month";
  while (next.isBefore(today)) {
    next = next.add(1, unit);
  }
  return next.diff(today, "day");
};
