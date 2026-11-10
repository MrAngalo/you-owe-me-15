import { and, eq, gt } from "drizzle-orm";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { CookieOptions, RequestHandler } from "express";
import { hashToken } from "../crypto/token";
import * as schema from "../db/schema";
import { sessions } from "../db/schema";

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

// Clearing a cookie only works when these match the options it was set with
export const COOKIE_OPTIONS: CookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
};

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

// Answers 401 when the session is missing or expired, otherwise sets req.userId
export function createRequireSession(
    db: BetterSQLite3Database<typeof schema>
): RequestHandler {
    return (req, res, next) => {
        const token = readCookie(req.headers.cookie, SESSION_COOKIE);
        const session = token
            ? db
                  .select({ userId: sessions.userId })
                  .from(sessions)
                  .where(
                      and(
                          eq(sessions.tokenHash, hashToken(token)),
                          gt(sessions.expiresAt, new Date())
                      )
                  )
                  .get()
            : undefined;

        if (!session) {
            // A dead cookie would otherwise be sent, and looked up, on every request
            if (token) {
                res.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS);
            }
            res.status(401).json({ error: "Not signed in" });
            return;
        }
        req.userId = session.userId;
        next();
    };
}
