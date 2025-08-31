import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import dotenv from "dotenv";
import { ensurePrismaProvider, restorePrismaSchemaIfChanged, resolveSqliteFileFromEnvValue } from "./prisma-schema.js";
import { createFork } from "./create-fork.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Resolve backend root correctly in both dev (scripts) and prod (dist/scripts)
const candidate = path.resolve(__dirname, "..");
const backendDir = path.basename(candidate) === "dist" ? path.resolve(candidate, "..") : candidate;
const prismaDir = path.join(backendDir, "prisma");

dotenv.config();

export function run(command: string, args: string[]) {
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runWithRetries(command: string, args: string[], attempts: number, delayMs: number) {
  let lastError: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      await run(command, args);
      return;
    } catch (e) {
      lastError = e;
      const message = (e as Error)?.message || String(e);
      console.error(`Attempt ${i}/${attempts} failed: ${message}`);
      if (i < attempts) await sleep(delayMs);
    }
  }
  throw lastError;
}

async function waitForRpcReady(url: string, timeoutSeconds = 60) {
  for (let i = 0; i < timeoutSeconds; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      });
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("RPC not ready after waiting");
}

function determineProvider(): "sqlite" | "postgresql" {
  const explicit = (process.env.PRISMA_PROVIDER || "").toLowerCase();
  if (explicit === "sqlite" || explicit === "postgresql") return explicit as any;
  const dbUrl = process.env.DATABASE_URL || "";
  if (dbUrl.startsWith("file:")) return "sqlite";
  if (/^postgres(ql)?:\/\//i.test(dbUrl)) return "postgresql";
  // Default to sqlite in non-dist dev runs, otherwise postgres
  const isDist = path.basename(candidate) === "dist";
  return isDist ? "postgresql" : "sqlite";
}

function shouldUseWatch(): boolean {
  const isDist = path.basename(candidate) === "dist";
  if (isDist) return false;
  const env = (process.env.USE_WATCH || "").toLowerCase();
  if (env === "true") return true;
  if (env === "false") return false;
  return (process.env.NODE_ENV || "development") !== "production";
}

function initializeEnvironment() {
  // Determine runtime behaviour from env and validate production requirements
  process.env.NODE_ENV = process.env.NODE_ENV || "development";

  if (process.env.NODE_ENV === 'prod' || process.env.NODE_ENV === 'production') {
    if (!process.env.API_KEY) {
      console.error("API_KEY is not set in production");
      process.exit(1);
    }
    if (process.env.API_KEY === "dev-key") {
      console.error("API_KEY is not dev-key in production");
      process.exit(1);
    }
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL is not set in production");
      process.exit(1);
    }
  }
  process.env.API_KEY = process.env.API_KEY || "dev-key";
}

function applyDefaultSqliteDbUrl(provider: "sqlite" | "postgresql") {
  // Default to local sqlite db for dev if not provided
  if (provider === "sqlite" && !process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "file:./dev.db?connection_limit=1";
  }
}

function collectSqliteDbCandidates(provider: "sqlite" | "postgresql") {
  const sqliteDbCandidates = new Set<string>();
  const resolvedDbFile = resolveSqliteFileFromEnvValue(process.env.DATABASE_URL);
  if (provider === "sqlite") {
    if (resolvedDbFile) sqliteDbCandidates.add(resolvedDbFile);
    sqliteDbCandidates.add(path.join(backendDir, "dev.db"));
    sqliteDbCandidates.add(path.join(prismaDir, "dev.db"));
  }
  return sqliteDbCandidates;
}

async function prepareDatabase(provider: "sqlite" | "postgresql") {
  const attempts = provider === "postgresql" ? Number(process.env.DB_PUSH_RETRIES || 20) : 1;
  const delayMs = Number(process.env.DB_PUSH_RETRY_DELAY_MS || 1500);

  if (provider === "postgresql") {
    // If migrations exist, prefer migrate deploy; otherwise fall back to db push (dev only)
    const migrationsDir = path.join(prismaDir, "migrations");
    let hasMigrations = false;
    try {
      const entries = await fs.readdir(migrationsDir);
      hasMigrations = (entries || []).some((e) => !e.startsWith("."));
    } catch {}

    if (hasMigrations) {
      try {
        await runWithRetries("npx", ["prisma", "migrate", "deploy"], attempts, delayMs);
      } catch (e: any) {
        const msg = (e as Error)?.message || String(e);
        const nonProd = (process.env.NODE_ENV || "development") !== "production";
        if (nonProd) {
          console.warn("migrate deploy failed; falling back to db push for dev:", msg);
          await runWithRetries("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"], attempts, delayMs);
        } else {
          throw e;
        }
      }
    } else {
      // No migrations present; use db push in dev for convenience
      const nonProd = (process.env.NODE_ENV || "development") !== "production";
      if (!nonProd) {
        console.error("No migrations found and running in production. Please generate and ship migrations.");
        process.exit(1);
      }
      await runWithRetries("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"], attempts, delayMs);
    }
  } else {
    await runWithRetries("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"], attempts, delayMs);
  }
}

