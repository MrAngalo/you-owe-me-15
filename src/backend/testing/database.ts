import Database from "better-sqlite3";
import { BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import * as schema from "../db/schema";

const MIGRATIONS_DIR = path.resolve(__dirname, "../../../drizzle");

export interface TestDatabase {
    sqlite: Database.Database;
    db: BetterSQLite3Database<typeof schema>;
}

// A new in-memory database with every migration applied, set up like the real one in index.ts
export function createTestDatabase(): TestDatabase {
    const sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    return { sqlite, db };
}
