/**
 * Ordered schema migrations. Each entry runs once; the applied version is
 * tracked via SQLite's `PRAGMA user_version`. NEVER edit a shipped migration —
 * append a new one.
 */
export interface Migration {
  version: number;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon_key TEXT,
        color TEXT,
        plan TEXT,
        category TEXT,
        payment_method TEXT,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        price REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        billing_cycle TEXT NOT NULL DEFAULT 'monthly',
        custom_interval_days INTEGER,
        is_trial INTEGER NOT NULL DEFAULT 0,
        trial_end_date TEXT,
        start_date TEXT,
        next_renewal_date TEXT,
        cancelled_at TEXT,
        paused_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_subscriptions_status
        ON subscriptions (status)
        WHERE deleted_at IS NULL;

      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
];
