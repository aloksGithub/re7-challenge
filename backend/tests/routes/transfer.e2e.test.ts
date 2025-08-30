import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { JsonRpcProvider, Wallet, ContractFactory, parseUnits } from "ethers";
import { compileToken } from "../../scripts/compileToken.js";

// Runs when fork is available (either provided by env or started by globalSetup)
const hasFork = !!process.env.FORK_RPC_URL;

const maybe = hasFork ? describe : describe.skip;

async function deployToken(name: string, symbol: string) {
	const { abi, bytecode } = await compileToken(name, symbol);

	const rpc = process.env.FORK_RPC_URL;
	if (!rpc) throw new Error("No RPC available for deployment");
	const provider = new JsonRpcProvider(rpc);

	const pk = process.env.PRIVATE_KEY;
	const signer = pk && pk.length > 0 ? new Wallet(pk, provider) : await (provider as any).getSigner();

	const factory = new ContractFactory(abi as any, bytecode, signer);
	const token = await factory.deploy();
	await token.waitForDeployment();
	const tokenAddress = (token as any).target || (await (token as any).getAddress?.());

	return {tokenAddress, token}
}

maybe("POST /transfer (e2e fork)", () => {
	beforeAll(async () => {
		const {tokenAddress, token} = await deployToken("TEST", "TST");

		// Mint to backend signer (sender)
    const rpc = process.env.FORK_RPC_URL;
    if (!rpc) throw new Error("No RPC available for deployment");
    const provider = new JsonRpcProvider(rpc);
		const pk = process.env.PRIVATE_KEY;
		const signer = pk && pk.length > 0 ? new Wallet(pk, provider) : await (provider as any).getSigner();
		const sender = await signer.getAddress();
		// Some test nodes require waiting for deployment to be mined before state-changing calls
		const mintTx = await (token as any).mint(sender, parseUnits("1000", 18));
		await mintTx.wait?.();

		process.env.E2E_TOKEN_ADDRESS = tokenAddress as string;
	});

	it("submits transfer and returns tx hash", async () => {
		const to = process.env.E2E_TO_ADDRESS ?? "0x0000000000000000000000000000000000000123";
		// token must exist on the forked chain; require env to specify it
		const token = process.env.E2E_TOKEN_ADDRESS!;
		const amount = process.env.E2E_AMOUNT ?? "0.000001";
		const res = await request(app)
			.post("/transfer")
			.send({ network: "localhost", to, token, amount })
			.expect(202);
		expect(res.body.hash).toMatch(/^0x[0-9a-fA-F]{64}$/);
	});
});
