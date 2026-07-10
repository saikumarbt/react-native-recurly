// Common ISO 4217 currency codes. Names are resolved at runtime via
// Intl.DisplayNames so we don't hand-maintain a name table.
export const CURRENCY_CODES = [
  "USD",
  "EUR",
  "GBP",
  "INR",
  "JPY",
  "CNY",
  "CAD",
  "AUD",
  "NZD",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "SGD",
  "HKD",
  "KRW",
  "BRL",
  "MXN",
  "ARS",
  "ZAR",
  "AED",
  "SAR",
  "TRY",
  "PLN",
  "CZK",
  "HUF",
  "THB",
  "IDR",
  "MYR",
  "PHP",
  "VND",
  "ILS",
  "RUB",
  "UAH",
  "NGN",
  "EGP",
  "PKR",
  "BDT",
  "LKR",
  "CLP",
  "COP",
  "RON",
] as const;

let displayNames: Intl.DisplayNames | null = null;
try {
  displayNames = new Intl.DisplayNames(undefined, { type: "currency" });
} catch {
  displayNames = null;
}

/** Full currency name for a code, e.g. "USD" → "US Dollar". */
export const currencyName = (code: string): string => {
  try {
    return displayNames?.of(code) ?? code;
  } catch {
    return code;
  }
};
