"use client";

import { useNetwork } from "@/context/NetworkContext";
import { useWalletAddress } from "@/hooks/useBackend";

export function Header() {
  const { networks, selected, setSelected, isLoading } = useNetwork();
  const { data: wallet, isLoading: loadingWallet } = useWalletAddress();

  return (
    <div className="w-full flex items-center justify-between py-4">
      <div className="flex items-center gap-2">
        <label className="text-sm">Network</label>
        <select
          className="border rounded px-2 py-1"
          value={selected ?? ""}
          onChange={(e) => setSelected(e.target.value)}
          disabled={isLoading}
        >
          {(networks ?? []).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <div className="text-sm font-mono">
        {loadingWallet ? "…" : wallet}
      </div>
    </div>
  );
}


