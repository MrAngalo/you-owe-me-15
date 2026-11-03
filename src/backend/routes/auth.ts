import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { eq, sql } from "drizzle-orm";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { CookieOptions, Router } from "express";
import * as schema from "../db/schema";
import { sessions, users } from "../db/schema";

const SESSION_COOKIE = "session";

// Clearing a cookie only works when these match the options it was set with
const COOKIE_OPTIONS: CookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
};

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

// Finds one cookie in a "name=value; other=value" Cookie header
function readCookie(
    header: string | undefined,
    name: string
): string | undefined {
    for (const part of header?.split(";") ?? []) {
        const [key, ...value] = part.trim().split("=");
        if (key === name) {
            return value.join("=");
        }
    }
    return undefined;
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
            ...COOKIE_OPTIONS,
            expires: expiresAt
        });
        res.status(204).end();
    });

    // Signing out twice or without a session does not produce an error
    router.post("/sign-out", (req, res) => {
        const token = readCookie(req.headers.cookie, SESSION_COOKIE);
        if (token) {
            db.delete(sessions)
                .where(eq(sessions.tokenHash, hashToken(token)))
                .run();
        }

        res.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS);
        res.status(204).end();
    });

    return router;
}
