import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";

import { MIGRATIONS } from "./migrations";

let db: SQLiteDatabase | null = null;

/**
 * Runs pending migrations, tracked via PRAGMA user_version. Each migration is
 * wrapped in a transaction so a failure never leaves a half-applied schema.
 */
export const migrateIfNeeded = (database: SQLiteDatabase): void => {
  const row = database.getFirstSync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const currentVersion = row?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) {
      continue;
    }
    database.withTransactionSync(() => {
      database.execSync(migration.sql);
      database.execSync(`PRAGMA user_version = ${migration.version}`);
    });
  }
};

/** Singleton database handle; opens and migrates on first access. */
export const getDatabase = (): SQLiteDatabase => {
  if (!db) {
    db = openDatabaseSync("app.db");
    db.execSync("PRAGMA journal_mode = WAL");
    db.execSync("PRAGMA foreign_keys = ON");
    migrateIfNeeded(db);
  }
  return db;
};
