import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import dotenv from "dotenv";
import { JsonRpcProvider, Wallet, ContractFactory, parseUnits, NonceManager } from "ethers";
import { compileToken } from "./compileToken.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..");
const prismaDir = path.join(backendDir, "prisma");
const schemaPath = path.join(prismaDir, "schema.prisma");
const backupPath = path.join(prismaDir, "schema.prisma.__dev_backup__");

dotenv.config();

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

async function ensureSqlitePrismaSchema(): Promise<{ changed: boolean; original?: string }>
{
  const current = await fs.readFile(schemaPath, "utf8");
  if (current.includes('provider = "sqlite"')) {
    return { changed: false };
  }
  if (!current.includes('provider = "postgresql"')) {
    // Unknown provider; do not modify
    return { changed: false };
  }
  await fs.writeFile(backupPath, current, "utf8");
  const swapped = current.replace('provider = "postgresql"', 'provider = "sqlite"');
  await fs.writeFile(schemaPath, swapped, "utf8");
  return { changed: true, original: current };
}

async function restorePrismaSchemaIfChanged(changed: boolean, original?: string) {
  if (!changed) return;
  try {
    const fromDisk = original ?? (await fs.readFile(backupPath, "utf8").catch(() => undefined));
    if (fromDisk) {
      await fs.writeFile(schemaPath, fromDisk, "utf8");
    }
  } finally {
    await fs.rm(backupPath, { force: true }).catch(() => {});
  }
}

