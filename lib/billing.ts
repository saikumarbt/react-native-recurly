import dayjs, { type ManipulateType } from "dayjs";

/**
 * All supported billing cycles. "custom" uses `customIntervalDays`.
 */
export const BILLING_CYCLES = {
  weekly: { unit: "week", count: 1, label: "Weekly" },
  biweekly: { unit: "week", count: 2, label: "Biweekly" },
  monthly: { unit: "month", count: 1, label: "Monthly" },
  quarterly: { unit: "month", count: 3, label: "Quarterly" },
  semiannual: { unit: "month", count: 6, label: "Semiannual" },
  annual: { unit: "year", count: 1, label: "Annual" },
  custom: { unit: "day", count: 1, label: "Custom" },
} as const satisfies Record<
  string,
  { unit: ManipulateType; count: number; label: string }
>;

export type BillingCycle = keyof typeof BILLING_CYCLES;

export const BILLING_CYCLE_KEYS = Object.keys(BILLING_CYCLES) as BillingCycle[];

/** Average days per month (365.25 / 12) for monthly-equivalent math. */
const AVG_DAYS_PER_MONTH = 365.25 / 12;

const isValidCycle = (value: string | undefined): value is BillingCycle =>
  !!value && value in BILLING_CYCLES;

/**
 * Normalizes legacy billing strings ("Monthly", "Yearly") and new cycle keys
 * to a BillingCycle. Falls back to "monthly".
 */
export const normalizeBillingCycle = (value?: string): BillingCycle => {
  const lowered = value?.trim().toLowerCase();
  if (lowered === "yearly") return "annual";
  if (isValidCycle(lowered)) return lowered;
  return "monthly";
};

const intervalFor = (
  cycle: BillingCycle,
  customIntervalDays?: number,
): { unit: ManipulateType; count: number } => {
  if (cycle === "custom") {
    return { unit: "day", count: Math.max(1, customIntervalDays ?? 30) };
  }
  const { unit, count } = BILLING_CYCLES[cycle];
  return { unit, count };
};

/** Adds exactly one billing interval to a date. */
export const addInterval = (
  date: dayjs.Dayjs,
  cycle: BillingCycle,
  customIntervalDays?: number,
): dayjs.Dayjs => {
  const { unit, count } = intervalFor(cycle, customIntervalDays);
  return date.add(count, unit);
};

/**
 * Next renewal on/after today, rolling the anchor date forward by the billing
 * interval. dayjs clamps month-end overflow (Jan 31 + 1 month -> Feb 28).
 * Returns null for invalid dates.
 */
export const getNextRenewal = (
  anchorDate: string | undefined,
  cycle: BillingCycle,
  customIntervalDays?: number,
): dayjs.Dayjs | null => {
  // dayjs(undefined) means "now" — treat a missing anchor as invalid instead.
  if (!anchorDate) return null;
  const today = dayjs().startOf("day");
  let next = dayjs(anchorDate).startOf("day");
  if (!next.isValid()) return null;

  const { unit, count } = intervalFor(cycle, customIntervalDays);
  while (next.isBefore(today)) {
    next = next.add(count, unit);
  }
  return next;
};

/**
 * Resolves the next renewal date from a subscription's START (first billing)
 * date, honoring what the user actually entered:
 * - Future start date → the first charge is that start date itself.
 * - Today or past start date → the start is a charge that already happened, so
 *   the next charge is one interval on, rolled forward past any dates strictly
 *   before today. A charge due **today stays today** — we don't link to
 *   payments, so we can't assume today's charge was taken; we surface it.
 *
 * This is what the form stores as `renewalDate`; `getNextRenewal` is the
 * lighter primitive used elsewhere to keep a stored date fresh over time.
 */
export const resolveNextRenewal = (
  startDate: string | undefined,
  cycle: BillingCycle,
  customIntervalDays?: number,
): dayjs.Dayjs | null => {
  if (!startDate) return null;
  const start = dayjs(startDate).startOf("day");
  if (!start.isValid()) return null;

  const today = dayjs().startOf("day");
  if (start.isAfter(today)) return start;

  let next = addInterval(start, cycle, customIntervalDays);
  while (next.isBefore(today)) {
    next = addInterval(next, cycle, customIntervalDays);
  }
  return next;
};

