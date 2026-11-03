import { randomUUID } from "crypto";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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

export const sessions = sqliteTable("sessions", {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .$defaultFn(() => new Date()),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull()
});
