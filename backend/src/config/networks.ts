import { AbstractProvider, JsonRpcProvider } from "ethers";

export type NetworkName = "ethereum" | "sepolia" | "matic";

type NetworkConfig = {
  chainId: number;
  provider: AbstractProvider;
};

function makeProvider(rpcUrl: string | undefined, fallbackUrl: string): AbstractProvider {
  const url = rpcUrl && rpcUrl.length > 0 ? rpcUrl : fallbackUrl;
  return new JsonRpcProvider(url);
}

const DEFAULT_MAINNET = "https://ethereum.publicnode.com";
const DEFAULT_SEPOLIA = "https://ethereum-sepolia.publicnode.com";
const DEFAULT_POLYGON = "https://polygon-rpc.com";

const ethereumProvider = makeProvider(process.env.MAINNET_RPC_URL, DEFAULT_MAINNET);
const sepoliaProvider = makeProvider(process.env.SEPOLIA_RPC_URL, DEFAULT_SEPOLIA);
const polygonProvider = makeProvider(process.env.POLYGON_RPC_URL, DEFAULT_POLYGON);

export const NETWORKS: Record<NetworkName, NetworkConfig> = {
  ethereum: { chainId: 1, provider: ethereumProvider },
  sepolia: { chainId: 11155111, provider: sepoliaProvider },
  matic: { chainId: 137, provider: polygonProvider },
};

export function getSupportedNetworks(): NetworkName[] {
  return Object.keys(NETWORKS) as NetworkName[];
}

export function getNetworkConfig(name: string): NetworkConfig | undefined {
  const key = name.toLowerCase() as NetworkName;
  return (NETWORKS as Record<string, NetworkConfig>)[key];
}

export function getProvider(name: string): AbstractProvider {
  const cfg = getNetworkConfig(name);
  if (!cfg) {
    throw new Error(`Unknown network: ${name}`);
  }
  return cfg.provider;
}


