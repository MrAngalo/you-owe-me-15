import { and, eq, gt } from "drizzle-orm";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { CookieOptions, RequestHandler } from "express";
import { hashToken } from "../core/token";
import * as schema from "../core/models";
import { sessions, users } from "./models";

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            // Set by requireSession, undefined on routes that do not use it
            userId?: string;
        }
    }
}

export const SESSION_COOKIE = "session";

/*
 * Clearing a cookie only works when these match the options it was set with.
 * A function, so NODE_ENV is read after index.ts loads .env, not when this module is imported
 */
export function cookieOptions(): CookieOptions {
    return {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/"
    };
}

// Finds one cookie in a "name=value; other=value" Cookie header
export function readCookie(
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

// Answers 401 when the session is missing, expired or has no user, otherwise sets req.userId
export function createRequireSession(
    db: BetterSQLite3Database<typeof schema>
): RequestHandler {
    return (req, res, next) => {
        const token = readCookie(req.headers.cookie, SESSION_COOKIE);
        const session = token
            ? db
                  .select({ userId: sessions.userId })
                  .from(sessions)
                  // A session can outlive its user if the user was deleted without foreign keys on
                  .innerJoin(users, eq(users.id, sessions.userId))
                  .where(
                      and(
                          eq(sessions.tokenHash, hashToken(token)),
                          gt(sessions.expiresAt, new Date())
                      )
                  )
                  .get()
            : undefined;

        if (!session) {
            // Not cleared, a late response would wipe out the cookie sign-in just set
            res.status(401).json({ error: "Not signed in" });
            return;
        }
        req.userId = session.userId;
        next();
    };
}
