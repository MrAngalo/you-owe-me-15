import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { sql } from "drizzle-orm";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { Router } from "express";
import * as schema from "../db/schema";
import { sessions, users } from "../db/schema";

const SESSION_COOKIE = "session";

const SESSION_DAYS = 7;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

/*
 * This is used when an account does not exist, so password validation
 * takes as long to compute for existing and non-existing users
 */
const DUMMY_HASH = bcrypt.hashSync("dummy-password", 10);

// Letters, numbers and !@#$%^&* only. Also rejects an empty password
const PASSWORD_PATTERN = /^[A-Za-z0-9!@#$%^&*]+$/;

function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

export function createAuthRouter(
    db: BetterSQLite3Database<typeof schema>
): Router {
    const router = Router();

    router.post("/sign-in", async (req, res) => {
        const { email, password } = req.body ?? {};
        if (typeof email !== "string" || !email.trim()) {
            res.status(400).json({ error: "Email is required" });
            return;
        }
        if (typeof password !== "string" || !PASSWORD_PATTERN.test(password)) {
            res.status(400).json({
                error: "Password may only contain letters, numbers and !@#$%^&*"
            });
            return;
        }

        // Emails are matched without regard to case or surrounding spaces
        const user = db
            .select({ id: users.id, password: users.password })
            .from(users)
            .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
            .get();

        const matches = await bcrypt.compare(
            password,
            user?.password ?? DUMMY_HASH
        );

        // Same answer for an unknown email and a wrong password
        if (!user || !matches) {
            res.status(401).json({ error: "Incorrect email or password" });
            return;
        }

        const token = randomBytes(32).toString("base64url");
        const expiresAt = new Date(Date.now() + SESSION_MS);

        db.insert(sessions)
            .values({
                tokenHash: hashToken(token),
                userId: user.id,
                expiresAt
            })
            .run();

        res.cookie(SESSION_COOKIE, token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            expires: expiresAt,
            path: "/"
        });
        res.status(204).end();
    });

    return router;
}
