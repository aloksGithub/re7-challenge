// Start a local Ganache instance programmatically. If not available, skip and rely on env.
let server: any | undefined;

export default async function() {
	if (process.env.FORK_RPC_URL) return () => {};

	let Ganache: any;
	try {
		// Dynamic import so it is optional
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		Ganache = (await import("ganache")).default ?? (await import("ganache"));
	} catch {
		return () => {};
	}

	const upstream = process.env.UPSTREAM_RPC_URL || "https://ethereum.publicnode.com";
	const forkOpts = upstream ? { fork: { url: upstream } } : {};

	server = Ganache.server({
		logging: { quiet: true },
		chain: { chainId: 1337, networkId: 1337 },
		wallet: { deterministic: true },
		...forkOpts,
	});

	await server.listen(8545);
	process.env.FORK_RPC_URL = "http://127.0.0.1:8545";

	try {
		const accounts = server.provider.getInitialAccounts?.();
		const first = accounts ? (Object.values(accounts)[0] as any) : undefined;
		const key = first?.secretKey ?? first?.privateKey;
		if (key) {
			let hexKey: string | undefined;
			if (typeof key === "string") {
				hexKey = key.startsWith("0x") ? key : ("0x" + key);
			} else if (Buffer.isBuffer(key)) {
				hexKey = "0x" + (key as Buffer).toString("hex");
			} else if (key?.type === "Buffer" && Array.isArray(key?.data)) {
				hexKey = "0x" + Buffer.from(key.data).toString("hex");
			}
			if (hexKey) {
				process.env.PRIVATE_KEY = hexKey;
			}
		}
	} catch {}

	return async () => {
		try { await server?.close(); } catch {}
	};
}


