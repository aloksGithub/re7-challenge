import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import * as contractSvc from "../../src/services/contract.js";
import * as dbSvc from "../../src/services/dbService.js";

vi.mock("../../src/services/contract.js");
vi.mock("../../src/services/dbService.js");

describe("POST /transfer (unit)", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("returns 400 when missing fields or invalid addresses", async () => {
		await request(app).post("/transfer").set("x-api-key", process.env.API_KEY || "test-key").send({}).expect(400);
		await request(app).post("/transfer").set("x-api-key", process.env.API_KEY || "test-key").send({ network: "sepolia" }).expect(400);
		await request(app).post("/transfer").set("x-api-key", process.env.API_KEY || "test-key").send({ network: "sepolia", to: "0x0" }).expect(400);
	});

	it("rejects when to address is blacklisted", async () => {
		(dbSvc.isBlacklisted as any).mockResolvedValue(true);
		const res = await request(app)
			.post("/transfer")
			.set("x-api-key", process.env.API_KEY || "test-key")
			.send({ network: "sepolia", to: "0x0000000000000000000000000000000000000001", token: "0x0000000000000000000000000000000000000002", amount: "1" })
			.expect(400);
		expect(res.body.error.message).toMatch(/blacklisted/);
		expect(dbSvc.isBlacklisted).toHaveBeenCalled();
		expect(contractSvc.transferErc20).not.toHaveBeenCalled();
	});

	it("calls transferErc20 and returns 202", async () => {
		(dbSvc.isBlacklisted as any).mockResolvedValue(false);
		(contractSvc.transferErc20 as any).mockResolvedValue({ hash: "0xhash" });
		const body = { network: "sepolia", to: "0x0000000000000000000000000000000000000001", token: "0x0000000000000000000000000000000000000002", amount: "1" };
		const res = await request(app).post("/transfer").set("x-api-key", process.env.API_KEY || "test-key").send(body).expect(202);
		expect(contractSvc.transferErc20).toHaveBeenCalledWith({ network: body.network, tokenAddress: body.token, to: body.to, amount: body.amount });
		expect(res.body).toEqual({ hash: "0xhash" });
	});

	it("requires API key for transfer", async () => {
		await request(app).post("/transfer").send({ network: "sepolia", to: "0x0000000000000000000000000000000000000001", token: "0x0000000000000000000000000000000000000002", amount: "1" }).expect(401);
	});
});


