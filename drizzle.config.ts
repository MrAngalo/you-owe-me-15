/// <reference types="node" />
import { defineConfig } from "drizzle-kit";

export default defineConfig({
    dialect: "sqlite",
    schema: "./src/backend/core/models.ts",
    out: "./drizzle",
    dbCredentials: {
        url: process.env.DB_FILE!
    }
});
