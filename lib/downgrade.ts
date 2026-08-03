import { getDaysUntilRenewal, getMonthlyEquivalent } from "@/lib/billing";
import { FREE_ACTIVE_CAP, countActive } from "@/lib/limits";

// Pure logic for the Pro→Free over-cap downgrade (boardroom 2026-07-28):
// when a lapsed user has more active subs than the free cap allows, they pick
// which `cap` stay active and the rest are locked. This module decides WHEN a
// reconciliation is needed and SUGGESTS a default keep-set; the actual locking
// happens via the SubscriptionsContext.

const isActive = (s: Subscription): boolean =>
  (s.status ?? "active") === "active";

const monthly = (s: Subscription): number =>
  getMonthlyEquivalent(s.price, s.billingCycle ?? "monthly", s.customIntervalDays);

// Days until next renewal; missing/unknown sorts last (least urgent to keep).
const daysUntil = (s: Subscription): number =>
  getDaysUntilRenewal(
    s.renewalDate ?? s.startDate,
    s.billingCycle ?? "monthly",
    s.customIntervalDays,
  ) ?? Number.POSITIVE_INFINITY;

/** A lapsed (non-Pro) user tracking more active subs than the free cap allows. */
export const needsReconciliation = (
  subs: Subscription[],
  isPro: boolean,
  cap: number = FREE_ACTIVE_CAP,
): boolean => !isPro && countActive(subs) > cap;

export interface KeepPlan {
  /** Suggested subs to keep active (most financially relevant). */
  keepIds: string[];
  /** The remaining active subs, to be locked. */
  lockIds: string[];
}

/**
 * Default keep-selection when the user does nothing: rank active subs by
 * soonest renewal (a charge landing soon is the most important to keep
 * tracking — avoids a surprise), tie-broken by highest monthly cost, and keep
 * the top `cap`. The user can override in the reconcile screen.
 */
export const suggestKeep = (
  subs: Subscription[],
  cap: number = FREE_ACTIVE_CAP,
): KeepPlan => {
  const active = subs.filter(isActive);
  const ranked = [...active].sort((a, b) => {
    const da = daysUntil(a);
    const db = daysUntil(b);
    if (da !== db) return da - db; // soonest renewal first
    return monthly(b) - monthly(a); // then priciest first
  });
  const keepIds = ranked.slice(0, cap).map((s) => s.id);
  const keepSet = new Set(keepIds);
  const lockIds = active
    .filter((s) => !keepSet.has(s.id))
    .map((s) => s.id);
  return { keepIds, lockIds };
};
