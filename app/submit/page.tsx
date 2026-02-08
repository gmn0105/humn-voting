"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAlien } from "@alien_org/react";

export default function SubmitPage() {
  const router = useRouter();
  const { authToken, isBridgeAvailable } = useAlien();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!authToken || !isBridgeAvailable) {
      setError("Open this app in Alien to submit a proposal.");
      return;
    }
    if (!title.trim() || !description.trim() || !requestedAmount.trim()) {
      setError("Fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const insertRes = await fetch("/api/proposals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          requested_amount: requestedAmount.trim(),
          ai_summary: "",
          created_at: new Date().toISOString(),
          vote_count: 0,
        }),
      });
      if (!insertRes.ok) {
        const data = await insertRes.json().catch(() => ({}));
        const msg = data?.error?.message ?? data?.error ?? "Could not create proposal.";
        setError(typeof msg === "string" ? msg : "Could not create proposal.");
        setLoading(false);
        return;
      }
      router.push("/");
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-[#fafafa]">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <header className="mb-10">
          <Link
            href="/"
            className="text-zinc-400 hover:text-white"
          >
            ← Back
          </Link>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Submit Proposal
          </h1>
          <p className="mt-2 text-xl text-zinc-400 sm:text-2xl">
            One Human. One Vote.
          </p>
          {!isBridgeAvailable && (
            <p className="mt-3 text-sm text-amber-400">
              Open this app inside Alien to submit a proposal.
            </p>
          )}
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl bg-white p-6 text-[#0c0c0c] shadow-sm sm:p-8"
        >
          {error && (
            <p className="mb-4 text-sm font-medium text-red-600">{error}</p>
          )}
          <div className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium uppercase tracking-wider text-zinc-500">
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Proposal title"
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-lg text-[#0c0c0c] placeholder:text-zinc-400 focus:border-[#0c0c0c] focus:outline-none focus:ring-1 focus:ring-[#0c0c0c]"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium uppercase tracking-wider text-zinc-500">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your proposal..."
                rows={5}
                className="mt-2 w-full resize-y rounded-lg border border-zinc-200 bg-white px-4 py-3 text-lg text-[#0c0c0c] placeholder:text-zinc-400 focus:border-[#0c0c0c] focus:outline-none focus:ring-1 focus:ring-[#0c0c0c]"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium uppercase tracking-wider text-zinc-500">
                Requested Amount
              </label>
              <input
                id="amount"
                type="text"
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(e.target.value)}
                placeholder="e.g. 50 ALIEN"
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-lg text-[#0c0c0c] placeholder:text-zinc-400 focus:border-[#0c0c0c] focus:outline-none focus:ring-1 focus:ring-[#0c0c0c]"
                disabled={loading}
              />
            </div>
          </div>
          <div className="mt-8 flex gap-4">
            <button
              type="submit"
              disabled={loading || !authToken || !isBridgeAvailable}
              className="rounded-lg bg-[#0c0c0c] px-6 py-3 text-base font-medium text-white disabled:opacity-50"
            >
              {loading ? "Submitting…" : "Submit"}
            </button>
            <Link
              href="/"
              className="rounded-lg border border-zinc-300 px-6 py-3 text-base font-medium text-[#0c0c0c]"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
