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
  {
    // Flags subs whose renewal date was assumed by quick-add onboarding (so we
    // can nudge the user to confirm it for accurate reminders). Additive and
    // non-destructive: existing rows default to 0 (not flagged).
    version: 2,
    sql: `
      ALTER TABLE subscriptions
      ADD COLUMN date_assumed INTEGER NOT NULL DEFAULT 0;
    `,
  },
  {
    // Latest billing occurrence the user has confirmed (or we've assumed) for
    // the "did it renew?" check-in. Additive; existing rows are NULL and
    // treated as the start date by the app.
    version: 3,
    sql: `
      ALTER TABLE subscriptions
      ADD COLUMN confirmed_through TEXT;
    `,
  },
  {
    // Set when the user confirms a same-name sub is intentional (a partner's /
    // child's), so we stop flagging it as a possible duplicate. Additive;
    // existing rows default to 0 (still eligible for duplicate flagging).
    version: 4,
    sql: `
      ALTER TABLE subscriptions
      ADD COLUMN duplicate_acknowledged INTEGER NOT NULL DEFAULT 0;
    `,
  },
  {
    // Timestamp (ISO) set when the user starts cancelling a sub at the service
    // but hasn't confirmed the outcome in myrev yet. Drives the "did you cancel?"
    // reconciliation check-in + one reminder. Additive; existing rows are NULL
    // (nothing pending). Cleared when the user confirms cancelled or keeps it.
    version: 5,
    sql: `
      ALTER TABLE subscriptions
      ADD COLUMN cancel_pending_at TEXT;
    `,
  },
  {
    // Timestamp (ISO) set when a sub is LOCKED by a Pro→Free downgrade: the user
    // was over the free active cap on lapse and this sub wasn't among the 5 they
    // kept. A locked sub is stored as status 'paused' (so it's already excluded
    // from the active count and gets no reminders) PLUS this flag, which drives
    // the distinct "Reactivate with Pro" UI and auto-restore on resubscribe.
    // Additive; existing rows are NULL (not locked). Cleared on reactivate.
    version: 6,
    sql: `
      ALTER TABLE subscriptions
      ADD COLUMN locked_at TEXT;
    `,
  },
];
