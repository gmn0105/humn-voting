"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAlien } from "@alien_org/react";

const STEPS = ["Basics", "Options", "Settings", "Review"] as const;
type PollType = "standard" | "capital";
type AudienceType = "public" | "targeted";
type VoteIdentityMode = "anonymous" | "public";
type ResultVisibilityMode = "live" | "after_i_vote" | "after_poll_closes";

type OptionEntry = { text: string; recipient_wallet: string; amount: string };

const defaultOption = (): OptionEntry => ({ text: "", recipient_wallet: "", amount: "" });

export default function CreatePollPage() {
  const router = useRouter();
  const { authToken, isBridgeAvailable } = useAlien();
  const [step, setStep] = useState(0);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<PollType>("standard");
  const [options, setOptions] = useState<OptionEntry[]>([defaultOption(), defaultOption()]);
  const [audienceType, setAudienceType] = useState<AudienceType>("public");
  const [audienceIds, setAudienceIds] = useState("");
  const [voteIdentityMode, setVoteIdentityMode] = useState<VoteIdentityMode>("anonymous");
  const [resultVisibilityMode, setResultVisibilityMode] = useState<ResultVisibilityMode>("after_poll_closes");
  const [endTime, setEndTime] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addOption() {
    setOptions((o) => [...o, defaultOption()]);
  }
  function removeOption(i: number) {
    setOptions((o) => o.filter((_, j) => j !== i));
  }
  function setOption(i: number, field: keyof OptionEntry, value: string) {
    setOptions((o) => [...o.slice(0, i), { ...o[i], [field]: value }, ...o.slice(i + 1)]);
  }

  const audienceIdsList = audienceIds.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  const optionsValid =
    options.filter((o) => o.text.trim()).length >= 2 &&
    (type !== "capital" || options.every((o) => o.text.trim() && o.recipient_wallet.trim() && o.amount.trim() && Number(o.amount) > 0));
  const canNext =
    (step === 0 && title.trim() && (type === "standard" || type === "capital")) ||
    (step === 1 && optionsValid) ||
    (step === 2 && (audienceType !== "targeted" || audienceIdsList.length >= 1)) ||
    step === 3;

  async function handleCreate() {
    if (!authToken || !isBridgeAvailable) {
      setError("Open this app in Alien to create a poll.");
      return;
    }
    const validOptions = options.filter((o) => o.text.trim());
    if (validOptions.length < 2) {
      setError("Add at least two options.");
      return;
    }
    if (type === "capital") {
      const bad = validOptions.find((o) => !o.recipient_wallet.trim() || !o.amount.trim() || Number(o.amount) <= 0);
      if (bad) {
        setError("Capital polls require each option to have recipient wallet and amount > 0.");
        return;
      }
    }
    if (audienceType === "targeted") {
      const ids = audienceIds
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length === 0) {
        setError("Targeted polls need at least one Alien user ID.");
        return;
      }
    }

    setLoading(true);
    setError("");
    const optionsPayload =
      type === "capital"
        ? validOptions.map((o) => ({
            text: o.text.trim(),
            recipient_wallet: o.recipient_wallet.trim(),
            amount: Number(o.amount),
            payout_token: "ALIEN",
            payout_network: "alien",
          }))
        : validOptions.map((o) => o.text.trim());

    const apiUrl = typeof window !== "undefined" ? `${window.location.origin}/api/polls` : "/api/polls";

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          type,
          options: optionsPayload,
          audience_type: audienceType,
          vote_identity_mode: voteIdentityMode,
          result_visibility_mode: resultVisibilityMode,
          end_time: endTime.trim() || null,
          audience_ids:
            audienceType === "targeted"
              ? audienceIds
                  .split(/[\n,]/)
                  .map((s) => s.trim())
                  .filter(Boolean)
              : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Failed to create poll");
        setLoading(false);
        return;
      }
      const poll = await res.json();
      router.push(`/polls/${poll.id}`);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(
        err.message && (err.message.includes("fetch") || err.message.includes("Failed to fetch") || err.message.includes("network"))
          ? "Network error or request timed out. Try again, or open the app inside Alien."
          : "Something went wrong."
      );
      setLoading(false);
    }
  }

  const stepLabel = STEPS[step];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-slate-600 hover:text-slate-900">
          ← Back
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Create Poll</h1>
        <p className="mt-1 text-slate-600">Step {step + 1}: {stepLabel}</p>

        {!isBridgeAvailable && (
          <p className="mt-3 text-sm text-amber-600">
            Open this app inside Alien to create a poll.
          </p>
        )}

        <div className="mt-8 space-y-6">
          {step === 0 && (
            <>
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-700">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Poll title"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-700">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this poll is about..."
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <div>
                <span className="block text-sm font-medium text-slate-700">Poll type</span>
                <div className="mt-2 flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="type"
                      checked={type === "standard"}
                      onChange={() => setType("standard")}
                      className="border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    Standard
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="type"
                      checked={type === "capital"}
                      onChange={() => setType("capital")}
                      className="border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    Capital (winner gets ALIEN)
                  </label>
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-sm text-slate-600">
                {type === "capital"
                  ? "Add at least two options. For each option set the recipient wallet and amount (ALIEN) the winner will receive."
                  : "Add at least two options."}
              </p>
              {options.map((opt, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => setOption(i, "text", e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      disabled={options.length <= 2}
                      className="rounded-lg border border-slate-300 px-3 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                  {type === "capital" && (
                    <>
                      <input
                        type="text"
                        value={opt.recipient_wallet}
                        onChange={(e) => setOption(i, "recipient_wallet", e.target.value)}
                        placeholder="Recipient wallet address"
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                      />
                      <input
                        type="number"
                        min="1"
                        value={opt.amount}
                        onChange={(e) => setOption(i, "amount", e.target.value)}
                        placeholder="Amount (ALIEN)"
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                      />
                    </>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addOption}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                + Add option
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <span className="block text-sm font-medium text-slate-700">Audience</span>
                <div className="mt-2 flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="audience"
                      checked={audienceType === "public"}
                      onChange={() => setAudienceType("public")}
                      className="border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    Public (all verified humans)
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="audience"
                      checked={audienceType === "targeted"}
                      onChange={() => setAudienceType("targeted")}
                      className="border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    Targeted
                  </label>
                </div>
                {audienceType === "targeted" && (
                  <textarea
                    value={audienceIds}
                    onChange={(e) => setAudienceIds(e.target.value)}
                    placeholder="Alien user IDs (one per line or comma-separated)"
                    rows={4}
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                )}
              </div>
              <div>
                <span className="block text-sm font-medium text-slate-700">Vote identity</span>
                <select
                  value={voteIdentityMode}
                  onChange={(e) => setVoteIdentityMode(e.target.value as VoteIdentityMode)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                >
                  <option value="anonymous">Anonymous</option>
                  <option value="public">Public</option>
                </select>
              </div>
              <div>
                <span className="block text-sm font-medium text-slate-700">Result visibility</span>
                <select
                  value={resultVisibilityMode}
                  onChange={(e) => setResultVisibilityMode(e.target.value as ResultVisibilityMode)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                >
                  <option value="live">Live</option>
                  <option value="after_i_vote">After I vote</option>
                  <option value="after_poll_closes">After poll closes</option>
                </select>
              </div>
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-slate-700">
                  End time (optional)
                </label>
                <input
                  id="endTime"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </>
          )}

          {step === 3 && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="font-semibold text-slate-900">{title || "Untitled"}</h2>
              {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
              <p className="mt-2 text-sm text-slate-500">{type === "capital" ? "Capital" : "Standard"} · {audienceType}</p>
              <ul className="mt-3 list-inside list-disc text-sm text-slate-600">
                {options.filter((o) => o.text.trim()).map((o, i) => (
                  <li key={i}>
                    {o.text}
                    {type === "capital" && o.amount && (
                      <span className="text-amber-800"> — {o.amount} ALIEN → recipient</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-8 flex gap-4">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
          ) : (
            <Link
              href="/"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
          )}
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading || !authToken || !isBridgeAvailable}
              className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create poll"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
