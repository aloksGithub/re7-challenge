"use client";

import { useState } from "react";
import { useNetwork } from "@/context/NetworkContext";
import { useWalletAddress } from "@/hooks/useBackend";

function truncateMiddle(value: string, start: number = 6, end: number = 4) {
  if (!value) return "";
  if (value.length <= start + end + 1) return value;
  return `${value.slice(0, start)}…${value.slice(-end)}`;
}

export function Header() {
  const { networks, selected, setSelected, isLoading } = useNetwork();
  const { data: wallet, isLoading: loadingWallet } = useWalletAddress();

  const [copied, setCopied] = useState(false);
  return (
    <div className="w-full flex items-center justify-between py-4">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500">Network</label>
        <select
          className="border border-[var(--border)] bg-[var(--surface)] rounded px-2 py-1"
          value={selected ?? ""}
          onChange={(e) => setSelected(e.target.value)}
          disabled={isLoading}
        >
          {(networks ?? []).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <div className="text-sm font-mono px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)] flex items-center gap-2">
        {loadingWallet ? "…" : truncateMiddle(wallet ?? "")}
        {!loadingWallet && wallet && (
          <button
            type="button"
            className="p-1 rounded hover:bg-[var(--muted)] cursor-pointer"
            aria-label="Copy wallet address"
            title={copied ? "Copied" : "Copy"}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(wallet);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              } catch {}
            }}
          >
            {copied ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}


