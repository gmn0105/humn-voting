"use client";

import { useState } from "react";
import { useAlien, usePayment } from "@alien_org/react";

const PRESET_AMOUNTS = ["10", "50", "100", "250"];

export default function ContributeButton() {
  const { authToken, isBridgeAvailable } = useAlien();
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState<"idle" | "success" | "error" | null>(
    null,
  );

  const payment = usePayment({
    onPaid: () => {
      setMessage("success");
      payment.reset();
    },
    onCancelled: () => {
      payment.reset();
    },
    onFailed: () => {
      setMessage("error");
      payment.reset();
    },
  });

  async function handleContribute(amount: string) {
    if (!authToken || !isBridgeAvailable) return;
    const value = amount.trim() || customAmount.trim();
    if (!value) return;

    setMessage(null);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          amount: value,
          token: "ALIEN",
          network: "alien",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage("error");
        return;
      }

      const { invoice, recipient, amount: amt, token, network } = await res.json();

      await payment.pay({
        recipient,
        amount: amt,
        token,
        network,
        invoice,
        item: {
          title: "Human Treasury — Contribution",
          iconUrl: "/window.svg",
          quantity: 1,
        },
      });
    } catch {
      setMessage("error");
    }
  }

  if (!isBridgeAvailable || !authToken) {
    return (
      <p className="text-sm text-zinc-500">
        Open in Alien app to contribute to the treasury.
      </p>
    );
  }

  if (!payment.supported) {
    return (
      <p className="text-sm text-zinc-500">
        Payments are not supported in this environment.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm font-medium uppercase tracking-wider text-zinc-500">
        Contribute ALIEN
      </p>
      <div className="flex flex-wrap gap-2">
        {PRESET_AMOUNTS.map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => handleContribute(amt)}
            disabled={payment.isLoading}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-[#0c0c0c] hover:bg-zinc-50 disabled:opacity-50"
          >
            {amt} ALIEN
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Custom amount"
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          className="w-28 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-[#0c0c0c] placeholder:text-zinc-400"
        />
        <button
          type="button"
          onClick={() => handleContribute(customAmount)}
          disabled={payment.isLoading || !customAmount.trim()}
          className="rounded-lg bg-[#0c0c0c] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {payment.isLoading ? "…" : "Contribute"}
        </button>
      </div>
      {message === "success" && (
        <p className="text-sm text-green-600">Thank you for contributing.</p>
      )}
      {message === "error" && (
        <p className="text-sm text-red-600">Contribution failed. Try again.</p>
      )}
    </div>
  );
}
