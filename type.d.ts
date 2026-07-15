import type { BillingCycle } from "@/lib/billing";
import type { ImageSourcePropType } from "react-native";

declare global {
  type SubscriptionStatus = "active" | "paused" | "cancelled";

  /** Input for creating/updating a subscription (server fields derived). */
  type SubscriptionDraft = Omit<
    Subscription,
    "id" | "billing" | "createdAt" | "updatedAt"
  >;
  interface AppTab {
    name: string;
    title: string;
    icon: ImageSourcePropType;
  }

  interface TabIconProps {
    focused: boolean;
    icon: ImageSourcePropType;
  }

  interface Subscription {
    id: string;
    name: string;
    plan?: string;
    category?: string;
    paymentMethod?: string;
    status?: SubscriptionStatus | string;
    startDate?: string;
    price: number;
    currency?: string;
    /** Display label derived from billingCycle (e.g. "Monthly"). */
    billing: string;
    /** Source of truth for renewal math. */
    billingCycle?: BillingCycle;
    /** Only for billingCycle === "custom". */
    customIntervalDays?: number;
    frequency?: string;
    /** Materialized next renewal (ISO). */
    renewalDate?: string;
    color?: string;
    isTrial?: boolean;
    trialEndDate?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
    cancelledAt?: string;
    pausedAt?: string;
  }

  interface SubscriptionCardProps extends Omit<Subscription, "id"> {
    expanded: boolean;
    onPress: () => void;
    onCancelPress?: () => void;
    isCancelling?: boolean;
  }

  interface SubscriptionFormModalProps {
    visible: boolean;
    onClose: () => void;
    /** Called with the draft; parent persists (create or update). */
    onSubmit: (draft: SubscriptionDraft) => void;
    /** When set, the modal is in edit mode and prefills from this. */
    subscription?: Subscription | null;
  }

  interface UpcomingSubscription {
    id: string;
    name: string;
    price: number;
    currency?: string;
    daysLeft: number;
  }

  interface UpcomingSubscriptionCardProps extends Omit<
    UpcomingSubscription,
    "id"
  > {}

  interface ListHeadingProps {
    title: string;
    /** Optional trailing action; the link only renders when both are set. */
    actionLabel?: string;
    onAction?: () => void;
  }

}

export {};
