import Database from "better-sqlite3";
import { BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

const MIGRATIONS_DIR = path.resolve(__dirname, "../../../drizzle");

export interface AppDatabase {
    sqlite: Database.Database;
    db: BetterSQLite3Database<typeof schema>;
}

// Every connection to the app database goes through here, so all of them get the same pragmas and schema
export function openDatabase(file: string): AppDatabase {
    if (file !== ":memory:") {
        // The data folder is gitignored, so it does not exist on a fresh clone
        fs.mkdirSync(path.dirname(file), { recursive: true });
    }

    const sqlite = new Database(file);
    // Write-ahead log: better read/write concurrency, creates .db-wal and .db-shm files
    sqlite.pragma("journal_mode = WAL");
    // SQLite does not enforce foreign keys unless this is on, and it is per connection
    sqlite.pragma("foreign_keys = ON");

    const db = drizzle(sqlite, { schema });
    // Applies pending migrations from /drizzle, throws if one fails
    migrate(db, { migrationsFolder: MIGRATIONS_DIR });

    return { sqlite, db };
}
