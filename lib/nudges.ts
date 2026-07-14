import { getKv, setKv } from "@/db/subscriptionsRepo";

/**
 * One-time UI nudge flags (e.g. the first-run "+" pulse on Home). Stored in the
 * same kv table as onboarding state — see [[lib/onboarding.ts]] for the pattern.
 */
export type NudgeKey = "add_first";

const kvKey = (key: NudgeKey): string => `nudge_${key}`;

export const hasSeenNudge = (key: NudgeKey): boolean =>
  getKv(kvKey(key)) === "1";

export const markNudgeSeen = (key: NudgeKey): void => setKv(kvKey(key), "1");
