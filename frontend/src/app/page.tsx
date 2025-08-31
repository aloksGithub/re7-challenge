"use client";

import { Header } from "@/components/Header";
import { TokensTable } from "@/components/TokensTable";

export default function Home() {
  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto pb-16">
      <Header />
      <TokensTable />
    </div>
  );
}
