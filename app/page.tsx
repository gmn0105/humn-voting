"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAlien } from "@alien_org/react";
import TreasuryCard from "@/components/TreasuryCard";
import ContributeButton from "@/components/ContributeButton";
import ProposalCard, { type Proposal } from "@/components/ProposalCard";

export default function Home() {
  const { authToken, isBridgeAvailable } = useAlien();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchProposals() {
    try {
      const res = await fetch("/api/proposals");
      if (res.ok) {
        const data = await res.json();
        setProposals(Array.isArray(data) ? data : []);
      }
    } catch {
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProposals();
  }, []);

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-[#fafafa]">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Human Treasury
          </h1>
          <p className="mt-2 text-xl text-zinc-400 sm:text-2xl">
            One Human. One Vote.
          </p>
        </header>

        <section className="mb-10">
          <TreasuryCard
            totalPool="500 ALIEN"
            timeLeft="02:14:23"
            verifiedHumans={37}
          />
          <ContributeButton />
        </section>

        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Proposals
            </h2>
            <Link
              href="/submit"
              className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-[#0c0c0c] sm:text-base"
            >
              Submit
            </Link>
          </div>

          {loading ? (
            <p className="text-zinc-500">Loading proposals…</p>
          ) : proposals.length === 0 ? (
            <p className="text-zinc-500">No proposals yet.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {proposals.map((p) => (
                <li key={p.id}>
                  <ProposalCard
                    proposal={p}
                    onVoted={fetchProposals}
                    authToken={authToken}
                    isBridgeAvailable={isBridgeAvailable}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
