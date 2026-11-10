import { randomUUID } from "crypto";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => randomUUID()),
    username: text("username").notNull().unique(),
    email: text("email").notNull().unique(),
    // Uses bcrypt to store passwords
    password: text("password").notNull(),
    superuser: integer("superuser", { mode: "boolean" })
        .notNull()
        .default(false)
});

export const sessions = sqliteTable(
    "sessions",
    {
        tokenHash: text("token_hash").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        createdAt: integer("created_at", { mode: "timestamp" })
            .notNull()
            .$defaultFn(() => new Date()),
        expiresAt: integer("expires_at", { mode: "timestamp" }).notNull()
    },
    // Sessions are deleted by user and by expiry, these avoid scanning the whole table
    (table) => [
        index("sessions_user_id_idx").on(table.userId),
        index("sessions_expires_at_idx").on(table.expiresAt)
    ]
);

// Tokens from reset password emails. Only the hash is stored, the raw token is in the link
export const passwordResets = sqliteTable(
    "password_resets",
    {
        tokenHash: text("token_hash").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        createdAt: integer("created_at", { mode: "timestamp" })
            .notNull()
            .$defaultFn(() => new Date()),
        expiresAt: integer("expires_at", { mode: "timestamp" }).notNull()
    },
    // Resets are deleted by user and by expiry, these avoid scanning the whole table
    (table) => [
        index("password_resets_user_id_idx").on(table.userId),
        index("password_resets_expires_at_idx").on(table.expiresAt)
    ]
);
