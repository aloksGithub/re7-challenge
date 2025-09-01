"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useNetwork } from "@/context/NetworkContext";
import { useSupportedTokens, useTransactions, useTransfer, useWalletAddress } from "@/hooks/useBackend";

type TabId = "transfer" | "history";

function Tabs({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <div className="flex gap-4 border-b mb-4 border-[var(--border)]">
      {([
        { id: "transfer", label: "Transfer" },
        { id: "history", label: "History" },
      ] as const).map((t) => (
        <button
          key={t.id}
          className={`px-3 py-2 -mb-[1px] hover:cursor-pointer ${active === t.id ? "border-b-2 border-[var(--accent)] text-[var(--foreground)]" : "text-gray-500 hover:text-[var(--foreground)]"}`}
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
  const [modal, setModal] = useState<{ visible: boolean; type: "success" | "error"; message?: string; hash?: string }>({ visible: false, type: "success" });
  const [modalMounted, setModalMounted] = useState(false);
  const [errors, setErrors] = useState<{ to?: string; amount?: string }>({});

  function summarizeError(err: unknown): string {
    const anyErr = err as {
      message?: string;
      code?: string | number;
      error?: { message?: string; code?: string | number };
      data?: { error?: { message?: string; code?: string | number } };
    };
    const serverMsg = anyErr?.message || anyErr?.error?.message || anyErr?.data?.error?.message;
    const serverCode = anyErr?.code || anyErr?.error?.code || anyErr?.data?.error?.code;
    if (serverMsg) return serverCode ? `${serverMsg} (${serverCode})` : serverMsg;
    const message = err instanceof Error ? err.message : String(err ?? "");
    const lower = String(message).toLowerCase();
    if (lower.includes("insufficient")) return "Insufficient funds";
    if (lower.includes("revert")) return "Transaction reverted";
    if (lower.includes("timeout")) return "Network timeout";
    if (lower.includes("forbidden")) return "Forbidden";
    if (lower.includes("unauthorized")) return "Unauthorized";
    if (lower.includes("not found")) return "Not Found";
    if (lower.includes("server")) return "Server error";
    const brief = String(message).split(/[\.!\n\r]/)[0]?.slice(0, 80).trim();
    return brief || "Unexpected error";
  }

  useEffect(() => {
    if (transfer.isSuccess) {
      setModalMounted(true);
      setModal({ visible: true, type: "success", message: "Transfer successful", hash: transfer.data?.hash });
    }
  }, [transfer.isSuccess, transfer.data]);

  useEffect(() => {
    if (transfer.isError) {
      setModalMounted(true);
      setModal({ visible: true, type: "error", message: summarizeError(transfer.error) });
    }
  }, [transfer.isError, transfer.error]);

  useEffect(() => {
    if (!modal.visible) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal((m) => ({ ...m, visible: false }));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [modal.visible]);

  useEffect(() => {
    if (modal.visible) {
      setModalMounted(true);
      return;
    }
    if (!modalMounted) return;
    const t = setTimeout(() => setModalMounted(false), 200);
    return () => clearTimeout(t);
  }, [modal.visible, modalMounted]);

  function validateInputs(): boolean {
    const next: { to?: string; amount?: string } = {};
    const toTrim = to.trim();
    const amountTrim = amount.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(toTrim)) next.to = "Enter a valid EVM address";
    if (!/^\d+(\.\d+)?$/.test(amountTrim)) next.amount = "Enter a positive decimal amount";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  return (
    <>
    <form
      className="max-w-md space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!selected) return;
        if (!validateInputs()) return;
        transfer.mutate({ network: selected, to, token: tokenAddress, amount });
      }}
    >
      <div className="flex flex-col">
        <label className="text-sm">To</label>
        <input className={`border ${errors.to ? "border-red-500" : "border-[var(--border)]"} bg-[var(--surface)] rounded px-2 py-2`} value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x..." />
        {errors.to && <span className="text-xs text-red-600 mt-1">{errors.to}</span>}
      </div>
      <div className="flex flex-col">
        <label className="text-sm">Amount</label>
        <input className={`border ${errors.amount ? "border-red-500" : "border-[var(--border)]"} bg-[var(--surface)] rounded px-2 py-2`} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1.5" />
        {errors.amount && <span className="text-xs text-red-600 mt-1">{errors.amount}</span>}
      </div>
      <div className="flex items-center gap-2">
        <button type="submit" className="bg-[var(--accent)] text-white px-4 py-2 rounded shadow hover:opacity-90 transition hover:cursor-pointer" disabled={transfer.isPending}>
          {transfer.isPending ? "Transferring…" : "Transfer"}
        </button>
      </div>
    </form>
    {modalMounted && (
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${modal.visible ? "" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ease-out ${modal.visible ? "opacity-100" : "opacity-0"}`}
          onClick={() => setModal((m) => ({ ...m, visible: false }))}
        />
        <div className={`relative z-10 w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-lg transition-all duration-200 ease-out ${modal.visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"}`}>
          {modal.type === "success" ? (
            <svg width="64" height="64" viewBox="0 0 24 24" aria-hidden="true" className="mx-auto text-green-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg width="64" height="64" viewBox="0 0 24 24" aria-hidden="true" className="mx-auto text-red-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12" />
              <path d="M18 6l-12 12" />
            </svg>
          )}
          <h3 className="mt-4 text-lg font-semibold">{modal.type === "success" ? "Transfer successful" : "Transfer failed"}</h3>
          {modal.type === "success" && modal.hash && (
            <p className="mt-2 font-mono text-xs break-all">{modal.hash}</p>
          )}
          {modal.type === "error" && modal.message && (
            <p className="mt-2 text-red-600">{modal.message}</p>
          )}
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              className="bg-[var(--accent)] text-white px-4 py-2 rounded hover:opacity-90 transition"
              onClick={() => setModal((m) => ({ ...m, visible: false }))}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function History({ tokenAddress }: { tokenAddress: string }) {
  const { data: address } = useWalletAddress();
  const { data: txs, isLoading } = useTransactions(address, tokenAddress);
  const [copied, setCopied] = useState<string | null>(null);

  const truncateMiddle = (value: string, start: number = 6, end: number = 4) => {
    if (!value) return "";
    if (value.length <= start + end + 1) return value;
    return `${value.slice(0, start)}…${value.slice(-end)}`;
  };

  const copy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      setTimeout(() => setCopied((cur) => (cur === id ? null : cur)), 1200);
    } catch {}
  };
  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="max-h-96 overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left border-b border-[var(--border)]">
                <th className="p-3 pl-4 sticky top-0 bg-[var(--surface)] z-10">Hash</th>
                <th className="p-3 sticky top-0 bg-[var(--surface)] z-10">To</th>
                <th className="p-3 sticky top-0 bg-[var(--surface)] z-10">Amount</th>
                <th className="p-3 sticky top-0 bg-[var(--surface)] z-10">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td className="p-3 pl-4" colSpan={4}>Loading…</td></tr>
              )}
              {!isLoading && (txs?.length ?? 0) === 0 && (
                <tr><td className="p-3 pl-4" colSpan={4}>No transactions</td></tr>
              )}
              {(txs ?? []).map((t) => (
                <tr key={t.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]">
                  <td className="p-3 pl-4 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span>{truncateMiddle(t.txHash)}</span>
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-[var(--muted)] cursor-pointer"
                        aria-label="Copy transaction hash"
                        title={copied === `hash-${t.id}` ? "Copied" : "Copy"}
                        onClick={() => copy(`hash-${t.id}`, t.txHash)}
                      >
                        {copied === `hash-${t.id}` ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span>{truncateMiddle(t.toAddress)}</span>
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-[var(--muted)] cursor-pointer"
                        aria-label="Copy destination address"
                        title={copied === `to-${t.id}` ? "Copied" : "Copy"}
                        onClick={() => copy(`to-${t.id}`, t.toAddress)}
                      >
                        {copied === `to-${t.id}` ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="p-3">{t.amount}</td>
                  <td className="p-3">{new Date(t.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function TokenPage() {
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
    <div className="min-h-screen p-6 max-w-5xl mx-auto pb-16">
      <div className="mb-4">
        <Link href="/" className="inline-flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5 rounded hover:bg-[var(--muted)] transition text-[var(--foreground)] no-underline">
          <span>←</span>
          <span>Back</span>
        </Link>
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


