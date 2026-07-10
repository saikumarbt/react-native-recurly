import { getAllSubscriptions, insertSubscription } from "./subscriptionsRepo";

/** Dev-only seed data (replaces the old constants/data.ts mock wiring). */
const DEV_SEEDS: SubscriptionDraft[] = [
  {
    name: "Adobe Creative Cloud",
    plan: "Teams Plan",
    category: "Design",
    paymentMethod: "Visa ending in 8530",
    status: "active",
    startDate: "2025-03-20T10:00:00.000Z",
    price: 77.49,
    currency: "USD",
    billingCycle: "monthly",
    renewalDate: "2026-07-20T10:00:00.000Z",
    color: "#f5c542",
  },
  {
    name: "GitHub Pro",
    plan: "Developer",
    category: "Developer Tools",
    paymentMethod: "Mastercard ending in 2408",
    status: "active",
    startDate: "2024-11-24T10:00:00.000Z",
    price: 9.99,
    currency: "USD",
    billingCycle: "monthly",
    renewalDate: "2026-07-24T10:00:00.000Z",
    color: "#e8def8",
  },
  {
    name: "Claude Pro",
    plan: "Pro Plan",
    category: "AI Tools",
    paymentMethod: "Amex ending in 1010",
    status: "paused",
    startDate: "2025-06-27T10:00:00.000Z",
    price: 20.0,
    currency: "USD",
    billingCycle: "monthly",
    renewalDate: "2026-07-27T10:00:00.000Z",
    color: "#b8d4e3",
  },
  {
    name: "Canva Pro",
    plan: "Yearly Access",
    category: "Design",
    paymentMethod: "Visa ending in 7784",
    status: "cancelled",
    startDate: "2024-04-02T10:00:00.000Z",
    price: 119.99,
    currency: "USD",
    billingCycle: "annual",
    renewalDate: "2027-04-02T10:00:00.000Z",
    color: "#b8e8d0",
  },
];

/** Seeds the database with demo data in development builds only. */
export const seedIfEmpty = (): void => {
  if (!__DEV__) return;
  if (getAllSubscriptions().length > 0) return;
  for (const draft of DEV_SEEDS) {
    insertSubscription(draft);
  }
};
