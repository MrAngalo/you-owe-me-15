import bcrypt from "bcryptjs";
import { and, desc, eq, gt, notInArray, sql } from "drizzle-orm";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { Router } from "express";
import { createToken, hashToken } from "../crypto/token";
import * as schema from "../db/schema";
import { passwordResets, sessions, users } from "../db/schema";
import { Mailer } from "../mail/mailer";
import { sendResetPasswordEmail } from "../mail/reset-password";
import {
    cookieOptions,
    createRequireSession,
    readCookie,
    SESSION_COOKIE
} from "../middleware/session";
import {
    forgotPasswordBody,
    registerBody,
    RESET_ERROR,
    resetPasswordBody,
    resetPasswordVerifyBody,
    signInBody
} from "../schemas/auth";

/*
 * This is used when an account does not exist, so password validation
 * takes as long to compute for existing and non-existing users
 */
const DUMMY_HASH = bcrypt.hashSync("dummy-password", 10);

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
    function findValidReset(tokenHash: string): { userId: string } | undefined {
        return db
            .select({ userId: passwordResets.userId })
            .from(passwordResets)
            .where(
                and(
                    eq(passwordResets.tokenHash, tokenHash),
                    gt(passwordResets.expiresAt, new Date())
                )
            )
            .get();
    }

    router.post("/sign-in", async (req, res) => {
        const body = signInBody.safeParse(req.body ?? {});
        if (!body.success) {
            res.status(400).json({ error: body.error.issues[0].message });
            return;
        }
        const { email, password } = body.data;

        const user = db
            .select({ id: users.id, password: users.password })
            .from(users)
            .where(sql`lower(${users.email}) = ${email}`)
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

        const token = createToken();
        // Sessions last 7 days
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        db.insert(sessions)
            .values({
                tokenHash: hashToken(token),
                userId: user.id,
                expiresAt
            })
            .run();

        res.cookie(SESSION_COOKIE, token, {
            ...cookieOptions(),
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
        const body = registerBody.safeParse(req.body ?? {});
        if (!body.success) {
            res.status(400).json({ error: body.error.issues[0].message });
            return;
        }
        const { username, email, password } = body.data;

        // Hashed before any lookup, so a taken email takes as long to answer as a new one
        const hash = await bcrypt.hash(password, 10);

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
            .where(sql`lower(${users.email}) = ${email}`)
            .get();
        if (!emailTaken) {
            db.insert(users).values({ username, email, password: hash }).run();
        }

        res.status(204).end();
    });

    /*
     * Emails reset instructions when an account uses the address. The answer is the
     * same either way, and the email is sent in the background so the response time
     * does not reveal whether the account exists
     */
    router.post("/forgot-password", (req, res) => {
        const body = forgotPasswordBody.safeParse(req.body ?? {});
        if (!body.success) {
            res.status(400).json({ error: body.error.issues[0].message });
            return;
        }
        const { email } = body.data;

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
            .where(sql`lower(${users.email}) = ${email}`)
            .get();

        if (user) {
            const token = createToken();

            db.insert(passwordResets)
                .values({
                    tokenHash: hashToken(token),
                    userId: user.id,
                    // Reset links last 30 minutes
                    expiresAt: new Date(Date.now() + 30 * 60 * 1000)
                })
                .run();

            // Keeps the newest 3 valid links and deletes the rest, including expired ones
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
                .limit(3);
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
        const body = resetPasswordVerifyBody.safeParse(req.body ?? {});
        if (!body.success || !findValidReset(hashToken(body.data.token))) {
            res.status(400).json({ error: RESET_ERROR });
            return;
        }
        res.status(204).end();
    });

    /*
     * Sets a new password from a reset link. Every reset link of the user stops working,
     * and every session is signed out, so anyone else using the account loses access
     */
    router.post("/reset-password", async (req, res) => {
        const tokenBody = resetPasswordVerifyBody.safeParse(req.body ?? {});
        const tokenHash = tokenBody.success
            ? hashToken(tokenBody.data.token)
            : "";

        /*
         * Checked first, so a dead link is reported before any password rule,
         * and a made-up link does not cost a bcrypt hash
         */
        if (!findValidReset(tokenHash)) {
            res.status(400).json({ error: RESET_ERROR });
            return;
        }
        const body = resetPasswordBody.safeParse(req.body ?? {});
        if (!body.success) {
            res.status(400).json({ error: body.error.issues[0].message });
            return;
        }

        const hash = await bcrypt.hash(body.data.password, 10);

        /*
         * Checked again because another request may have used the link while hashing.
         * No await from here on, so the link cannot be used twice
         */
        const reset = findValidReset(tokenHash);
        if (!reset) {
            res.status(400).json({ error: RESET_ERROR });
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
        const user = db
            .select({ username: users.username })
            .from(users)
            .where(eq(users.id, req.userId!))
            .get();
        res.json(user);
    });

    // Signing out twice or without a session does not produce an error
    router.post("/sign-out", (req, res) => {
        const token = readCookie(req.headers.cookie, SESSION_COOKIE);
        if (token) {
            deleteSession(token);
        }

        res.clearCookie(SESSION_COOKIE, cookieOptions());
        res.status(204).end();
    });

    return router;
}
