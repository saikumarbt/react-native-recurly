import { useEntitlement } from "@/context/EntitlementsContext";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import { needsReconciliation } from "@/lib/downgrade";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";

/**
 * Drives the Pro→Free over-cap downgrade (boardroom 2026-07-28). Renders nothing.
 *  - Resubscribed / still Pro → auto-unlock anything a past lapse locked.
 *  - Lapsed to free while over the cap → send the user to the pick-5 reconcile
 *    screen (once; it self-clears once they're back at/under the cap).
 * Waits for `ready` so a real Pro user isn't mistaken for "lapsed" during the
 * async entitlement read on launch.
 */
export default function DowngradeWatcher() {
  const { subscriptions, restoreLockedSubscriptions } = useSubscriptions();
  const { isPro, ready } = useEntitlement();
  const router = useRouter();
  const pushed = useRef(false);

  useEffect(() => {
    if (!ready) return;

    if (isPro) {
      // Pro (incl. just-resubscribed) — restore anything a past lapse locked.
      if (subscriptions.some((s) => s.lockedAt)) restoreLockedSubscriptions();
      pushed.current = false;
      return;
    }

    if (needsReconciliation(subscriptions, isPro)) {
      if (!pushed.current) {
        pushed.current = true;
        router.push("/reconcile");
      }
    } else {
      // Back at/under the cap — reset so a future lapse can trigger again.
      pushed.current = false;
    }
  }, [ready, isPro, subscriptions, router, restoreLockedSubscriptions]);

  return null;
}
