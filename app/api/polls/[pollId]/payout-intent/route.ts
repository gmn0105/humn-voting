import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabase } from "@/lib/supabase";
import { verifyRequest } from "@/lib/auth";
import { createPaymentIntent } from "@/lib/payments";
import type { PollRow, PollOptionRow } from "@/lib/polls-types";

const TOKEN_DECIMALS: Record<string, number> = {
  ALIEN: 9,
  USDC: 6,
  SOL: 9,
};

function toSmallestUnit(humanAmount: number, token: string): string {
  const decimals = TOKEN_DECIMALS[token] ?? 9;
  const value = Math.floor(Number(humanAmount) * 10 ** decimals);
  return String(value);
}

type Context = { params: Promise<{ pollId: string }> };

export async function POST(req: Request, context: Context) {
  try {
    const { alienId } = await verifyRequest(req);
    const { pollId } = await context.params;
    if (!pollId) return NextResponse.json({ error: "Missing pollId" }, { status: 400 });

    const { data: poll, error: pollError } = await getSupabase()
      .from("polls")
      .select("*")
      .eq("id", pollId)
      .single();

    if (pollError || !poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    const p = poll as PollRow;
    if (p.creator_alien_id !== alienId) {
      return NextResponse.json({ error: "Only the poll creator can request payout intent" }, { status: 403 });
    }
    if (p.type !== "capital") {
      return NextResponse.json({ error: "Not a capital poll" }, { status: 400 });
    }
    if (p.status !== "closed") {
      return NextResponse.json({ error: "Poll is not closed" }, { status: 400 });
    }

    const { data: options, error: optError } = await getSupabase()
      .from("poll_options")
      .select("id, vote_count, recipient_wallet, amount, payout_token, payout_network")
      .eq("poll_id", pollId)
      .order("vote_count", { ascending: false });

    if (optError || !options?.length) {
      return NextResponse.json({ error: "Could not load options" }, { status: 500 });
    }

    const opts = options as (PollOptionRow & { vote_count: number })[];
    const maxVotes = opts[0].vote_count;
    const winners = opts.filter((o) => o.vote_count === maxVotes);

    if (winners.length !== 1) {
      return NextResponse.json(
        { error: winners.length === 0 ? "No winner" : "Tie: resolve manually before sending prize" },
        { status: 400 },
      );
    }

    const winner = winners[0];
    if (!winner.recipient_wallet?.trim() || winner.amount == null || Number(winner.amount) <= 0) {
      return NextResponse.json({ error: "Winner option missing recipient or amount" }, { status: 400 });
    }

    const token = (winner.payout_token ?? "ALIEN").trim() || "ALIEN";
    const network = (winner.payout_network ?? "alien").trim() || "alien";
    const amountSmall = toSmallestUnit(Number(winner.amount), token);
    const recipient = winner.recipient_wallet.trim();

    const invoice = `inv-${randomUUID()}`;
    createPaymentIntent(invoice, alienId, amountSmall, token, network, recipient);

    return NextResponse.json({
      invoice,
      recipient,
      amount: amountSmall,
      token,
      network,
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("authorization")) {
      return NextResponse.json({ error: "Missing or invalid authorization" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
