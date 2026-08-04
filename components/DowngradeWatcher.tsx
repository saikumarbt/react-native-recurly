import { useEntitlement } from "@/context/EntitlementsContext";
import { useSubscriptions } from "@/context/SubscriptionsContext";
import { needsReconciliation } from "@/lib/downgrade";
import { usePathname, useRouter } from "expo-router";
import { useEffect } from "react";

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
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;

    if (isPro) {
      // Pro (incl. just-resubscribed) — restore anything a past lapse locked.
      if (subscriptions.some((s) => s.lockedAt)) restoreLockedSubscriptions();
      return;
    }

    // Over the cap and not already on the reconcile screen → send them there.
    // Gating on the pathname (rather than a fired-once ref) re-arms it: if they
    // dismiss reconcile while still over-cap, a later check navigates again.
    if (
      needsReconciliation(subscriptions, isPro) &&
      pathname !== "/reconcile"
    ) {
      router.push("/reconcile");
    }
  }, [ready, isPro, subscriptions, pathname, router, restoreLockedSubscriptions]);

  return null;
}
