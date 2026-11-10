import { lte } from "drizzle-orm";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { passwordResets, sessions } from "./schema";

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

// Expired sessions and reset links are never valid again, so they are safe to delete
export function deleteExpired(db: BetterSQLite3Database<typeof schema>): void {
    const now = new Date();
    db.delete(sessions).where(lte(sessions.expiresAt, now)).run();
    db.delete(passwordResets).where(lte(passwordResets.expiresAt, now)).run();
}

// Runs once now, then every hour while the server is up
export function scheduleCleanup(
    db: BetterSQLite3Database<typeof schema>
): void {
    deleteExpired(db);
    setInterval(() => deleteExpired(db), CLEANUP_INTERVAL_MS);
}
