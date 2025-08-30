import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { ensurePrismaProvider, restorePrismaSchemaIfChanged } from "./prisma-schema.js";
import { createFork } from "./create-fork.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..");

function run(command: string, args: string[], extraEnv: NodeJS.ProcessEnv = {}) {
  return new Promise<number>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      cwd: backendDir,
      env: { ...process.env, ...extraEnv },
      shell: true,
    });
    child.on("close", (code) => {
      if (code === 0) resolve(0);
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
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

async function main() {
  process.env.NODE_ENV = process.env.NODE_ENV || "production";

  // Ensure we use PostgreSQL in Docker
  const { changed, original } = await ensurePrismaProvider("postgresql");

  let fork: Awaited<ReturnType<typeof createFork>> | undefined;
  try {
    // Prepare DB and client for PostgreSQL
    await run("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"]);
    await run("npx", ["prisma", "generate"]);

    const shouldSeed = String(process.env.AUTO_SEED_ON_START ?? "true").toLowerCase() !== "false";

    if (shouldSeed) {
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

    // Start the server
    const server = spawn("node", ["dist/index.js"], {
      stdio: "inherit",
      cwd: backendDir,
      env: { ...process.env },
      shell: true,
    });

    const stop = async (code?: number) => {
      try { server.kill(); } catch {}
      await fork?.close().catch(() => {});
      await restorePrismaSchemaIfChanged(changed, original);
      process.exit(code ?? 0);
    };

    process.on("SIGINT", () => stop(130));
    process.on("SIGTERM", () => stop(143));
    process.on("uncaughtException", async (err) => {
      console.error(err);
      await stop(1);
    });

    server.on("close", async (code) => {
      await stop(code ?? 0);
    });

    // Kick off seeding after server is up
    if (shouldSeed) {
      try {
        await run("npm", ["run", "seed"]);
      } catch (e) {
        console.error("Seed failed, continuing startup.", e);
      }
    }
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


