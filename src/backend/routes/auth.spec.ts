import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import express from "express";
import { Server } from "http";
import { AddressInfo } from "net";
import { createToken, hashToken } from "../crypto/token";
import { AppDatabase, openDatabase } from "../db/database";
import { passwordResets, sessions, users } from "../db/schema";
import { Mailer } from "../mail/mailer";
import { createAuthRouter } from "./auth";

const RESET_ERROR = "Reset link is invalid or expired";

let database: AppDatabase;
let server: Server;
let baseUrl: string;

beforeEach(async () => {
    database = openDatabase(":memory:");

    // None of the tested routes send email
    const mailer = { enabled: false } as Mailer;

    const app = express();
    app.use(express.json());
    app.use("/api/auth", createAuthRouter(database.db, mailer));

    // Port 0 lets the system pick a free port
    server = await new Promise<Server>((resolve) => {
        const listening = app.listen(0, () => resolve(listening));
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://localhost:${port}/api/auth`;
});

afterEach(async () => {
    vi.restoreAllMocks();
    // Fetch keeps connections open, which would make close wait for them
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    database.sqlite.close();
});

function post(path: string, body: object, cookie?: string): Promise<Response> {
    return fetch(baseUrl + path, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            ...(cookie ? { cookie } : {})
        },
        body: JSON.stringify(body)
    });
}

function me(cookie: string): Promise<Response> {
    return fetch(baseUrl + "/me", { headers: { cookie } });
}

// The "session=..." pair from Set-Cookie, ready to send back in a Cookie header
function cookieFrom(res: Response): string {
    const header = res.headers.get("set-cookie");
    if (!header) {
        throw new Error("Response has no Set-Cookie header");
    }
    return header.split(";")[0];
}

async function signIn(
    email: string,
    password: string,
    cookie?: string
): Promise<string> {
    const res = await post("/sign-in", { email, password }, cookie);
    expect(res.status).toBe(204);
    return cookieFrom(res);
}

// Cost 4 keeps tests fast, sign-in reads the cost from the hash
function addUser(username: string, email: string, password: string): string {
    const [user] = database.db
        .insert(users)
        .values({ username, email, password: bcrypt.hashSync(password, 4) })
        .returning({ id: users.id })
        .all();
    return user.id;
}

// Returns the raw token, as it would appear in the reset link
function addReset(userId: string, { expired = false } = {}): string {
    const token = createToken();
    const offset = expired ? -60_000 : 30 * 60_000;
    database.db
        .insert(passwordResets)
        .values({
            tokenHash: hashToken(token),
            userId,
            expiresAt: new Date(Date.now() + offset)
        })
        .run();
    return token;
}

describe("sign-in", () => {
    it("revokes only the session this browser sent", async () => {
        addUser("alice", "alice@test.dev", "Password123");

        const first = await signIn("alice@test.dev", "Password123");
        const otherDevice = await signIn("alice@test.dev", "Password123");
        const replaced = await signIn("alice@test.dev", "Password123", first);

        expect((await me(first)).status).toBe(401);
        expect((await me(otherDevice)).status).toBe(200);
        expect((await me(replaced)).status).toBe(200);
    });

    it("revokes the previous session even when it belongs to another user", async () => {
        addUser("alice", "alice@test.dev", "Password123");
        addUser("bob", "bob@test.dev", "Password123");

        const alice = await signIn("alice@test.dev", "Password123");
        const bob = await signIn("bob@test.dev", "Password123", alice);

        expect((await me(alice)).status).toBe(401);
        const res = await me(bob);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ username: "bob" });
    });
});

describe("requireSession", () => {
    it("rejects a session whose user was deleted with foreign keys off", async () => {
        const userId = addUser("alice", "alice@test.dev", "Password123");
        const cookie = await signIn("alice@test.dev", "Password123");

        database.sqlite.pragma("foreign_keys = OFF");
        database.db.delete(users).where(eq(users.id, userId)).run();
        database.sqlite.pragma("foreign_keys = ON");

        expect(database.db.select().from(sessions).all()).toHaveLength(1);
        expect((await me(cookie)).status).toBe(401);
    });
});

describe("reset-password", () => {
    it("reports a dead link before password rules", async () => {
        const userId = addUser("alice", "alice@test.dev", "Password123");
        const token = addReset(userId, { expired: true });

        const res = await post("/reset-password", { token, password: "short" });

        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error: RESET_ERROR });
    });

    it("does not hash the password for a made-up link", async () => {
        const hash = vi.spyOn(bcrypt, "hash");

        const res = await post("/reset-password", {
            token: createToken(),
            password: "Password123"
        });

        expect(res.status).toBe(400);
        expect(hash).not.toHaveBeenCalled();
    });

    it("lets only one of two resets with the same link through", async () => {
        const userId = addUser("alice", "alice@test.dev", "Password123");
        const token = addReset(userId);

        /*
         * Each request waits in the hash until both have arrived, so both pass
         * the first link check before either one can use the link
         */
        const realHash = bcrypt.hash;
        let arrived = 0;
        let openGate!: () => void;
        const gate = new Promise<void>((resolve) => (openGate = resolve));
        vi.spyOn(bcrypt, "hash").mockImplementation((async (
            password: string,
            salt: number | string
        ) => {
            arrived += 1;
            if (arrived === 2) {
                openGate();
            }
            await gate;
            return realHash(password, salt);
        }) as typeof bcrypt.hash);

        const [first, second] = await Promise.all([
            post("/reset-password", { token, password: "PasswordA1" }),
            post("/reset-password", { token, password: "PasswordB2" })
        ]);

        expect([first.status, second.status].sort()).toEqual([204, 400]);
        const [winner, loser] =
            first.status === 204
                ? ["PasswordA1", "PasswordB2"]
                : ["PasswordB2", "PasswordA1"];

        const signInWinner = await post("/sign-in", {
            email: "alice@test.dev",
            password: winner
        });
        const signInLoser = await post("/sign-in", {
            email: "alice@test.dev",
            password: loser
        });
        expect(signInWinner.status).toBe(204);
        expect(signInLoser.status).toBe(401);
        expect(database.db.select().from(passwordResets).all()).toHaveLength(0);
    });
});
