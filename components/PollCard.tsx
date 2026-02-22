"use client";

import Link from "next/link";

export type PollListItem = {
  id: string;
  title: string;
  description: string | null;
  type: "standard" | "capital";
  audience_type: "public" | "targeted";
  end_time: string | null;
  status: string;
  votes_cast?: number;
  total_invited?: number;
  participation_pct?: number;
  has_voted?: boolean;
};

function formatTimeLeft(endTime: string | null): string | null {
  if (!endTime) return null;
  const end = new Date(endTime);
  const now = new Date();
  if (end <= now) return "Ended";
  const ms = end.getTime() - now.getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d left`;
  }
  return `${hours}h ${mins}m left`;
}

export default function PollCard({
  poll,
  authToken,
  isBridgeAvailable,
}: {
  poll: PollListItem;
  authToken?: string | null;
  isBridgeAvailable?: boolean;
}) {
  const timeLeft = formatTimeLeft(poll.end_time);
  const canVote = Boolean(authToken && isBridgeAvailable && poll.status === "active" && !poll.has_voted);
  const needsAlien = !isBridgeAvailable || !authToken;
  const description = poll.description?.trim();
  const truncatedDesc = description && description.length > 120 ? description.slice(0, 120) + "…" : description;

  return (
    <article className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <Link href={`/polls/${poll.id}`} className="block">
        <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">{poll.title}</h2>
        {truncatedDesc && <p className="mt-2 text-slate-600 sm:text-base">{truncatedDesc}</p>}
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700">
          {poll.type === "capital" ? "Capital" : "Standard"}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700">
          {poll.audience_type === "public" ? "Public" : "Targeted"}
        </span>
        {poll.type === "capital" && (
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-800">
            Capital
          </span>
        )}
        {timeLeft && (
          <span className="text-slate-500">{timeLeft}</span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
          <span>{poll.votes_cast ?? 0} vote{(poll.votes_cast ?? 0) !== 1 ? "s" : ""}</span>
          {poll.audience_type === "targeted" && poll.participation_pct != null && (
            <span>{poll.participation_pct}% participation</span>
          )}
        </div>
        <Link
          href={`/polls/${poll.id}`}
          className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:pointer-events-none disabled:opacity-50 sm:text-base"
          onClick={(e) => {
            if (canVote) return;
            if (needsAlien) e.preventDefault();
          }}
        >
          {poll.has_voted ? "You voted" : poll.status === "closed" ? "View results" : needsAlien ? "Open in Alien to vote" : "Vote"}
        </Link>
      </div>
    </article>
  );
}
