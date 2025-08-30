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
  const apiPort = Number(process.env.PORT || 4000);
  const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
  try {
    await deployAndRegisterTokens(apiBaseUrl);
  } catch (e) {
    console.error("Token deployment/registration failed:", e);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});


