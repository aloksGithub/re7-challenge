import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import dotenv from "dotenv";
import { ensurePrismaProvider, restorePrismaSchemaIfChanged, resolveSqliteFileFromEnvValue } from "./prisma-schema.js";
import { createFork } from "./create-fork.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..");
const prismaDir = path.join(backendDir, "prisma");
const schemaPath = path.join(prismaDir, "schema.prisma");
const envTestPath = path.join(backendDir, "env.test");

dotenv.config({ path: envTestPath });

function run(command: string, args: string[]) {
  return new Promise<number>((resolve, reject) => {
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
  const { changed, original } = await ensurePrismaProvider("sqlite");

  try {
    await run("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"]);
    await run("npx", ["prisma", "generate"]);
    await run("npx", ["prisma", "generate", "--schema=prisma/schema.prisma"]);
    await createFork();
    await run("npx", ["vitest", "run"]);
  } finally {
    const candidates = new Set<string>();
    const databaseUrl = resolveSqliteFileFromEnvValue(process.env.DATABASE_URL);
    if (databaseUrl) candidates.add(databaseUrl);
    candidates.add(path.join(backendDir, "test.db"));
    candidates.add(path.join(prismaDir, "test.db"));

    await Promise.all(Array.from(candidates).map((p) => fs.rm(p, { force: true }).catch(() => {})));

    if (changed) {
      await restorePrismaSchemaIfChanged(changed, original);
      try {
        await run("npx", ["prisma", "generate"]);
      } catch (e: any) {
        console.error("Warning: prisma generate after restore failed:", e?.message ?? e);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});


