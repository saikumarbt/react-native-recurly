/** Case/space-insensitive key for matching subscription names. */
export const normalizeName = (name: string): string =>
  name.trim().toLowerCase();

/**
 * Normalized names that appear on more than one ACTIVE subscription — used to
 * flag accidental duplicates (paused/cancelled don't count, so re-adding after
 * cancelling is fine).
 */
export const duplicateActiveNames = (subs: Subscription[]): Set<string> => {
  const counts = new Map<string, number>();
  for (const s of subs) {
    if (s.status !== "active") continue;
    const key = normalizeName(s.name);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const dups = new Set<string>();
  for (const [key, n] of counts) {
    if (n > 1) dups.add(key);
  }
  return dups;
};
