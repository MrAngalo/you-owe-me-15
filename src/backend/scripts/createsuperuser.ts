import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import { createInterface } from "readline/promises";
import { users } from "../db/schema";

const ROOT = path.resolve(__dirname, "../../..");

process.loadEnvFile(path.join(ROOT, ".env"));

const db = drizzle(new Database(path.join(ROOT, process.env.DB_FILE!)));

async function main() {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
    });
    const username = (await rl.question("Username: ")).trim();
    const email = (await rl.question("Email: ")).trim();
    const password = await rl.question("Password: ");
    const confirm = await rl.question("Confirm password: ");
    rl.close();

    if (!username || !email || !password) {
        console.error("Error: all fields are required");
        process.exit(1);
    }

    if (password !== confirm) {
        console.error("Error: passwords do not match");
        process.exit(1);
    }

    const hash = await bcrypt.hash(password, 10);

    try {
        db.insert(users)
            .values({ username, email, password: hash, superuser: true })
            .run();
    } catch (err) {
        console.error("Error: failed to create superuser");
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
    }

    console.log(`Superuser ${username} created`);
}

main();
