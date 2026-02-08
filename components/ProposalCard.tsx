"use client";

import { useState } from "react";

export type Proposal = {
  id: string;
  title: string;
  ai_summary: string | null;
  requested_amount: string | number;
  vote_count: number;
};

const VOTED_KEY = "human-treasury-voted";

function getVotedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(VOTED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setVotedId(id: string) {
  try {
    const ids = getVotedIds();
    if (ids.includes(id)) return;
    localStorage.setItem(VOTED_KEY, JSON.stringify([...ids, id]));
  } catch {
    // ignore
  }
}

export default function ProposalCard({
  proposal,
  onVoted,
  authToken,
  isBridgeAvailable,
}: {
  proposal: Proposal;
  onVoted?: () => void;
  authToken?: string | null;
  isBridgeAvailable?: boolean;
}) {
  const [voted, setVoted] = useState(() => getVotedIds().includes(proposal.id));
  const [loading, setLoading] = useState(false);

  const canVote = Boolean(authToken && isBridgeAvailable);
  const needsAlien = !isBridgeAvailable || !authToken;

  async function handleVote() {
    if (voted || loading || !authToken) return;
    setLoading(true);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ proposalId: proposal.id }),
      });
      if (res.ok) {
        setVoted(true);
        setVotedId(proposal.id);
        onVoted?.();
      }
    } finally {
      setLoading(false);
    }
  }

  const amount =
    typeof proposal.requested_amount === "number"
      ? `${proposal.requested_amount} ALIEN`
      : String(proposal.requested_amount);

  return (
    <article className="w-full rounded-xl bg-white p-6 text-[#0c0c0c] shadow-sm">
      <h2 className="text-xl font-semibold sm:text-2xl">{proposal.title}</h2>
      {proposal.ai_summary && (
        <p className="mt-3 text-zinc-600 sm:text-lg">{proposal.ai_summary}</p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-sm sm:gap-6 sm:text-base">
          <span className="font-medium">{amount}</span>
          <span className="text-zinc-500">
            {proposal.vote_count} vote{proposal.vote_count !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={handleVote}
          disabled={voted || loading || !canVote}
          className="rounded-lg bg-[#0c0c0c] px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
          title={needsAlien ? "Open in Alien app to vote" : undefined}
        >
          {voted
            ? "Voted"
            : loading
              ? "..."
              : needsAlien
                ? "Open in Alien to vote"
                : "Vote"}
        </button>
      </div>
    </article>
  );
}
