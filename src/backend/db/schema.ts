import { randomUUID } from "crypto";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
    uuid: text("uuid")
        .primaryKey()
        .$defaultFn(() => randomUUID()),
    username: text("username").notNull().unique(),
    email: text("email").notNull().unique(),
    // Uses bcrypt to store passwords
    password: text("password").notNull()
});
