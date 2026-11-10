import { createHash } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { RequestHandler } from "express";
import * as schema from "../db/schema";
import { sessions } from "../db/schema";

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            // Set by requireSession, only defined on routes that use it
            userId: string;
        }
    }
}

export const SESSION_COOKIE = "session";

// Only the hash of a token is stored, so a leaked database cannot be used to sign in
export function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
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
            res.status(401).json({ error: "Not signed in" });
            return;
        }
        req.userId = session.userId;
        next();
    };
}
