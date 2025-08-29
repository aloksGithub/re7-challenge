import prisma from "../db.js";

type AddTransactionInput = {
  fromAddress: string;
  toAddress: string;
  tokenAddress: string;
  amount: string | number | bigint;
  network: string;
  txHash: string;
};

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

export async function addTransaction(
  input: AddTransactionInput,
) {
  const transaction = await prisma.transaction.create({
    data: {
      fromAddress: normalizeAddress(input.fromAddress),
      toAddress: normalizeAddress(input.toAddress),
      tokenAddress: normalizeAddress(input.tokenAddress),
      amount: String(input.amount),
      network: input.network,
      txHash: input.txHash,
    },
  });
  return transaction;
}

export async function isBlacklisted(address: string) {
  const addr = normalizeAddress(address);
  const result = await prisma.addressBlacklist.findUnique({ where: { address: addr } });
  return result !== null;
}

export async function blacklistAddress(address: string, reason?: string) {
  const addr = normalizeAddress(address);
  await prisma.addressBlacklist.upsert({
    where: { address: addr },
    update: { reason: reason ?? null },
    create: { address: addr, reason: reason ?? null },
  });
}

export async function removeAddressFromBlacklist(address: string) {
  const addr = normalizeAddress(address);
  const result = await prisma.addressBlacklist.deleteMany({ where: { address: addr } });
  return result.count;
}

type SupportedTokenInput = {
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  enabled?: boolean;
};

export async function addSupportedTokensForNetwork(
  network: string,
  tokens: SupportedTokenInput[],
) {
  let created = 0;
  let skipped = 0;
  for (const t of tokens) {
    const tokenAddr = normalizeAddress(t.tokenAddress);
    const exists = await prisma.supportedToken.findUnique({
      where: { network_tokenAddress: { network, tokenAddress: tokenAddr } },
      select: { id: true },
    });
    if (exists) {
      skipped += 1;
      continue;
    }
    await prisma.supportedToken.create({
      data: {
        network,
        tokenAddress: tokenAddr,
        symbol: t.symbol,
        name: t.name,
        decimals: t.decimals,
        enabled: t.enabled ?? true,
      },
    });
    created += 1;
  }
  return { created, skipped };
}

export async function removeSupportedToken(network: string, tokenAddress: string) {
  const tokenAddr = normalizeAddress(tokenAddress);
  const result = await prisma.supportedToken.deleteMany({ where: { network, tokenAddress: tokenAddr } });
  return result.count;
}

type GetTransactionsFilters = {
  from?: string;
  to?: string;
  network?: string;
  tokenAddress?: string;
  order?: "asc" | "desc";
};

export async function getTransactions(
  filters: GetTransactionsFilters = {},
) {
  const order = (filters.order ?? "desc") === "asc" ? ("asc" as const) : ("desc" as const);

  return prisma.transaction.findMany({
    where: {
      fromAddress: filters.from ? normalizeAddress(filters.from) : undefined,
      toAddress: filters.to ? normalizeAddress(filters.to) : undefined,
      network: filters.network ?? undefined,
      tokenAddress: filters.tokenAddress ? normalizeAddress(filters.tokenAddress) : undefined,
    },
    orderBy: { createdAt: order },
  });
}

export async function getSupportedTokensForNetwork(
  network: string,
) {
  return prisma.supportedToken.findMany({
    where: { network, enabled: true },
    orderBy: [{ symbol: "asc" }, { name: "asc" }],
  });
}

export async function getSupportedToken(network: string, tokenAddress: string) {
  return prisma.supportedToken.findUnique({
    where: {network_tokenAddress: {network, tokenAddress}}
  });
}
