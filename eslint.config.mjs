import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default defineConfig(
    { ignores: ["**/dist/", "**/node_modules/", "**/.angular/"] },
    js.configs.recommended,
    tseslint.configs.recommended,
    prettier,
    {
        rules: {
            curly: ["error", "all"],
            "capitalized-comments": ["error", "always"],
            "multiline-comment-style": ["error", "starred-block"]
        }
    }
);
