import { defineConfig } from "vitest/config";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Load test env when running vitest
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envTestPath = path.resolve(__dirname, "env.test");
dotenv.config({ path: envTestPath });

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    globalSetup: ["tests/setup/fork.global.ts"],
    globals: true,
    restoreMocks: true,
  },
});

