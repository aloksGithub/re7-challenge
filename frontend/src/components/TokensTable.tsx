"use client";

import Link from "next/link";
import { useBalances, useWalletAddress } from "@/hooks/useBackend";
import { useNetwork } from "@/context/NetworkContext";

export function TokensTable() {
  const { selected } = useNetwork();
  const { data: address } = useWalletAddress();
  const { data: balances, isLoading } = useBalances(address);

  const filtered = (balances ?? []).filter((b) => b.network === selected);

  return (
    <div className="w-full">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="p-2">Token</th>
            <th className="p-2">Symbol</th>
            <th className="p-2">Balance</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr><td className="p-2" colSpan={3}>Loading…</td></tr>
          )}
          {!isLoading && filtered.length === 0 && (
            <tr><td className="p-2" colSpan={3}>No tokens</td></tr>
          )}
          {filtered.map((b) => (
            <tr key={`${b.network}-${b.symbol}`} className="border-b hover:bg-[#f7f7f7]">
              <td className="p-2">
                <Link href={`/token/${encodeURIComponent(b.symbol)}?network=${encodeURIComponent(b.network)}`} className="underline">
                  {b.name}
                </Link>
              </td>
              <td className="p-2">{b.symbol}</td>
              <td className="p-2">{b.balance}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


