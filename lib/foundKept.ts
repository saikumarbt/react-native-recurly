import { getKv, setKv } from "@/db/subscriptionsRepo";

// Subscriptions the user explicitly chose to keep when myrev Found flagged them.
// Persisted so the finding stays suppressed (respect the decision, no re-nag).
// Cleared automatically if the sub is later cancelled/deleted (id won't match).
const KEY = "found_kept";

export function getKeptSubIds(): Set<string> {
  try {
    const raw = getKv(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function keepSubscription(subId: string): void {
  const set = getKeptSubIds();
  set.add(subId);
  setKv(KEY, JSON.stringify([...set]));
}

export function unkeepSubscription(subId: string): void {
  const set = getKeptSubIds();
  if (set.delete(subId)) setKv(KEY, JSON.stringify([...set]));
}
