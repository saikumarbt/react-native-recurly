// Free tier tracks up to this many ACTIVE subscriptions. Paused and cancelled
// never count (history stays free, and cancellations are celebrated). Pro is
// unlimited. Board decision 2026-07-23 — a concrete forcing function that
// catches power users without binding the 2–3-sub average. Single constant so
// it's easy to tune against the cap-hit → convert/churn telemetry.
export const FREE_ACTIVE_CAP = 5;

/** Count subscriptions that occupy an active slot (active/trial, not paused/cancelled). */
export const countActive = (subs: Subscription[]): number =>
  subs.filter((s) => (s.status ?? "active") === "active").length;

/** True if another active subscription can be added under the current tier. */
export const canAddActive = (subs: Subscription[], isPro: boolean): boolean =>
  isPro || countActive(subs) < FREE_ACTIVE_CAP;

/** Remaining free slots (0 when at/over cap; Infinity for Pro). */
export const remainingSlots = (subs: Subscription[], isPro: boolean): number =>
  isPro ? Infinity : Math.max(0, FREE_ACTIVE_CAP - countActive(subs));
