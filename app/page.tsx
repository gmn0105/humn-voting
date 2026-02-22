"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAlien } from "@alien_org/react";
import PollCard, { type PollListItem } from "@/components/PollCard";

type Tab = "assigned" | "created" | "completed";

export default function Home() {
  const { authToken, isBridgeAvailable } = useAlien();
  const [tab, setTab] = useState<Tab>("assigned");
  const [polls, setPolls] = useState<PollListItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPolls() {
    setLoading(true);
    try {
      const url = `/api/polls?tab=${tab}`;
      const res = await fetch(url, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setPolls(Array.isArray(data) ? data : []);
      } else {
        setPolls([]);
      }
    } catch {
      setPolls([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPolls();
  }, [tab]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            HUMN
          </h1>
          <p className="mt-2 text-xl text-slate-600 sm:text-2xl">
            One Human. One Voice.
          </p>
          <Link
            href="/polls/create"
            className="mt-6 inline-block rounded-lg bg-[var(--accent)] px-5 py-2.5 text-base font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Create Poll
          </Link>
        </header>

        <nav className="mb-6 flex gap-2 border-b border-slate-200">
          {(["assigned", "created", "completed"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "assigned" ? "Assigned" : t === "created" ? "Created" : "Completed"}
            </button>
          ))}
        </nav>

        <section>
          {loading ? (
            <p className="text-slate-500">Loading…</p>
          ) : polls.length === 0 ? (
            <p className="text-slate-500">
              {tab === "assigned" && "No polls assigned to you."}
              {tab === "created" && "You haven’t created any polls yet."}
              {tab === "completed" && "No completed polls yet."}
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {polls.map((p) => (
                <li key={p.id}>
                  <PollCard
                    poll={p}
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
