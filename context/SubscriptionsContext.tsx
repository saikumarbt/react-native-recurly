import {
  clearAllSubscriptions,
  getAllSubscriptions,
  insertSubscription,
  restoreSubscription as repoRestore,
  setSubscriptionStatus,
  softDeleteSubscription,
  updateSubscription as repoUpdate,
} from "@/db/subscriptionsRepo";
import { reconcileConfirmedThrough } from "@/lib/billing";
import * as notifications from "@/lib/notifications";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";

interface SubscriptionsContextValue {
  subscriptions: Subscription[];
  addSubscription: (draft: SubscriptionDraft) => Subscription;
  updateSubscription: (
    id: string,
    patch: Partial<SubscriptionDraft>,
  ) => Subscription | null;
  deleteSubscription: (id: string) => void;
  restoreSubscription: (id: string) => Subscription | null;
  pauseSubscription: (id: string) => Subscription | null;
  resumeSubscription: (id: string) => Subscription | null;
  cancelSubscription: (id: string) => Subscription | null;
  getSubscription: (id: string) => Subscription | undefined;
  /** Re-read all subscriptions from the DB (e.g. on screen focus). */
  refresh: () => void;
  /** Wipes all subscriptions from the device (delete-all / dev reset). */
  clearAllData: () => void;
}

const SubscriptionsContext = createContext<SubscriptionsContextValue | null>(
  null,
);

export const SubscriptionsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  // Load synchronously on first render (SQLite reads are sync) so the UI
  // never flashes an empty list before data arrives. No dev seeding — real
  // data comes from onboarding / the user.
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() =>
    getAllSubscriptions(),
  );

  // Always-current snapshot for the foreground reconciler's listener.
  const subscriptionsRef = useRef(subscriptions);
  subscriptionsRef.current = subscriptions;

  // Auto-assume renewals older than the grace window (advance confirmedThrough),
  // so only recent charges surface a "did it renew?" check-in. Persists changes
  // and returns the fresh list to reschedule against.
  const reconcileRenewals = useCallback((): Subscription[] => {
    const current = subscriptionsRef.current;
    let changed = false;
    for (const s of current) {
      if (s.status !== "active") continue;
      const advanced = reconcileConfirmedThrough(
        s.startDate,
        s.billingCycle ?? "monthly",
        s.confirmedThrough,
        s.customIntervalDays,
      );
      if (advanced) {
        repoUpdate(s.id, { confirmedThrough: advanced });
        changed = true;
      }
    }
    if (!changed) return current;
    const fresh = getAllSubscriptions();
    setSubscriptions(fresh);
    return fresh;
  }, []);

  // Configure notifications once, reconcile renewal check-ins, and reschedule
  // reminders on launch and every time the app returns to the foreground (rolls
  // renewals forward, drops stale ones, stays under the OS pending cap).
  useEffect(() => {
    void notifications.configureNotifications();
    void notifications.rescheduleAll(reconcileRenewals());
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void notifications.rescheduleAll(reconcileRenewals());
      }
    });
    return () => sub.remove();
  }, [reconcileRenewals]);

  const refresh = useCallback(() => {
    setSubscriptions(getAllSubscriptions());
  }, []);

  const addSubscription = useCallback(
    (draft: SubscriptionDraft) => {
      const created = insertSubscription(draft);
      refresh();
      // Ask for permission at this first high-intent moment, then schedule.
      void (async () => {
        await notifications.ensurePermission();
        await notifications.rescheduleForSubscription(created);
      })();
      return created;
    },
    [refresh],
  );

  const updateSubscription = useCallback(
    (id: string, patch: Partial<SubscriptionDraft>) => {
      const updated = repoUpdate(id, patch);
      refresh();
      if (updated) void notifications.rescheduleForSubscription(updated);
      return updated;
    },
    [refresh],
  );

  const deleteSubscription = useCallback(
    (id: string) => {
      softDeleteSubscription(id);
      refresh();
      void notifications.cancelForSubscription(id);
    },
    [refresh],
  );

  const restoreSubscription = useCallback(
    (id: string) => {
      const restored = repoRestore(id);
      refresh();
      if (restored) void notifications.rescheduleForSubscription(restored);
      return restored;
    },
    [refresh],
  );

  const setStatus = useCallback(
    (id: string, status: SubscriptionStatus) => {
      const updated = setSubscriptionStatus(id, status);
      refresh();
      // reschedule handles active (schedule) and paused/cancelled (clears).
      if (updated) void notifications.rescheduleForSubscription(updated);
      return updated;
    },
    [refresh],
  );

  const pauseSubscription = useCallback(
    (id: string) => setStatus(id, "paused"),
    [setStatus],
  );
  const resumeSubscription = useCallback(
    (id: string) => setStatus(id, "active"),
    [setStatus],
  );
  const cancelSubscription = useCallback(
    (id: string) => setStatus(id, "cancelled"),
    [setStatus],
  );

  const getSubscription = useCallback(
    (id: string) => subscriptions.find((sub) => sub.id === id),
    [subscriptions],
  );

  const clearAllData = useCallback(() => {
    clearAllSubscriptions();
    void notifications.cancelAllReminders();
    setSubscriptions([]);
  }, []);

  const value = useMemo(
    () => ({
      subscriptions,
      addSubscription,
      updateSubscription,
      deleteSubscription,
      restoreSubscription,
      pauseSubscription,
      resumeSubscription,
      cancelSubscription,
      getSubscription,
      refresh,
      clearAllData,
    }),
    [
      subscriptions,
      addSubscription,
      updateSubscription,
      deleteSubscription,
      restoreSubscription,
      pauseSubscription,
      resumeSubscription,
      cancelSubscription,
      getSubscription,
      refresh,
      clearAllData,
    ],
  );

  return (
    <SubscriptionsContext.Provider value={value}>
      {children}
    </SubscriptionsContext.Provider>
  );
};

export const useSubscriptions = () => {
  const context = useContext(SubscriptionsContext);
  if (!context) {
    throw new Error(
      "useSubscriptions must be used within a SubscriptionsProvider",
    );
  }
  return context;
};