function generatePrismaClient() {
  return run("npx", ["prisma", "generate"]);
}

async function createLocalForkIfEnabled(shouldCreateLocalFork: boolean) {
  let fork: Awaited<ReturnType<typeof createFork>> | undefined;
  if (shouldCreateLocalFork) {
    try {
      fork = await createFork();
    } catch (e) {
      console.error("Failed to create fork", e);
    }

    if (fork?.url) {
      try {
        await waitForRpcReady(fork.url);
      } catch (e) {
        console.error("Failed to wait for RPC ready", e);
      }
    }
  }
  return fork;
}

function spawnServerWithWatch(useWatch: boolean) {
  return spawn(useWatch ? "npx" : "node", useWatch ? ["tsx", "watch", "src/index.ts"] : ["dist/src/index.js"], {
    stdio: "inherit",
    cwd: backendDir,
    env: { ...process.env },
    shell: true,
  });
}

function createStop(
  server: ReturnType<typeof spawn> | undefined,
  fork: Awaited<ReturnType<typeof createFork>> | undefined,
  provider: "sqlite" | "postgresql",
  sqliteDbCandidates: Set<string>,
  changed: boolean,
  original?: string
) {
  return async (code?: number) => {
    try { server?.kill(); } catch {}
    await fork?.close().catch(() => {});
    if (provider === "sqlite") {
      await Promise.all(Array.from(sqliteDbCandidates).map((p) => fs.rm(p, { force: true }).catch(() => {})));
    }
    await restorePrismaSchemaIfChanged(changed, original);
    try { await run("npx", ["prisma", "generate"]); } catch {}
    process.exit(code ?? 0);
  };
}

function attachProcessAndServerHandlers(server: ReturnType<typeof spawn>, stop: (code?: number) => Promise<void>) {
  process.on("SIGINT", () => stop(130));
  process.on("SIGTERM", () => stop(143));
  process.on("uncaughtException", async (err) => {
    console.error(err);
    await stop(1);
  });

  server.on("close", async (code) => {
    await stop(code ?? 0);
  });
}

async function maybeSeedAfterStart(autoSeed: boolean) {
  if (autoSeed && process.env.FORK_RPC_URL) {
    try {
      const useWatchSeed = shouldUseWatch();
      await run("npm", ["run", useWatchSeed ? "seed" : "seed:docker"]);
    } catch (e) {
      console.error("Seed failed, continuing startup.", e);
    }
  }
}

async function main() {
  initializeEnvironment();

  const provider = determineProvider();

  applyDefaultSqliteDbUrl(provider);

  const sqliteDbCandidates = collectSqliteDbCandidates(provider);

  const { changed, original } = await ensurePrismaProvider(provider);

  const autoSeed = (process.env.AUTO_SEED_ON_START || "").toLowerCase() === "true";
  const shouldCreateLocalFork = (process.env.ENABLE_FORK || "").toLowerCase() === "true";

  let fork: Awaited<ReturnType<typeof createFork>> | undefined;
  let server: ReturnType<typeof spawn> | undefined;
  try {
    await prepareDatabase(provider);
    await generatePrismaClient();

    fork = await createLocalForkIfEnabled(shouldCreateLocalFork);

    // Start the server
    const useWatch = shouldUseWatch();
    server = spawnServerWithWatch(useWatch);

    const stop = createStop(server, fork, provider, sqliteDbCandidates, changed, original);

    attachProcessAndServerHandlers(server, stop);

    // Kick off seeding after server is up (only if an RPC is configured)
    await maybeSeedAfterStart(autoSeed);
  } catch (err) {
    console.error(err);
    await fork?.close().catch(() => {});
    await restorePrismaSchemaIfChanged(changed, original);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});


