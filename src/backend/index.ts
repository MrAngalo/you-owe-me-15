import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import express from "express";
import fs from "fs";
import path from "path";
import * as schema from "./db/schema";

const app = express();

const ROOT = path.resolve(__dirname, "../..");

// Loads variables from .env into process.env
process.loadEnvFile(path.join(ROOT, ".env"));

const PORT = Number(process.env.PORT);
const STATIC_DIR = path.join(ROOT, "dist/static");
const WEB_DIR = path.join(ROOT, "dist/frontend");
const DB_FILE = path.join(ROOT, process.env.DB_FILE!);
const MIGRATIONS_DIR = path.join(ROOT, "drizzle");

// The data folder is gitignored, so it does not exist on a fresh clone
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const sqlite = new Database(DB_FILE);
// Write-ahead log: better read/write concurrency, creates .db-wal and .db-shm files
sqlite.pragma("journal_mode = WAL");
// SQLite does not enforce foreign keys unless this is on
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite, { schema });

// Applies pending migrations from /drizzle. If it fails, throw and stop the server
migrate(db, { migrationsFolder: MIGRATIONS_DIR });

app.use(express.json());

// Allows static files (images, fonts, icons) to be fetched under root
app.use(express.static(STATIC_DIR));

// This is needed because angular needs to see js and css files under root
app.use(express.static(WEB_DIR));

// Fallback, any path not defined is routed here
app.get("/{*path}", (req, res, next) => {
    // If path has extension, it is assumed to be a file. if not found, skip it and 404
    if (path.extname(req.path)) {
        return next();
    }

    res.sendFile(path.join(WEB_DIR, "index.html"));
});

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
