import { seedIfEmpty } from "@/db/seed";
import {
  getAllSubscriptions,
  insertSubscription,
  restoreSubscription as repoRestore,
  setSubscriptionStatus,
  softDeleteSubscription,
  updateSubscription as repoUpdate,
} from "@/db/subscriptionsRepo";
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
  // never flashes an empty list before data arrives.
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => {
    seedIfEmpty();
    return getAllSubscriptions();
  });

  // Always-current snapshot for the foreground reconciler's listener.
  const subscriptionsRef = useRef(subscriptions);
  subscriptionsRef.current = subscriptions;

  // Configure notifications once and reconcile scheduled reminders on launch
  // and every time the app returns to the foreground (rolls renewals forward,
  // drops stale ones, and stays under the OS pending-notification cap).
  useEffect(() => {
    void notifications.configureNotifications();
    void notifications.rescheduleAll(subscriptionsRef.current);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void notifications.rescheduleAll(subscriptionsRef.current);
      }
    });
    return () => sub.remove();
  }, []);

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