function resolveSqliteFileFromEnvValue(value?: string) {
  if (!value || typeof value !== "string") return undefined;
  if (!value.startsWith("file:")) return undefined;
  const withoutScheme = value.slice(5);
  const filePart = withoutScheme.split("?")[0];
  const normalized = filePart.replace(/^\/*/, "");
  return path.isAbsolute(filePart) ? filePart : path.resolve(backendDir, normalized);
}

async function startFork(): Promise<{ url: string; close: () => Promise<void> }>
{
  let Ganache: any;
  try {
    Ganache = (await import("ganache")).default ?? (await import("ganache"));
  } catch (e) {
    throw new Error("Ganache is not installed. Add it to devDependencies to enable forked dev.");
  }

  const upstream = process.env.UPSTREAM_RPC_URL || "https://ethereum.publicnode.com";
  const forkOpts = upstream ? { fork: { url: upstream } } : {};

  const server = Ganache.server({
    logging: { quiet: true },
    chain: { chainId: 1337, networkId: 1337 },
    wallet: { deterministic: true },
    ...forkOpts,
  });

  const PORT = Number(process.env.FORK_PORT || 8545);
  await server.listen(PORT);
  const url = `http://127.0.0.1:${PORT}`;

  try {
    const accounts = server.provider.getInitialAccounts?.();
    const first = accounts ? (Object.values(accounts)[0] as any) : undefined;
    const key = first?.secretKey ?? first?.privateKey;
    if (key) {
      let hexKey: string | undefined;
      if (typeof key === "string") hexKey = key.startsWith("0x") ? key : ("0x" + key);
      else if (Buffer.isBuffer(key)) hexKey = "0x" + (key as Buffer).toString("hex");
      else if ((key as any)?.type === "Buffer" && Array.isArray((key as any)?.data)) hexKey = "0x" + Buffer.from((key as any).data).toString("hex");
      if (hexKey) process.env.PRIVATE_KEY = hexKey;
    }
  } catch {}

  process.env.FORK_RPC_URL = url;

  return {
    url,
    close: async () => {
      try { await server?.close(); } catch {}
    },
  };
}

async function getSigner(provider: JsonRpcProvider) {
  const pk = process.env.PRIVATE_KEY;
  if (pk && pk.length > 0) return new Wallet(pk, provider);
  const signer = (provider as any)?.getSigner?.();
  if (!signer) throw new Error("No signer available; set PRIVATE_KEY");
  return signer as any;
}

async function waitForApiReady(url: string, timeoutSeconds = 60) {
  for (let i = 0; i < timeoutSeconds; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("API not ready after waiting");
}

async function addSupportedToken(apiBaseUrl: string, network: string, token: { tokenAddress: string; symbol: string; name: string; decimals: number }) {
  const res = await fetch(`${apiBaseUrl}/add-supported-token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ network, token }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to add supported token (${res.status}): ${text}`);
  }
  return res.json();
}

async function deployAndRegisterTokens(apiBaseUrl: string) {
  console.log("Setting up ERC20 tokens...")
  const rpc = process.env.FORK_RPC_URL || "http://127.0.0.1:8545";
  const provider = new JsonRpcProvider(rpc);
  const signer = await getSigner(provider);
  const sender = await (signer as any).getAddress?.();
  const managedSigner = new NonceManager(signer as any);

  const tokens = [1, 2, 3, 4, 5].map((i) => ({
    name: `Test Token ${i}`,
    symbol: `TST${i}`,
  }));

  const deployed: Array<{ name: string; symbol: string; address: string }> = [];
  for (const t of tokens) {
    const { abi, bytecode } = await compileToken(t.name, t.symbol);
    const factory = new ContractFactory(abi, bytecode, managedSigner);
    const token = await factory.deploy();
    const deployTx = token.deploymentTransaction?.();
    await token.waitForDeployment();
    if (deployTx?.wait) await deployTx.wait();
    const tokenAddress = (token as any).target || (await (token as any).getAddress?.());
    const mintTx = await (token as any).mint(sender, parseUnits("1000000", 18));
    await mintTx.wait?.();
    deployed.push({ ...t, address: tokenAddress });
  }

  const apiHealthUrl = `${apiBaseUrl}/healthz`;
  await waitForApiReady(apiHealthUrl).catch((e) => {
    console.error(e);
    throw e;
  });

  for (const d of deployed) {
    await addSupportedToken(apiBaseUrl, "localhost", {
      tokenAddress: d.address,
      symbol: d.symbol,
      name: d.name,
      decimals: 18,
    });
  }

  console.log("Dev seed complete:", deployed);
}

async function main() {
  // Force development defaults
  process.env.NODE_ENV = process.env.NODE_ENV || "development";
  // Use a local sqlite database for dev
  process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./dev.db?connection_limit=1";

  const sqliteDbCandidates = new Set<string>();
  const resolvedDbFile = resolveSqliteFileFromEnvValue(process.env.DATABASE_URL);
  if (resolvedDbFile) sqliteDbCandidates.add(resolvedDbFile);
  sqliteDbCandidates.add(path.join(backendDir, "dev.db"));
  sqliteDbCandidates.add(path.join(prismaDir, "dev.db"));

  const { changed, original } = await ensureSqlitePrismaSchema();

  let fork: Awaited<ReturnType<typeof startFork>> | undefined;
  try {
    // Prepare DB and client
    await run("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"]);
    await run("npx", ["prisma", "generate"]);

    // Start local fork and seed supported tokens
    fork = await startFork();

    // Start the dev server (tsx watch)
    const child = spawn("npx", ["tsx", "watch", "src/index.ts"], {
      stdio: "inherit",
      cwd: backendDir,
      env: { ...process.env },
      shell: true,
    });

    const stop = async (code?: number) => {
      try { child.kill(); } catch {}
      await fork?.close().catch(() => {});
      // Cleanup sqlite files
      await Promise.all(Array.from(sqliteDbCandidates).map((p) => fs.rm(p, { force: true }).catch(() => {})));
      await restorePrismaSchemaIfChanged(changed, original);
      try { await run("npx", ["prisma", "generate"]); } catch {}
      process.exit(code ?? 0);
    };

    process.on("SIGINT", () => stop(130));
    process.on("SIGTERM", () => stop(143));
    process.on("uncaughtException", async (err) => {
      console.error(err);
      await stop(1);
    });

    child.on("close", async (code) => {
      await stop(code ?? 0);
    });

    // Deploy demo tokens to the fork and register them via the API
    const apiPort = Number(process.env.PORT || 4000);
    const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
    try {
      await deployAndRegisterTokens(apiBaseUrl);
    } catch (e) {
      console.error("Token deployment/registration failed:", e);
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


