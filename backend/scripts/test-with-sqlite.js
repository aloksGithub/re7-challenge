import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..");
const prismaDir = path.join(backendDir, "prisma");
const schemaPath = path.join(prismaDir, "schema.prisma");
const envTestPath = path.join(backendDir, "env.test");

dotenv.config({ path: envTestPath });

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      cwd: backendDir,
      env: { ...process.env },
      shell: true,
    });
    child.on("close", (code) => {
      if (code === 0) resolve(0);
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

function resolveSqliteFileFromEnvValue(value) {
  if (!value || typeof value !== "string") return undefined;
  if (!value.startsWith("file:")) return undefined;
  const withoutScheme = value.slice(5);
  const filePart = withoutScheme.split("?")[0];
  const normalized = filePart.replace(/^\/*/, "");
  return path.isAbsolute(filePart) ? filePart : path.resolve(backendDir, normalized);
}

async function main() {
  const original = await fs.readFile(schemaPath, "utf8");
  const alreadySqlite = original.includes('provider = "sqlite"');

  if (!alreadySqlite) {
    const swapped = original.replace('provider = "postgresql"', 'provider = "sqlite"');
    if (swapped === original) {
      throw new Error("Could not find provider = \"postgresql\" in prisma/schema.prisma");
    }
    await fs.writeFile(schemaPath, swapped, "utf8");
  }

  try {
    // Prepare SQLite schema and clients
    await run("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"]);
    await run("npx", ["prisma", "generate"]);
    // Ensure tests that import the generated test client continue to work
    await run("npx", ["prisma", "generate", "--schema=prisma/schema.prisma"]);

    // Run tests
    await run("npx", ["vitest", "run"]);
  } finally {
    // Attempt to delete SQLite DB files created for tests
    const candidates = new Set();
    const databaseUrl = resolveSqliteFileFromEnvValue(process.env.DATABASE_URL);
    if (databaseUrl) candidates.add(databaseUrl);
    candidates.add(path.join(backendDir, "test.db"));
    candidates.add(path.join(prismaDir, "test.db"));

    await Promise.all(
      Array.from(candidates).map((p) => fs.rm(p, { force: true }).catch(() => {}))
    );

    // Restore original schema and regenerate default client
    if (!alreadySqlite) {
      await fs.writeFile(schemaPath, original, "utf8");
      try {
        await run("npx", ["prisma", "generate"]);
      } catch (e) {
        console.error("Warning: prisma generate after restore failed:", e?.message ?? e);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});


