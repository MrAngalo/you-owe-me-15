import { createTestDatabase, TestDatabase } from "../testing/database";
import { scheduleCleanup } from "./cleanup";
import { passwordResets, sessions, users } from "./schema";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

let database: TestDatabase;
let userId: string;

beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-11-10T12:00:00Z") });
    database = createTestDatabase();
    [{ id: userId }] = database.db
        .insert(users)
        .values({ username: "alice", email: "alice@test.dev", password: "x" })
        .returning({ id: users.id })
        .all();
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    if (database.sqlite.open) {
        database.sqlite.close();
    }
});

// Adds a session and a reset link that both expire this many minutes from now
function addRows(minutes: number): void {
    const expiresAt = new Date(Date.now() + minutes * MINUTE);
    database.db
        .insert(sessions)
        .values({ tokenHash: `session ${minutes}`, userId, expiresAt })
        .run();
    database.db
        .insert(passwordResets)
        .values({ tokenHash: `reset ${minutes}`, userId, expiresAt })
        .run();
}

function remaining(): string[] {
    const rows = [
        ...database.db
            .select({ tokenHash: sessions.tokenHash })
            .from(sessions)
            .all(),
        ...database.db
            .select({ tokenHash: passwordResets.tokenHash })
            .from(passwordResets)
            .all()
    ];
    return rows.map((row) => row.tokenHash).sort();
}

describe("scheduleCleanup", () => {
    it("deletes only expired sessions and reset links", () => {
        addRows(-1);
        addRows(30);

        scheduleCleanup(database.db);

        expect(remaining()).toEqual(["reset 30", "session 30"]);
    });

    it("deletes rows that expired since the last run every hour", () => {
        addRows(30);
        addRows(90);
        scheduleCleanup(database.db);

        vi.advanceTimersByTime(HOUR);

        expect(remaining()).toEqual(["reset 90", "session 90"]);
    });

    it("warns instead of throwing when the database fails", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        database.sqlite.close();

        expect(() => scheduleCleanup(database.db)).not.toThrow();
        expect(() => vi.advanceTimersByTime(HOUR)).not.toThrow();

        expect(warn).toHaveBeenCalledTimes(2);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("[clean]"));
    });
});
