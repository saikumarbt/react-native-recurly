import { getKv, setKv } from "@/db/subscriptionsRepo";
import * as StoreReview from "expo-store-review";

const LAST_PROMPT_KEY = "review_last_prompt_ms";
// Apple hard-caps to ~3 prompts/year and silently ignores extras; we self-limit
// to at most once every 90 days so we only ever spend a prompt on a genuinely
// positive moment (a savings milestone), never on app open.
const MIN_INTERVAL_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Ask for an App Store / Play rating at a high point (e.g. right after a
 * savings-milestone celebration). No-ops silently when unavailable or when we
 * prompted recently — the OS shows nothing the user can be annoyed by.
 */
export async function maybeRequestReview(): Promise<void> {
  try {
    if (!(await StoreReview.isAvailableAsync())) return;
    if (!(await StoreReview.hasAction())) return;

    const last = Number(getKv(LAST_PROMPT_KEY) ?? 0);
    if (last && Date.now() - last < MIN_INTERVAL_MS) return;

    setKv(LAST_PROMPT_KEY, String(Date.now()));
    await StoreReview.requestReview();
  } catch {
    // Reviews are best-effort; never let a rating prompt surface an error.
  }
}
