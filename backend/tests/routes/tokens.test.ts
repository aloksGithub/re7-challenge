import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import * as contractSvc from "../../src/services/contract.js";

vi.mock("../../src/services/contract.js");

describe("tokens routes", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("GET /tokens/:address returns balances via service", async () => {
		(contractSvc.getBalances as any).mockResolvedValue([
			{ network: "sepolia", symbol: "USDC", name: "USD Coin", balance: 1.23, decimals: 6 },
		]);

		const addr = "0x0000000000000000000000000000000000000001";
		const res = await request(app).get(`/tokens/${addr}`).expect(200);
		expect(res.body).toEqual([
			{ network: "sepolia", symbol: "USDC", name: "USD Coin", balance: 1.23, decimals: 6 },
		]);
		expect(contractSvc.getBalances).toHaveBeenCalledWith(addr);
	});

	it("GET /tokens/:address returns 400 for invalid address", async () => {
		await request(app).get(`/tokens/not-an-address`).expect(400);
	});
});


