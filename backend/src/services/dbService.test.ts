import prisma from "../db.js";
import { PrismaClient as TestPrismaClient } from "../../prisma/generated/test-client/index.js";
import {
  addSupportedTokensForNetwork,
  addTransaction,
  blacklistAddress,
  removeAddressFromBlacklist,
  getTransactions,
  getSupportedTokensForNetwork,
} from "./dbService.js";

describe("dbService CRUD", () => {
  const network = "testnet";

  beforeAll(async () => {
    // Replace prisma instance with test client bound to SQLite
    const testClient = new TestPrismaClient();
    // @ts-ignore override for tests
    prisma.$disconnect();
    // @ts-ignore override global prisma instance
    (global as any).prismaGlobal = testClient;
    // @ts-ignore rebind import
    (prisma as any) = testClient;
    // Ensure clean tables for test run
    await prisma.transaction.deleteMany({});
    await prisma.addressBlacklist.deleteMany({});
    await prisma.supportedToken.deleteMany({ where: { network } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("blacklists and unblacklists an address", async () => {
    const addr = "0xABCDEF0000000000000000000000000000000001";
    await blacklistAddress(addr, "test");
    const row = await prisma.addressBlacklist.findUnique({ where: { address: addr.toLowerCase() } });
    expect(row).toBeTruthy();
    expect(row?.reason).toBe("test");

    const removed = await removeAddressFromBlacklist(addr);
    expect(removed).toBe(1);
    const row2 = await prisma.addressBlacklist.findUnique({ where: { address: addr.toLowerCase() } });
    expect(row2).toBeNull();
  });

  it("adds supported tokens and skips duplicates", async () => {
    const tokens = [
      { tokenAddress: "0x0000000000000000000000000000000000000000", symbol: "ETH", name: "Ether", decimals: 18 },
      { tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6 },
    ];
    const res1 = await addSupportedTokensForNetwork(network, tokens);
    expect(res1.created).toBe(2);
    expect(res1.skipped).toBe(0);

    const res2 = await addSupportedTokensForNetwork(network, tokens);
    expect(res2.created).toBe(0);
    expect(res2.skipped).toBe(2);

    const listed = await getSupportedTokensForNetwork(network);
    expect(listed.length).toBeGreaterThanOrEqual(2);
  });

  it("adds and queries transactions with filters", async () => {
    const from = "0xFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFf";
    const to = "0x1111111111111111111111111111111111111111";
    const token = "0x0000000000000000000000000000000000000000";

    await addTransaction({
      fromAddress: from,
      toAddress: to,
      tokenAddress: token,
      amount: "1000000000000000000",
      network,
      txHash: "0xhash1",
    });

    await addTransaction({
      fromAddress: to,
      toAddress: from,
      tokenAddress: token,
      amount: "2000000",
      network,
      txHash: "0xhash2",
    });

    const all = await getTransactions({ network });
    expect(all.length).toBeGreaterThanOrEqual(2);

    const filteredFrom = await getTransactions({ from: from.toLowerCase(), network });
    expect(filteredFrom.every((t: any) => t.fromAddress === from.toLowerCase())).toBe(true);

    const filteredTo = await getTransactions({ to: to.toLowerCase(), network });
    expect(filteredTo.every((t: any) => t.toAddress === to.toLowerCase())).toBe(true);
  });
});


