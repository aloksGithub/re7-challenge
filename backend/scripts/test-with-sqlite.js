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


