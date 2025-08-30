import { JsonRpcProvider, Wallet, ContractFactory, parseUnits } from "ethers";
import { PrismaClient } from "@prisma/client";
import { compileToken } from "./compileToken.js";

async function getSigner(provider: JsonRpcProvider) {
  const pk = process.env.PRIVATE_KEY;
  if (pk && pk.length > 0) return new Wallet(pk, provider);
  const signer = (provider as any)?.getSigner?.();
  if (!signer) throw new Error("No signer available; set PRIVATE_KEY");
  return signer as any;
}

async function waitForDb(prisma: PrismaClient) {
  const max = 60;
  for (let i = 0; i < max; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("Database not ready after waiting");
}

function toLower(x: string) {
  return typeof x === "string" ? x.toLowerCase() : x;
}

async function upsertSupportedToken(
  prisma: PrismaClient,
  network: string,
  tokenAddress: string,
  symbol: string,
  name: string,
  decimals: number,
) {
  const addr = toLower(tokenAddress);
  await prisma.supportedToken.upsert({
    where: { network_tokenAddress: { network, tokenAddress: addr } },
    update: { symbol, name, decimals, enabled: true },
    create: { network, tokenAddress: addr, symbol, name, decimals, enabled: true },
  });
}

export async function main() {
  const rpc = process.env.FORK_RPC_URL || process.env.SEPOLIA_RPC_URL || process.env.RPC_URL;
  if (!rpc) {
    console.log("No RPC found; skipping seed");
    return;
  }
  const provider = new JsonRpcProvider(rpc);
  const signer = await getSigner(provider);
  const sender = await (signer as any).getAddress?.();

  const prisma = new PrismaClient();
  try {
    await waitForDb(prisma);

    const tokens = [1, 2, 3, 4, 5].map((i) => ({
      name: `Test Token ${i}`,
      symbol: `TST${i}`,
    }));

    const deployed: Array<{ name: string; symbol: string; address: string }> = [];
    for (const t of tokens) {
      const { abi, bytecode } = await compileToken(t.name, t.symbol);
      const factory = new ContractFactory(abi, bytecode, signer);
      const token = await factory.deploy();
      await token.waitForDeployment();
      const tokenAddress = (token as any).target || (await (token as any).getAddress?.());
      const mintTx = await (token as any).mint(sender, parseUnits("1000000", 18));
      await mintTx.wait?.();
      deployed.push({ ...t, address: tokenAddress });
    }

    for (const d of deployed) {
      await upsertSupportedToken(prisma, "sepolia", d.address, d.symbol, d.name, 18);
    }

    console.log("Seed complete:", deployed);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}


