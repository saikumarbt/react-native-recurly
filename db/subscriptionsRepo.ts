import { getCycleLabel, normalizeBillingCycle } from "@/lib/billing";
import { randomUUID } from "expo-crypto";

import { getDatabase } from "./database";

/** Raw row shape as stored in SQLite (snake_case). */
export interface SubscriptionRow {
  id: string;
  name: string;
  icon_key: string | null;
  color: string | null;
  plan: string | null;
  category: string | null;
  payment_method: string | null;
  notes: string | null;
  status: string;
  price: number;
  currency: string;
  billing_cycle: string;
  custom_interval_days: number | null;
  is_trial: number;
  trial_end_date: string | null;
  start_date: string | null;
  next_renewal_date: string | null;
  cancelled_at: string | null;
  paused_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Fields accepted when creating a subscription. */
export type NewSubscription = SubscriptionDraft;

/** Maps a DB row to the app-level Subscription model. Pure — unit-testable. */
export const rowToSubscription = (row: SubscriptionRow): Subscription => {
  const billingCycle = normalizeBillingCycle(row.billing_cycle);
  return {
    id: row.id,
    name: row.name,
    color: row.color ?? undefined,
    plan: row.plan ?? undefined,
    category: row.category ?? undefined,
    paymentMethod: row.payment_method ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status,
    price: row.price,
    currency: row.currency,
    billingCycle,
    customIntervalDays: row.custom_interval_days ?? undefined,
    billing: getCycleLabel(billingCycle, row.custom_interval_days ?? undefined),
    isTrial: row.is_trial === 1,
    trialEndDate: row.trial_end_date ?? undefined,
    startDate: row.start_date ?? undefined,
    renewalDate: row.next_renewal_date ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    pausedAt: row.paused_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const nowIso = () => new Date().toISOString();

export const getAllSubscriptions = (): Subscription[] => {
  const rows = getDatabase().getAllSync<SubscriptionRow>(
    "SELECT * FROM subscriptions WHERE deleted_at IS NULL ORDER BY created_at DESC",
  );
  return rows.map(rowToSubscription);
};

export const getSubscriptionById = (id: string): Subscription | null => {
  const row = getDatabase().getFirstSync<SubscriptionRow>(
    "SELECT * FROM subscriptions WHERE id = ? AND deleted_at IS NULL",
    [id],
  );
  return row ? rowToSubscription(row) : null;
};

export const insertSubscription = (input: NewSubscription): Subscription => {
  const id = randomUUID();
  const timestamp = nowIso();
  const billingCycle = input.billingCycle ?? "monthly";

  getDatabase().runSync(
    `INSERT INTO subscriptions (
      id, name, color, plan, category, payment_method, notes,
      status, price, currency, billing_cycle, custom_interval_days,
      is_trial, trial_end_date, start_date, next_renewal_date,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.color ?? null,
      input.plan ?? null,
      input.category ?? null,
      input.paymentMethod ?? null,
      input.notes ?? null,
      input.status ?? "active",
      input.price,
      input.currency ?? "USD",
      billingCycle,
      input.customIntervalDays ?? null,
      input.isTrial ? 1 : 0,
      input.trialEndDate ?? null,
      input.startDate ?? null,
      input.renewalDate ?? null,
      timestamp,
      timestamp,
    ],
  );

  return getSubscriptionById(id)!;
};

/** Column map for patchable fields (camelCase -> snake_case). */
const PATCH_COLUMNS: Record<string, string> = {
  name: "name",
  color: "color",
  plan: "plan",
  category: "category",
  paymentMethod: "payment_method",
  notes: "notes",
  status: "status",
  price: "price",
  currency: "currency",
  billingCycle: "billing_cycle",
  customIntervalDays: "custom_interval_days",
  isTrial: "is_trial",
  trialEndDate: "trial_end_date",
  startDate: "start_date",
  renewalDate: "next_renewal_date",
  cancelledAt: "cancelled_at",
  pausedAt: "paused_at",
};

export const updateSubscription = (
  id: string,
  patch: Partial<NewSubscription>,
): Subscription | null => {
  const assignments: string[] = [];
  const values: (string | number | null)[] = [];

  for (const [key, column] of Object.entries(PATCH_COLUMNS)) {
    if (!(key in patch)) continue;
    const raw = (patch as Record<string, unknown>)[key];
    assignments.push(`${column} = ?`);
    if (key === "isTrial") {
      values.push(raw ? 1 : 0);
    } else {
      values.push((raw as string | number | null | undefined) ?? null);
    }
  }

  if (assignments.length > 0) {
    assignments.push("updated_at = ?");
    values.push(nowIso());
    values.push(id);
    getDatabase().runSync(
      `UPDATE subscriptions SET ${assignments.join(", ")} WHERE id = ? AND deleted_at IS NULL`,
      values,
    );
  }

  return getSubscriptionById(id);
};

/** Soft delete (tombstone kept for future sync + undo). */
export const softDeleteSubscription = (id: string): void => {
  const timestamp = nowIso();
  getDatabase().runSync(
    "UPDATE subscriptions SET deleted_at = ?, updated_at = ? WHERE id = ?",
    [timestamp, timestamp, id],
  );
};

/** Undo a recent soft delete. */
export const restoreSubscription = (id: string): Subscription | null => {
  getDatabase().runSync(
    "UPDATE subscriptions SET deleted_at = NULL, updated_at = ? WHERE id = ?",
    [nowIso(), id],
  );
  return getSubscriptionById(id);
};

export const setSubscriptionStatus = (
  id: string,
  status: SubscriptionStatus,
): Subscription | null => {
  const timestamp = nowIso();
  const cancelledAt = status === "cancelled" ? timestamp : null;
  const pausedAt = status === "paused" ? timestamp : null;
  getDatabase().runSync(
    `UPDATE subscriptions
     SET status = ?, cancelled_at = ?, paused_at = ?, updated_at = ?
     WHERE id = ? AND deleted_at IS NULL`,
    [status, cancelledAt, pausedAt, timestamp, id],
  );
  return getSubscriptionById(id);
};

/** kv helpers (settings, cached FX rates, flags). */
export const getKv = (key: string): string | null => {
  const row = getDatabase().getFirstSync<{ value: string }>(
    "SELECT value FROM kv WHERE key = ?",
    [key],
  );
  return row?.value ?? null;
};

export const setKv = (key: string, value: string): void => {
  getDatabase().runSync(
    `INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, nowIso()],
  );
};
