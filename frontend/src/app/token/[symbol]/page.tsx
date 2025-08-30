"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useNetwork } from "@/context/NetworkContext";
import { useSupportedTokens, useTransactions, useTransfer, useWalletAddress } from "@/hooks/useBackend";

type TabId = "transfer" | "history";

function Tabs({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <div className="flex gap-4 border-b mb-4">
      {([
        { id: "transfer", label: "Transfer" },
        { id: "history", label: "History" },
      ] as const).map((t) => (
        <button
          key={t.id}
          className={`px-3 py-2 ${active === t.id ? "border-b-2 border-black" : "text-gray-500"}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function TransferForm({ tokenAddress }: { tokenAddress: string }) {
  const { selected } = useNetwork();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const transfer = useTransfer();

  return (
    <form
      className="max-w-md space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!selected) return;
        transfer.mutate({ network: selected, to, token: tokenAddress, amount });
      }}
    >
      <div className="flex flex-col">
        <label className="text-sm">To</label>
        <input className="border rounded px-2 py-1" value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x..." />
      </div>
      <div className="flex flex-col">
        <label className="text-sm">Amount</label>
        <input className="border rounded px-2 py-1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1.5" />
      </div>
      <div className="flex items-center gap-2">
        <button type="submit" className="bg-black text-white px-3 py-1 rounded" disabled={transfer.isPending}>
          {transfer.isPending ? "Transferring…" : "Transfer"}
        </button>
        {transfer.isSuccess && <span className="text-green-600">Submitted: {transfer.data.hash}</span>}
        {transfer.isError && <span className="text-red-600">{(transfer.error as Error)?.message}</span>}
      </div>
    </form>
  );
}

function History({ tokenAddress }: { tokenAddress: string }) {
  const { data: address } = useWalletAddress();
  console.log(address)
  const { data: txs, isLoading } = useTransactions(address, tokenAddress);
  return (
    <div>
      {isLoading && <div>Loading…</div>}
      {!isLoading && (txs?.length ?? 0) === 0 && <div>No transactions</div>}
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="p-2">Hash</th>
            <th className="p-2">From</th>
            <th className="p-2">To</th>
            <th className="p-2">Amount</th>
            <th className="p-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {(txs ?? []).map((t) => (
            <tr key={t.id} className="border-b">
              <td className="p-2 font-mono text-xs">{t.txHash}</td>
              <td className="p-2 font-mono text-xs">{t.fromAddress}</td>
              <td className="p-2 font-mono text-xs">{t.toAddress}</td>
              <td className="p-2">{t.amount}</td>
              <td className="p-2">{new Date(t.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TokenPage({ params }: { params: { symbol: string } }) {
  const search = useSearchParams();
  const { selected } = useNetwork();
  const { symbol } = useParams();
  const network = search.get("network") ?? selected ?? "";
  const { data: tokens, isLoading } = useSupportedTokens(network);
  const router = useRouter();

  const tokenAddress = useMemo(() => tokens?.find((t) => t.symbol === symbol)?.tokenAddress ?? "", [tokens, symbol]);

  const [tab, setTab] = useState<TabId>("transfer");

  if (!network) return <div className="p-6">Select a network</div>;
  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!tokenAddress) return (
    <div className="p-6 space-y-4">
      <div>Token not found for network {network}.</div>
      <button className="underline" onClick={() => router.back()}>Go back</button>
    </div>
  );

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="mb-4">
        <Link href="/" className="underline">← Back</Link>
      </div>
      <h1 className="text-2xl font-semibold mb-2">{symbol} on {network}</h1>
      <Tabs active={tab} onChange={setTab} />
      {tab === "transfer" ? (
        <TransferForm tokenAddress={tokenAddress} />
      ) : (
        <History tokenAddress={tokenAddress} />
      )}
    </div>
  );
}


