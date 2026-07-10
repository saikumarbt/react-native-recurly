import { seedIfEmpty } from "@/db/seed";
import {
  getAllSubscriptions,
  insertSubscription,
  restoreSubscription as repoRestore,
  setSubscriptionStatus,
  softDeleteSubscription,
  updateSubscription as repoUpdate,
} from "@/db/subscriptionsRepo";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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

  const refresh = useCallback(() => {
    setSubscriptions(getAllSubscriptions());
  }, []);

  const addSubscription = useCallback(
    (draft: SubscriptionDraft) => {
      const created = insertSubscription(draft);
      refresh();
      return created;
    },
    [refresh],
  );

  const updateSubscription = useCallback(
    (id: string, patch: Partial<SubscriptionDraft>) => {
      const updated = repoUpdate(id, patch);
      refresh();
      return updated;
    },
    [refresh],
  );

  const deleteSubscription = useCallback(
    (id: string) => {
      softDeleteSubscription(id);
      refresh();
    },
    [refresh],
  );

  const restoreSubscription = useCallback(
    (id: string) => {
      const restored = repoRestore(id);
      refresh();
      return restored;
    },
    [refresh],
  );

  const setStatus = useCallback(
    (id: string, status: SubscriptionStatus) => {
      const updated = setSubscriptionStatus(id, status);
      refresh();
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
