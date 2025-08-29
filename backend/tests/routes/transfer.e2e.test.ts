import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

// Runs when fork is available (either provided by env or started by globalSetup)
const hasFork = !!process.env.FORK_RPC_URL || !!process.env.SEPOLIA_RPC_URL;

const maybe = hasFork ? describe : describe.skip;

maybe("POST /transfer (e2e fork)", () => {
	beforeAll(() => {
		// Point sepolia provider to fork if provided
		process.env.SEPOLIA_RPC_URL = process.env.FORK_RPC_URL as string;
	});

	it("submits transfer and returns tx hash", async () => {
		const to = process.env.E2E_TO_ADDRESS ?? "0x0000000000000000000000000000000000000001";
		// token must exist on the forked chain; require env to specify it
		const token = process.env.E2E_TOKEN_ADDRESS;
		if (!token) {
			// eslint-disable-next-line no-console
			console.warn("E2E_TOKEN_ADDRESS not set. Skipping.");
			return;
		}
		const amount = process.env.E2E_AMOUNT ?? "0.000001";
		const res = await request(app)
			.post("/transfer")
			.send({ network: "sepolia", to, token, amount })
			.expect(202);
		expect(res.body.hash).toMatch(/^0x[0-9a-fA-F]{64}$/);
	});
});
