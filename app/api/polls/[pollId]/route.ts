import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { verifyRequest } from "@/lib/auth";
import type { PollRow, PollOptionRow } from "@/lib/polls-types";

type Context = { params: Promise<{ pollId: string }> };

export async function GET(req: Request, context: Context) {
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

  const { data: options, error: optError } = await getSupabase()
    .from("poll_options")
    .select("*")
    .eq("poll_id", pollId)
    .order("id");

  if (optError) return NextResponse.json({ error: optError.message }, { status: 500 });

  const p = poll as PollRow;
  const isClosed = p.status === "closed";

  let totalInvited = 0;
  let votedCount = 0;
  if (p.audience_type === "targeted") {
    const { count: inv } = await getSupabase()
      .from("poll_audience")
      .select("id", { count: "exact", head: true })
      .eq("poll_id", pollId);
    totalInvited = inv ?? 0;
    const { count: v } = await getSupabase()
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("poll_id", pollId);
    votedCount = v ?? 0;
  }

  let hasVoted = false;
  let userOptionId: string | null = null;
  let isCreator = false;
  try {
    const user = await verifyRequest(req);
    isCreator = p.creator_alien_id === user.alienId;
    const { data: vote } = await getSupabase()
      .from("votes")
      .select("option_id")
      .eq("poll_id", pollId)
      .eq("alien_user_id", user.alienId)
      .maybeSingle();
    if (vote) {
      hasVoted = true;
      userOptionId = vote.option_id;
    }
  } catch {
    // no auth
  }

  const showResults =
    isClosed ||
    p.result_visibility_mode === "live" ||
    (p.result_visibility_mode === "after_i_vote" && hasVoted);

  const optionsOut = (options ?? []).map((o: PollOptionRow) => ({
    id: o.id,
    poll_id: o.poll_id,
    option_text: o.option_text,
    vote_count: showResults ? o.vote_count : undefined,
    recipient_wallet: o.recipient_wallet ?? undefined,
    amount: o.amount ?? undefined,
    payout_token: o.payout_token ?? undefined,
    payout_network: o.payout_network ?? undefined,
  }));

  return NextResponse.json({
    poll: {
      ...p,
      total_invited: p.audience_type === "targeted" ? totalInvited : undefined,
      voted_count: p.audience_type === "targeted" ? votedCount : undefined,
      participation_pct:
        p.audience_type === "targeted" && totalInvited > 0
          ? Math.round((votedCount / totalInvited) * 100)
          : undefined,
    },
    options: optionsOut,
    has_voted: hasVoted,
    user_option_id: userOptionId ?? undefined,
    is_creator: isCreator,
  });
}
