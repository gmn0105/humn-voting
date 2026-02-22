"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAlien, usePayment } from "@alien_org/react";

type Poll = {
  id: string;
  title: string;
  description: string | null;
  type: "standard" | "capital";
  creator_alien_id: string;
  audience_type: string;
  vote_identity_mode: string;
  result_visibility_mode: string;
  start_time: string;
  end_time: string | null;
  status: string;
  total_invited?: number;
  voted_count?: number;
  participation_pct?: number;
};

type Option = {
  id: string;
  option_text: string;
  vote_count?: number;
  recipient_wallet?: string;
  amount?: number;
  payout_token?: string;
  payout_network?: string;
};

export default function PollPage({ params }: { params: Promise<{ id: string }> }) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const { authToken, isBridgeAvailable } = useAlien();
  const payment = usePayment({
    onPaid: () => setSendPrizeMessage("success"),
    onCancelled: () => setSendPrizeMessage(null),
    onFailed: () => setSendPrizeMessage("error"),
  });
  const [sendPrizeMessage, setSendPrizeMessage] = useState<"success" | "error" | null>(null);
  const [data, setData] = useState<{
    poll: Poll;
    options: Option[];
    has_voted: boolean;
    user_option_id?: string;
    is_creator?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [closedSuccess, setClosedSuccess] = useState(false);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (!resolvedParams?.id) return;
    const id = resolvedParams.id;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/polls/${id}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (!res.ok) {
          if (res.status === 404) setError("Poll not found");
          else setError("Failed to load poll");
          setData(null);
          return;
        }
        const json = await res.json();
        setData(json);
        setSelectedOptionId(json.user_option_id ?? null);
      } catch {
        setError("Failed to load poll");
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [resolvedParams?.id, authToken]);

  async function handleVote() {
    if (!data?.poll || !selectedOptionId || submitting || data.has_voted) return;
    if (!authToken || !isBridgeAvailable) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/polls/${data.poll.id}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ optionId: selectedOptionId }),
      });
      if (res.ok) {
        const json = await res.json();
        setData((prev) =>
          prev
            ? {
                ...prev,
                has_voted: true,
                user_option_id: selectedOptionId,
                options: prev.options.map((o) =>
                  o.id === selectedOptionId
                    ? { ...o, vote_count: (o.vote_count ?? 0) + 1 }
                    : o,
                ),
              }
            : null,
        );
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err?.error ?? "Vote failed");
      }
    } catch {
      setError("Vote failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose() {
    if (!data?.poll || !authToken) return;
    const res = await fetch(`/api/polls/${data.poll.id}/close`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      setClosedSuccess(true);
      setData((prev) =>
        prev ? { ...prev, poll: { ...prev.poll, status: "closed" } } : null,
      );
    }
  }

  async function handleSendPrize() {
    if (!data?.poll || !authToken || !isBridgeAvailable || payment.isLoading) return;
    setSendPrizeMessage(null);
    try {
      const res = await fetch(`/api/polls/${data.poll.id}/payout-intent`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err?.error ?? "Could not create payout");
        return;
      }
      const { invoice, recipient, amount, token, network } = await res.json();
      await payment.pay({
        recipient,
        amount,
        token,
        network,
        invoice,
        item: {
          title: `Prize — ${data.poll.title}`,
          iconUrl: "/window.svg",
          quantity: 1,
        },
      });
    } catch {
      setSendPrizeMessage("error");
    }
  }

  if (!resolvedParams) return null;
  const pollId = resolvedParams.id;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <Link href="/" className="text-slate-600 hover:text-slate-900">
            ← Back
          </Link>
          <p className="mt-4 text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { poll, options, has_voted } = data;
  const isClosed = poll.status === "closed";
  const showResults =
    isClosed ||
    poll.result_visibility_mode === "live" ||
    (poll.result_visibility_mode === "after_i_vote" && has_voted);
  const totalVotes = options.reduce((s, o) => s + (o.vote_count ?? 0), 0);
  const maxCount = Math.max(...options.map((o) => o.vote_count ?? 0), 1);
  const winners = options.filter((o) => (o.vote_count ?? 0) === maxCount && maxCount > 0);
  const isTie = winners.length > 1;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-slate-600 hover:text-slate-900">
          ← Back
        </Link>

        {isClosed && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-amber-800">
            Poll Closed
          </div>
        )}

        <header className="mt-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{poll.title}</h1>
          {poll.description && (
            <p className="mt-3 text-slate-600 whitespace-pre-wrap">{poll.description}</p>
          )}
        </header>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-slate-200 px-2.5 py-0.5 font-medium">
            {poll.type === "capital" ? "Capital" : "Standard"}
          </span>
          <span className="rounded-full bg-slate-200 px-2.5 py-0.5 font-medium">
            {poll.audience_type === "public" ? "Open to all verified humans" : "Targeted"}
          </span>
          {poll.audience_type === "targeted" && poll.participation_pct != null && (
            <span className="text-slate-600">{poll.participation_pct}% participation</span>
          )}
          <span className="text-slate-500">
            Vote: {poll.vote_identity_mode === "anonymous" ? "Anonymous" : "Public"}
          </span>
          <span className="text-slate-500">
            Results:{" "}
            {poll.result_visibility_mode === "live"
              ? "Live"
              : poll.result_visibility_mode === "after_i_vote"
                ? "After you vote"
                : "After poll closes"}
          </span>
          {poll.end_time && (
            <span className="text-slate-500">
              {isClosed ? "Ended" : `Ends ${new Date(poll.end_time).toLocaleString()}`}
            </span>
          )}
          {poll.type === "capital" && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-medium text-amber-800">
              Capital (prize per option)
            </span>
          )}
        </div>

        {has_voted && !isClosed && (
          <p className="mt-4 text-slate-600">Your vote has been recorded.</p>
        )}

        {!has_voted && !isClosed && (
          <section className="mt-6">
            <p className="mb-3 font-medium text-slate-700">Choose one option</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVote();
              }}
              className="space-y-3"
            >
              {options.map((o) => (
                <label
                  key={o.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50"
                >
                  <input
                    type="radio"
                    name="option"
                    value={o.id}
                    checked={selectedOptionId === o.id}
                    onChange={() => setSelectedOptionId(o.id)}
                    className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span className="text-slate-900">{o.option_text}</span>
                </label>
              ))}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={!selectedOptionId || submitting || !authToken || !isBridgeAvailable}
                className="mt-4 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-base font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit vote"}
              </button>
            </form>
          </section>
        )}

        {showResults && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">Results</h2>
            <p className="mt-1 text-sm text-slate-500">{totalVotes} vote{totalVotes !== 1 ? "s" : ""} total</p>
            <ul className="mt-4 space-y-3">
              {options.map((o) => {
                const count = o.vote_count ?? 0;
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const isWinner = !isTie && (o.vote_count ?? 0) === maxCount && maxCount > 0;
                return (
                  <li key={o.id} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span className={isWinner ? "font-semibold text-slate-900" : "text-slate-700"}>
                        {o.option_text}
                        {poll.type === "capital" && o.amount != null && (
                          <span className="ml-1 text-amber-800"> — {o.amount} ALIEN</span>
                        )}
                        {isWinner && " (winner)"}
                      </span>
                      <span className="text-slate-600">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-slate-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            {isClosed && isTie && (
              <p className="mt-4 text-amber-700">Tie — no automatic payout. Resolve manually.</p>
            )}
            {isClosed && poll.type === "capital" && !isTie && winners.length === 1 && (
              <p className="mt-4 text-slate-600">
                Winner: {winners[0].option_text} — {winners[0].amount} ALIEN to recipient.
              </p>
            )}
          </section>
        )}

        {!isClosed && authToken && data.is_creator && (
          <section className="mt-8 border-t border-slate-200 pt-6">
            <p className="text-sm text-slate-500">Close this poll early.</p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close poll
            </button>
            {closedSuccess && <span className="ml-2 text-green-600">Closed.</span>}
          </section>
        )}

        {isClosed && poll.type === "capital" && data.is_creator && !isTie && winners.length === 1 && payment.supported && (
          <section className="mt-8 border-t border-slate-200 pt-6">
            <p className="text-sm text-slate-500">Send the prize to the winner. You will approve the payment in Alien.</p>
            <button
              type="button"
              onClick={handleSendPrize}
              disabled={payment.isLoading}
              className="mt-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {payment.isLoading ? "Opening payment…" : "Send prize"}
            </button>
            {sendPrizeMessage === "success" && <p className="mt-2 text-sm text-green-600">Payment sent.</p>}
            {sendPrizeMessage === "error" && <p className="mt-2 text-sm text-red-600">Payment failed. Try again.</p>}
          </section>
        )}
      </div>
    </div>
  );
}
