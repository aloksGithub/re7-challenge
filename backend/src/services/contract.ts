import { Contract, Wallet, formatUnits, parseUnits } from 'ethers';
import { getProvider, getSupportedNetworks } from '../config/networks.js';
import { getSupportedToken, getSupportedTokensForNetwork } from './dbService.js';

const ERC20_ABI = [
  'function transfer(address to, uint256 value) public returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
];

export type TransferParams = {
  network: string;
  tokenAddress: string;
  to: string;
  amount: string; // human amount, e.g. "1.5"
  decimals?: number; // optional; will not fetch if provided
  waitForReceipt?: boolean;
};

function getWalletFromEnv(network: string) {
  const provider = getProvider(network);
  const pk = process.env.PRIVATE_KEY;
  if (pk && pk.length > 0) {
    return new Wallet(pk, provider);
  }
  const signer = (provider as any)?.getSigner?.();
  if (!signer) {
    throw new Error('PRIVATE_KEY is required to sign transactions');
  }
  return signer as any;
}

export function getAddressFromEnv() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    throw new Error('PRIVATE_KEY is required to get address');
  }
  const signer = new Wallet(pk);
  return signer.address;
}

export async function transferErc20(params: TransferParams) {
  const { network, tokenAddress, to, amount, decimals, waitForReceipt } = params;
  const signer = getWalletFromEnv(network);
  const contract = new Contract(tokenAddress, ERC20_ABI, signer);

  const tokenDecimals = typeof decimals === 'number' ? decimals : await contract.decimals();
  const value = parseUnits(amount, tokenDecimals);

  const tx = await contract.transfer(to, value);
  if (waitForReceipt) {
    await tx.wait();
  }
  return { hash: tx.hash };
}

export async function getBalance(user: string, tokenAddress: string, network: string) {
  const provider = getProvider(network);
  const contract = new Contract(tokenAddress, ERC20_ABI, provider);
  const balance = await contract.balanceOf(user);
  const token = await getSupportedToken(network, tokenAddress);
  const decimals = token?.decimals || (await contract.decimals());
  return { balance: formatUnits(balance, decimals), decimals };
}

export async function getNetworkBalances(user: string, network: string) {
  const tokens = await getSupportedTokensForNetwork(network);
  const balances = await Promise.all(
    tokens.map(async (token) => {
      const { balance, decimals } = await getBalance(user, token.tokenAddress, network);
      return {
        network,
        symbol: token.symbol,
        name: token.name,
        balance,
        decimals,
      };
    }),
  );
  return balances;
}

export async function getBalances(user: string) {
  const networks = getSupportedNetworks();
  const balances = (
    await Promise.all(
      networks.map(async (network) => {
        const balances = await getNetworkBalances(user, network);
        return balances;
      }),
    )
  ).flat();
  return balances;
}

export default {
  transferErc20,
};
