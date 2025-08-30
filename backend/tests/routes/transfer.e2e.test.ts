import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { JsonRpcProvider, Wallet, ContractFactory, parseUnits } from "ethers";
import solc from "solc";

// Runs when fork is available (either provided by env or started by globalSetup)
const hasFork = !!process.env.FORK_RPC_URL || !!process.env.SEPOLIA_RPC_URL;

const maybe = hasFork ? describe : describe.skip;

maybe("POST /transfer (e2e fork)", () => {
	beforeAll(async () => {
		// Point sepolia provider to fork if provided
		console.log("CHECK1")

		process.env.SEPOLIA_RPC_URL = (process.env.FORK_RPC_URL || process.env.SEPOLIA_RPC_URL) as string;

		const source = `
contract TestToken {
  string public name;
  string public symbol;
  uint8 public decimals = 18;
  uint256 public totalSupply;
  mapping(address => uint256) public balanceOf;

  event Transfer(address indexed from, address indexed to, uint256 value);

  constructor() {
  }

  function mint(address to, uint256 amount) public {
    balanceOf[to] += amount;
    totalSupply += amount;
    emit Transfer(address(0), to, amount);
  }

  function transfer(address to, uint256 amount) public returns (bool) {
    require(balanceOf[msg.sender] >= amount, "insufficient");
    balanceOf[msg.sender] -= amount;
    balanceOf[to] += amount;
    emit Transfer(msg.sender, to, amount);
    return true;
  }
}`;

		const input = {
			language: "Solidity",
			sources: { "Token.sol": { content: source } },
			settings: {
				optimizer: { enabled: true, runs: 200 },
				outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } },
			},
		};

		const compiled = JSON.parse(solc.compile(JSON.stringify(input)));
		const errors = (compiled.errors || []).filter((e: any) => e.severity === "error");
		if (errors.length) {
			throw new Error("Solc compile failed: " + errors.map((e: any) => e.formattedMessage || e.message).join("\n"));
		}
		const artifact = compiled.contracts["Token.sol"]["TestToken"];
		const abi = artifact.abi;
		const bytecode = "0x" + artifact.evm.bytecode.object;

		const rpc = process.env.FORK_RPC_URL || process.env.SEPOLIA_RPC_URL;
		if (!rpc) throw new Error("No RPC available for deployment");
		const provider = new JsonRpcProvider(rpc);

		const pk = process.env.PRIVATE_KEY;
		const signer = pk && pk.length > 0 ? new Wallet(pk, provider) : await (provider as any).getSigner();

		const factory = new ContractFactory(abi, bytecode, signer);
		const token = await factory.deploy();
		await token.waitForDeployment();
		const tokenAddress = (token as any).target || (await (token as any).getAddress?.());

		// Mint to backend signer (sender)
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
			.send({ network: "sepolia", to, token, amount })
			.expect(202);
		expect(res.body.hash).toMatch(/^0x[0-9a-fA-F]{64}$/);
	});
});
