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
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="max-h-96 overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left border-b border-[var(--border)]">
                <th className="p-3 pl-4 sticky top-0 bg-[var(--surface)] z-10">Token</th>
                <th className="p-3 sticky top-0 bg-[var(--surface)] z-10">Symbol</th>
                <th className="p-3 sticky top-0 bg-[var(--surface)] z-10">Balance</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td className="p-3 pl-4" colSpan={3}>Loading…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td className="p-3 pl-4" colSpan={3}>No tokens</td></tr>
              )}
              {filtered.map((b) => (
                <tr key={`${b.network}-${b.symbol}`} className="border-b border-[var(--border)] hover:bg-[var(--muted)]">
                  <td className="p-3 pl-4">
                    <Link href={`/token/${encodeURIComponent(b.symbol)}?network=${encodeURIComponent(b.network)}`} className="underline">
                      {b.name}
                    </Link>
                  </td>
                  <td className="p-3">{b.symbol}</td>
                  <td className="p-3">{b.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


