import { buildUrl, API_KEY } from "./config";
import type { BalanceItem, Network, SupportedToken, TransactionItem, WalletAddressResponse } from "./types";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text || `Request failed with ${res.status}`;
    try {
      if (text) {
        const data = JSON.parse(text);
        message = data?.error?.message || data?.message || message;
      }
    } catch {
      // non-JSON body; keep message as-is
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function fetchNetworks(): Promise<Network[]> {
  const res = await fetch(buildUrl("/networks"), { cache: "no-store" });
  return handle<Network[]>(res);
}

export async function fetchWalletAddress(): Promise<WalletAddressResponse> {
  const res = await fetch(buildUrl("/wallet-address"), { cache: "no-store" });
  return handle<WalletAddressResponse>(res);
}

export async function fetchBalances(address: string): Promise<BalanceItem[]> {
  const res = await fetch(buildUrl(`/tokens/${address}`), { cache: "no-store" });
  return handle<BalanceItem[]>(res);
}

export async function fetchSupportedTokens(network: string): Promise<SupportedToken[]> {
  const res = await fetch(buildUrl(`/supported-tokens/${network}`), { cache: "no-store" });
  return handle<SupportedToken[]>(res);
}

export async function fetchTransactions(address: string, token: string): Promise<TransactionItem[]> {
  const res = await fetch(buildUrl(`/transactions/${address}/${token}`), { cache: "no-store" });
  return handle<TransactionItem[]>(res);
}

export async function postTransfer(params: { network: string; to: string; token: string; amount: string; }): Promise<{ hash: string }> {
  const res = await fetch(buildUrl("/transfer"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(API_KEY ? { "x-api-key": API_KEY } : {}) },
    body: JSON.stringify(params),
  });
  return handle<{ hash: string }>(res);
}
