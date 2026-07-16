// Native modules are mocked with factories (never loading the real ones, which
// pull unresolvable native deps under jest) so importing the db layer is safe —
// migrateIfNeeded takes an injected db, and rowToSubscription is pure.
jest.mock("expo-sqlite", () => ({ openDatabaseSync: jest.fn() }));
jest.mock("expo-crypto", () => ({ randomUUID: jest.fn(() => "test-id") }));

import { migrateIfNeeded } from "@/db/database";
import { MIGRATIONS } from "@/db/migrations";
import { rowToSubscription, type SubscriptionRow } from "@/db/subscriptionsRepo";

/** Minimal fake of the SQLiteDatabase surface migrateIfNeeded uses. */
const makeFakeDb = (startVersion: number) => {
  let version = startVersion;
  const executed: string[] = [];
  const db = {
    getFirstSync: (query: string) =>
      query.includes("user_version") ? { user_version: version } : null,
    withTransactionSync: (fn: () => void) => fn(),
    execSync: (sql: string) => {
      executed.push(sql);
      const match = sql.match(/PRAGMA user_version = (\d+)/);
      if (match) version = Number(match[1]);
    },
  };
  return { db, executed, version: () => version };
};

const run = (start: number) => {
  const fake = makeFakeDb(start);
  migrateIfNeeded(fake.db as unknown as Parameters<typeof migrateIfNeeded>[0]);
  return fake;
};

const latest = MIGRATIONS[MIGRATIONS.length - 1].version;

describe("MIGRATIONS list", () => {
  it("is append-only: strictly ascending versions", () => {
    for (let i = 1; i < MIGRATIONS.length; i++) {
      expect(MIGRATIONS[i].version).toBeGreaterThan(MIGRATIONS[i - 1].version);
    }
  });

  it("adds the date_assumed column at v2", () => {
    const v2 = MIGRATIONS.find((m) => m.version === 2);
    expect(v2?.sql).toMatch(/date_assumed/);
    expect(latest).toBe(2);
  });
});

describe("migrateIfNeeded", () => {
  it("runs every migration on a fresh db and bumps to the latest version", () => {
    const fake = run(0);
    expect(fake.version()).toBe(latest);
    expect(fake.executed.some((s) => s.includes("CREATE TABLE"))).toBe(true);
    expect(fake.executed.some((s) => s.includes("date_assumed"))).toBe(true);
  });

  it("runs only pending migrations when already at v1", () => {
    const fake = run(1);
    expect(fake.version()).toBe(2);
    // v1 (CREATE TABLE) is skipped; v2 (ALTER) runs.
    expect(fake.executed.some((s) => s.includes("CREATE TABLE"))).toBe(false);
    expect(fake.executed.some((s) => s.includes("date_assumed"))).toBe(true);
  });

  it("is a no-op when already at the latest version", () => {
    const fake = run(latest);
    expect(fake.executed).toHaveLength(0);
    expect(fake.version()).toBe(latest);
  });
});

describe("rowToSubscription date_assumed mapping", () => {
  const baseRow: SubscriptionRow = {
    id: "1",
    name: "Netflix",
    icon_key: null,
    color: null,
    plan: null,
    category: null,
    payment_method: null,
    notes: null,
    status: "active",
    price: 15.49,
    currency: "USD",
    billing_cycle: "monthly",
    custom_interval_days: null,
    is_trial: 0,
    date_assumed: 0,
    trial_end_date: null,
    start_date: null,
    next_renewal_date: null,
    cancelled_at: null,
    paused_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    deleted_at: null,
  };

  it("maps 0 -> false and 1 -> true", () => {
    expect(rowToSubscription(baseRow).dateAssumed).toBe(false);
    expect(rowToSubscription({ ...baseRow, date_assumed: 1 }).dateAssumed).toBe(
      true,
    );
  });
});
