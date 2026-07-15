import { getKv, setKv } from "@/db/subscriptionsRepo";

/** kv flag marking the one-time onboarding as complete. */
export const ONBOARDED_KEY = "has_onboarded";

export const hasOnboarded = (): boolean => getKv(ONBOARDED_KEY) === "1";

export const markOnboarded = (): void => setKv(ONBOARDED_KEY, "1");

/** Clears the flag so the onboarding flow shows again (used by the dev reset). */
export const resetOnboarding = (): void => setKv(ONBOARDED_KEY, "0");
