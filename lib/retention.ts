import { getKv, setKv } from "@/db/subscriptionsRepo";

// Retention mechanics, persisted in the kv table. Pure-ish (kv-backed) so the
// UI just reads/records. No dates stored beyond an integer week bucket.

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const K_STREAK_COUNT = "streak_count";
const K_STREAK_WEEK = "streak_week";
const K_MILESTONE_HW = "milestone_high_water";

/** Yearly-savings thresholds that trigger a celebration. */
const MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000];

/**
 * Record an app open for the weekly "audit" streak and return the current
 * streak. Same week → unchanged; consecutive week → +1; a gap → resets to 1.
 */
export const recordWeeklyOpen = (now = Date.now()): number => {
  const week = Math.floor(now / WEEK_MS);
  const lastWeek = Number(getKv(K_STREAK_WEEK));
  const count = Number(getKv(K_STREAK_COUNT)) || 0;

  if (Number.isFinite(lastWeek) && week === lastWeek) {
    return count || 1; // already counted this week
  }
  const next =
    Number.isFinite(lastWeek) && week === lastWeek + 1 ? count + 1 : 1;
  setKv(K_STREAK_WEEK, String(week));
  setKv(K_STREAK_COUNT, String(next));
  return next;
};

export const getStreak = (): number => Number(getKv(K_STREAK_COUNT)) || 0;

/**
 * Given the user's annualised savings from cancellations, returns a newly
 * crossed milestone amount to celebrate (or null), advancing a persisted
 * high-water mark so each milestone fires once.
 */
export const checkSavingsMilestone = (annualSaved: number): number | null => {
  const highWater = Number(getKv(K_MILESTONE_HW)) || 0;
  const crossed = MILESTONES.filter((m) => annualSaved >= m && m > highWater);
  if (crossed.length === 0) return null;
  const top = crossed[crossed.length - 1];
  setKv(K_MILESTONE_HW, String(top));
  return top;
};
