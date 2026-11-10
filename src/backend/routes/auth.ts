import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { and, desc, eq, gt, notInArray, sql } from "drizzle-orm";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { Router } from "express";
import * as schema from "../db/schema";
import { passwordResets, sessions, users } from "../db/schema";
import { Mailer } from "../mail/mailer";
import { sendResetPasswordEmail } from "../mail/reset-password";
import {
    COOKIE_OPTIONS,
    createRequireSession,
    hashToken,
    readCookie,
    SESSION_COOKIE
} from "../middleware/session";

const SESSION_DAYS = 7;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

const RESET_MINUTES = 30;
const RESET_MS = RESET_MINUTES * 60 * 1000;

// Valid reset links per user. Requesting another deletes the oldest
const MAX_RESETS = 3;

/*
 * This is used when an account does not exist, so password validation
 * takes as long to compute for existing and non-existing users
 */
const DUMMY_HASH = bcrypt.hashSync("dummy-password", 10);

// Letters, numbers and !@#$%^&* only. Also rejects an empty password
const PASSWORD_PATTERN = /^[A-Za-z0-9!@#$%^&*]+$/;
const PASSWORD_MIN_LENGTH = 8;

// 3 to 24 letters, numbers or underscores
const USERNAME_PATTERN = /^\w{3,24}$/;

// Matches email@example.com, with a top-level domain of at least two characters
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function createAuthRouter(
    db: BetterSQLite3Database<typeof schema>,
    mailer: Mailer
): Router {
    const router = Router();
    const requireSession = createRequireSession(db);

    // Does nothing when the token has no session
    function deleteSession(token: string): void {
        db.delete(sessions)
            .where(eq(sessions.tokenHash, hashToken(token)))
            .run();
    }

    // Undefined when the reset link does not exist or has expired
    function findValidReset(token: string): { userId: string } | undefined {
        return db
            .select({ userId: passwordResets.userId })
            .from(passwordResets)
            .where(
                and(
                    eq(passwordResets.tokenHash, hashToken(token)),
                    gt(passwordResets.expiresAt, new Date())
                )
            )
            .get();
    }

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

        // The new cookie replaces this browser's previous session, so that token is not needed anymore
        const previous = readCookie(req.headers.cookie, SESSION_COOKIE);
        if (previous) {
            deleteSession(previous);
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

    /*
     * Creates an account without signing in. A taken username gets a 409, but a taken
     * email gets the same 204 as a new account, so the answer does not reveal which
     * emails are registered
     */
    router.post("/register", async (req, res) => {
        const { username, email, password } = req.body ?? {};
        if (typeof username !== "string" || !USERNAME_PATTERN.test(username)) {
            res.status(400).json({
                error: "Username must be 3 to 24 letters, numbers or underscores"
            });
            return;
        }
        if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
            res.status(400).json({ error: "Email is invalid" });
            return;
        }
        if (
            typeof password !== "string" ||
            password.length < PASSWORD_MIN_LENGTH ||
            !PASSWORD_PATTERN.test(password)
        ) {
            res.status(400).json({
                error: `Password must be at least ${PASSWORD_MIN_LENGTH} letters, numbers or !@#$%^&*`
            });
            return;
        }

        // Hashed before any lookup, so a taken email takes as long to answer as a new one
        const hash = await bcrypt.hash(password, 10);
        const normalizedEmail = email.trim().toLowerCase();

        // No await from here on, so no other request can insert between the checks and the insert
        const usernameTaken = db
            .select({ id: users.id })
            .from(users)
            .where(sql`lower(${users.username}) = ${username.toLowerCase()}`)
            .get();
        if (usernameTaken) {
            res.status(409).json({ error: "Username is taken" });
            return;
        }

        const emailTaken = db
            .select({ id: users.id })
            .from(users)
            .where(sql`lower(${users.email}) = ${normalizedEmail}`)
            .get();
        if (!emailTaken) {
            db.insert(users)
                .values({ username, email: normalizedEmail, password: hash })
                .run();
        }

        res.status(204).end();
    });

    /*
     * Emails reset instructions when an account uses the address. The answer is the
     * same either way, and the email is sent in the background so the response time
     * does not reveal whether the account exists
     */
    router.post("/forgot-password", (req, res) => {
        const { email } = req.body ?? {};
        if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
            res.status(400).json({ error: "Email is invalid" });
            return;
        }

        // Checked before the lookup, so this answer does not reveal whether the account exists
        if (!mailer.enabled) {
            res.status(503).json({ error: "Email is unavailable" });
            return;
        }

        const user = db
            .select({
                id: users.id,
                username: users.username,
                email: users.email
            })
            .from(users)
            .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
            .get();

        if (user) {
            const token = randomBytes(32).toString("base64url");

            db.insert(passwordResets)
                .values({
                    tokenHash: hashToken(token),
                    userId: user.id,
                    expiresAt: new Date(Date.now() + RESET_MS)
                })
                .run();

            // Keeps the newest valid links and deletes the rest, including expired ones.
            const kept = db
                .select({ tokenHash: passwordResets.tokenHash })
                .from(passwordResets)
                .where(
                    and(
                        eq(passwordResets.userId, user.id),
                        gt(passwordResets.expiresAt, new Date())
                    )
                )
                .orderBy(desc(passwordResets.createdAt), sql`rowid desc`)
                .limit(MAX_RESETS);
            db.delete(passwordResets)
                .where(
                    and(
                        eq(passwordResets.userId, user.id),
                        notInArray(passwordResets.tokenHash, kept)
                    )
                )
                .run();

            sendResetPasswordEmail(mailer, user, token).catch((error: Error) =>
                console.warn(
                    `[mail] WARNING: Could not send reset password email: ${error.message}`
                )
            );
        }

        res.status(204).end();
    });

    // Lets the reset password page check its link before showing the form
    router.post("/reset-password/verify", (req, res) => {
        const { token } = req.body ?? {};
        if (typeof token !== "string" || !token) {
            res.status(400).json({ error: "Reset link is invalid or expired" });
            return;
        }

        if (!findValidReset(token)) {
            res.status(400).json({ error: "Reset link is invalid or expired" });
            return;
        }
        res.status(204).end();
    });

    /*
     * Sets a new password from a reset link. Every reset link of the user stops working,
     * and every session is signed out, so anyone else using the account loses access
     */
    router.post("/reset-password", async (req, res) => {
        const { token, password } = req.body ?? {};
        if (typeof token !== "string" || !token) {
            res.status(400).json({ error: "Reset link is invalid or expired" });
            return;
        }
        if (
            typeof password !== "string" ||
            password.length < PASSWORD_MIN_LENGTH ||
            !PASSWORD_PATTERN.test(password)
        ) {
            res.status(400).json({
                error: `Password must be at least ${PASSWORD_MIN_LENGTH} letters, numbers or !@#$%^&*`
            });
            return;
        }

        // Checked before hashing, so a made-up link does not cost a bcrypt hash
        if (!findValidReset(token)) {
            res.status(400).json({ error: "Reset link is invalid or expired" });
            return;
        }

        const hash = await bcrypt.hash(password, 10);

        /*
         * Checked again because another request may have used the link while hashing.
         * No await from here on, so the link cannot be used twice
         */
        const reset = findValidReset(token);
        if (!reset) {
            res.status(400).json({ error: "Reset link is invalid or expired" });
            return;
        }

        db.transaction((tx) => {
            tx.update(users)
                .set({ password: hash })
                .where(eq(users.id, reset.userId))
                .run();
            tx.delete(passwordResets)
                .where(eq(passwordResets.userId, reset.userId))
                .run();
            tx.delete(sessions).where(eq(sessions.userId, reset.userId)).run();
        });

        res.status(204).end();
    });

    // Returns the signed-in user, or 401 when the session is missing or expired
    router.get("/me", requireSession, (req, res) => {
        // A session can outlive its user if the user was deleted without foreign keys on
        const user = db
            .select({ username: users.username })
            .from(users)
            .where(eq(users.id, req.userId!))
            .get();
        if (!user) {
            res.status(401).json({ error: "Not signed in" });
            return;
        }
        res.json(user);
    });

    // Signing out twice or without a session does not produce an error
    router.post("/sign-out", (req, res) => {
        const token = readCookie(req.headers.cookie, SESSION_COOKIE);
        if (token) {
            deleteSession(token);
        }

        res.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS);
        res.status(204).end();
    });

    return router;
}
