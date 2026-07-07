import { HOME_SUBSCRIPTIONS } from "@/constants/data";
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
  addSubscription: (subscription: Subscription) => void;
}

const SubscriptionsContext = createContext<SubscriptionsContextValue | null>(
  null,
);

export const SubscriptionsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [subscriptions, setSubscriptions] =
    useState<Subscription[]>(HOME_SUBSCRIPTIONS);

  const addSubscription = useCallback((subscription: Subscription) => {
    setSubscriptions((current) => [subscription, ...current]);
  }, []);

  const value = useMemo(
    () => ({ subscriptions, addSubscription }),
    [subscriptions, addSubscription],
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
