import express from "express";
import path from "path";
import { scheduleCleanup } from "./db/cleanup";
import { openDatabase } from "./db/database";
import { createMailer } from "./mail/mailer";
import { createAuthRouter } from "./routes/auth";

const app = express();

const ROOT = path.resolve(__dirname, "../..");

// Loads variables from .env into process.env
process.loadEnvFile(path.join(ROOT, ".env"));
console.log("[init] Loaded environment from .env");

const PORT = Number(process.env.PORT);
const STATIC_DIR = path.join(ROOT, "dist/static");
const WEB_DIR = path.join(ROOT, "dist/frontend");
const DB_FILE = path.join(ROOT, process.env.DB_FILE!);

// If a migration fails, this throws and stops the server
console.log(`[init] Opening database and running migrations...`);
const { db } = openDatabase(DB_FILE);
console.log("[init] Database ready");

scheduleCleanup(db);
console.log("[init] Scheduled cleanup of expired sessions and reset links");

const mailer = createMailer();

// Runs in the background, the server still starts but emails will fail to send
console.log("[init] Verifying SMTP connection...");
mailer.transporter
    .verify()
    .then(() => {
        mailer.enabled = true;
        console.log("[init] SMTP connection verified");
    })
    .catch((error: Error) =>
        console.warn(
            `[init] WARNING: Could not connect to SMTP server: ${error.message}`
        )
    );

app.use(express.json());

app.use("/api/auth", createAuthRouter(db, mailer));

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
    console.log(`[init] Server listening on http://localhost:${PORT}`);
});
