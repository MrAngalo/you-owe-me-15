import { defineConfig } from "vitest/config";

// Backend only, the frontend runs its own tests through ng test
export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["src/backend/**/*.spec.ts"]
    }
});