/**
 * Whole days from today until the next renewal, or null when the date is
 * invalid.
 */
export const getDaysUntilRenewal = (
  anchorDate: string | undefined,
  cycle: BillingCycle,
  customIntervalDays?: number,
): number | null => {
  const next = getNextRenewal(anchorDate, cycle, customIntervalDays);
  if (!next) return null;
  return next.diff(dayjs().startOf("day"), "day");
};

/** Days after a renewal before the reconciler auto-assumes it renewed. */
export const RENEWAL_GRACE_DAYS = 4;

/**
 * The earliest billing occurrence that has come due since the user last
 * confirmed a renewal — the first occurrence in
 * `(confirmedThrough ?? startDate, today]`. This powers the "did it renew?"
 * check-in. Returns null when nothing is pending (a sub started today, or the
 * user is all caught up).
 */
export const pendingRenewal = (
  startDate: string | undefined,
  cycle: BillingCycle,
  confirmedThrough: string | undefined,
  customIntervalDays?: number,
  now: dayjs.Dayjs = dayjs(),
): dayjs.Dayjs | null => {
  if (!startDate) return null;
  const start = dayjs(startDate).startOf("day");
  if (!start.isValid()) return null;
  const anchorRaw = confirmedThrough
    ? dayjs(confirmedThrough).startOf("day")
    : start;
  const anchor = anchorRaw.isValid() ? anchorRaw : start;
  const today = now.startOf("day");

  const next = addInterval(anchor, cycle, customIntervalDays);
  return next.isAfter(today) ? null : next;
};

/**
 * For the launch/foreground reconciler: advances `confirmedThrough` past any
 * occurrences older than the grace window (we assume long-passed charges
 * renewed), leaving only recent ones to prompt about. Returns the new
 * confirmedThrough ISO, or null when nothing changed.
 */
export const reconcileConfirmedThrough = (
  startDate: string | undefined,
  cycle: BillingCycle,
  confirmedThrough: string | undefined,
  customIntervalDays?: number,
  graceDays: number = RENEWAL_GRACE_DAYS,
  now: dayjs.Dayjs = dayjs(),
): string | null => {
  if (!startDate) return null;
  const start = dayjs(startDate).startOf("day");
  if (!start.isValid()) return null;
  const anchorRaw = confirmedThrough
    ? dayjs(confirmedThrough).startOf("day")
    : start;
  let anchor = anchorRaw.isValid() ? anchorRaw : start;
  const cutoff = now.startOf("day").subtract(graceDays, "day");

  let changed = false;
  let next = addInterval(anchor, cycle, customIntervalDays);
  while (!next.isAfter(cutoff)) {
    anchor = next;
    changed = true;
    next = addInterval(anchor, cycle, customIntervalDays);
  }
  return changed ? anchor.toISOString() : null;
};

/**
 * Converts a price on any billing cycle to its monthly equivalent.
 * weekly x52/12, biweekly x26/12, quarterly /3, semiannual /6, annual /12,
 * custom x(365.25/days)/12.
 */
export const getMonthlyEquivalent = (
  price: number,
  cycle: BillingCycle,
  customIntervalDays?: number,
): number => {
  switch (cycle) {
    case "weekly":
      return (price * 52) / 12;
    case "biweekly":
      return (price * 26) / 12;
    case "monthly":
      return price;
    case "quarterly":
      return price / 3;
    case "semiannual":
      return price / 6;
    case "annual":
      return price / 12;
    case "custom": {
      const days = Math.max(1, customIntervalDays ?? 30);
      return (price * AVG_DAYS_PER_MONTH) / days;
    }
  }
};

/** Display label for a cycle ("Monthly", "Every 45 days" for custom). */
export const getCycleLabel = (
  cycle: BillingCycle,
  customIntervalDays?: number,
): string => {
  if (cycle === "custom" && customIntervalDays) {
    return `Every ${customIntervalDays} days`;
  }
  return BILLING_CYCLES[cycle].label;
};
