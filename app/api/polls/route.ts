import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { verifyRequest } from "@/lib/auth";
import type { PollRow } from "@/lib/polls-types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab") ?? "assigned"; // assigned | created | completed

  try {
    let polls: PollRow[] = [];

    if (tab === "completed") {
      const { data, error } = await getSupabase()
        .from("polls")
        .select("*")
        .eq("status", "closed")
        .order("created_at", { ascending: false });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      polls = (data ?? []) as PollRow[];
    } else {
      const { alienId } = await verifyRequest(req);

      if (tab === "assigned") {
        const { data: audienceRows, error: audError } = await getSupabase()
          .from("poll_audience")
          .select("poll_id")
          .eq("alien_user_id", alienId);

        if (audError) return NextResponse.json({ error: audError.message }, { status: 500 });
        const pollIds = (audienceRows ?? []).map((r) => r.poll_id);
        if (pollIds.length === 0) return NextResponse.json([]);

        const { data, error } = await getSupabase()
          .from("polls")
          .select("*")
          .in("id", pollIds)
          .order("created_at", { ascending: false });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        polls = (data ?? []) as PollRow[];
      } else if (tab === "created") {
        const { data, error } = await getSupabase()
          .from("polls")
          .select("*")
          .eq("creator_alien_id", alienId)
          .order("created_at", { ascending: false });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        polls = (data ?? []) as PollRow[];
      } else {
        return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
      }
    }

    if (polls.length === 0) return NextResponse.json([]);

    const pollIds = polls.map((p) => p.id);
    const { data: voteCounts } = await getSupabase().from("votes").select("poll_id");
    const countByPoll: Record<string, number> = {};
    for (const id of pollIds) countByPoll[id] = 0;
    for (const v of voteCounts ?? []) {
      const pid = (v as { poll_id: string }).poll_id;
      if (pid in countByPoll) countByPoll[pid]++;
    }

    const targetedIds = polls.filter((p) => p.audience_type === "targeted").map((p) => p.id);
    let audienceCount: Record<string, number> = {};
    if (targetedIds.length > 0) {
      const { data: aud } = await getSupabase().from("poll_audience").select("poll_id");
      for (const id of targetedIds) audienceCount[id] = 0;
      for (const a of aud ?? []) {
        const pid = (a as { poll_id: string }).poll_id;
        if (pid in audienceCount) audienceCount[pid]++;
      }
    }

    let votedPollIds: Set<string> = new Set();
    if (tab !== "completed") {
      try {
        const { alienId } = await verifyRequest(req);
        const { data: myVotes } = await getSupabase()
          .from("votes")
          .select("poll_id")
          .eq("alien_user_id", alienId)
          .in("poll_id", pollIds);
        for (const row of myVotes ?? []) {
          votedPollIds.add((row as { poll_id: string }).poll_id);
        }
      } catch {
        // no auth
      }
    }

    const out = polls.map((p) => ({
      ...p,
      votes_cast: countByPoll[p.id] ?? 0,
      total_invited: p.audience_type === "targeted" ? audienceCount[p.id] ?? 0 : undefined,
      participation_pct:
        p.audience_type === "targeted" && (audienceCount[p.id] ?? 0) > 0
          ? Math.round(((countByPoll[p.id] ?? 0) / (audienceCount[p.id] ?? 1)) * 100)
          : undefined,
      has_voted: votedPollIds.has(p.id),
    }));

    return NextResponse.json(out);
  } catch (e) {
    if (e instanceof Error && (e.message === "Missing authorization token" || e.message.includes("token"))) {
      return NextResponse.json({ error: "Missing or invalid authorization" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    return await handlePost(req);
  } catch (_e) {
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}

async function handlePost(req: Request) {
  try {
    const { alienId } = await verifyRequest(req);
    const body = await req.json();

    const {
      title,
      description,
      type,
      options,
      audience_type,
      vote_identity_mode,
      result_visibility_mode,
      end_time,
      audience_ids,
    } = body as {
      title: string;
      description?: string | null;
      type: "standard" | "capital";
      options: string[] | { text: string; recipient_wallet?: string; amount?: number; payout_token?: string; payout_network?: string }[];
      audience_type: "public" | "targeted";
      vote_identity_mode: "anonymous" | "public";
      result_visibility_mode: "live" | "after_i_vote" | "after_poll_closes";
      end_time?: string | null;
      audience_ids?: string[];
    };

    const optionsList = Array.isArray(options) ? options : [];
    if (!title?.trim() || optionsList.length < 2) {
      return NextResponse.json(
        { error: "Title and at least two options required" },
        { status: 400 },
      );
    }

    if (type === "capital") {
      const capitalOptions = optionsList as { text: string; recipient_wallet?: string; amount?: number; payout_token?: string; payout_network?: string }[];
      for (let i = 0; i < capitalOptions.length; i++) {
        const o = capitalOptions[i];
        const text = typeof o === "string" ? o : o?.text;
        const rw = typeof o === "object" && o && "recipient_wallet" in o ? o.recipient_wallet : undefined;
        const amt = typeof o === "object" && o && "amount" in o ? o.amount : undefined;
        if (!text?.trim() || !rw?.trim() || amt == null || Number(amt) <= 0) {
          return NextResponse.json(
            { error: `Capital polls require each option to have text, recipient_wallet, and amount > 0 (option ${i + 1})` },
            { status: 400 },
          );
        }
      }
    }

    if (audience_type === "targeted" && (!Array.isArray(audience_ids) || audience_ids.length === 0)) {
      return NextResponse.json(
        { error: "Targeted polls require at least one audience_ids" },
        { status: 400 },
      );
    }

    const pollInsert = {
      title: title.trim(),
      description: description?.trim() || null,
      type,
      creator_alien_id: alienId,
      audience_type,
      vote_identity_mode: vote_identity_mode ?? "anonymous",
      result_visibility_mode,
      end_time: end_time && end_time.trim() ? end_time : null,
      status: "active" as const,
    };

    const { data: poll, error: pollError } = await getSupabase()
      .from("polls")
      .insert([pollInsert])
      .select()
      .single();

    if (pollError) return NextResponse.json({ error: pollError.message }, { status: 400 });
    const pollId = (poll as PollRow).id;

    const tokenNetworkDefaults = { payout_token: "ALIEN" as const, payout_network: "alien" as const };
    const optionRows = optionsList.map((o: string | { text: string; recipient_wallet?: string; amount?: number; payout_token?: string; payout_network?: string }) => {
      const text = typeof o === "string" ? String(o).trim() : (o?.text ?? "").trim();
      if (type === "capital" && typeof o === "object" && o && "recipient_wallet" in o && "amount" in o) {
        return {
          poll_id: pollId,
          option_text: text,
          vote_count: 0,
          recipient_wallet: (o.recipient_wallet ?? "").trim(),
          amount: Number(o.amount),
          payout_token: (o.payout_token ?? tokenNetworkDefaults.payout_token).trim() || null,
          payout_network: (o.payout_network ?? tokenNetworkDefaults.payout_network).trim() || null,
        };
      }
      return {
        poll_id: pollId,
        option_text: text,
        vote_count: 0,
        recipient_wallet: null,
        amount: null,
        payout_token: null,
        payout_network: null,
      };
    });
    const { error: optError } = await getSupabase().from("poll_options").insert(optionRows);
    if (optError) {
      await getSupabase().from("polls").delete().eq("id", pollId);
      return NextResponse.json({ error: optError.message }, { status: 400 });
    }

    if (audience_type === "targeted" && audience_ids?.length) {
      const audienceRows = audience_ids.map((id: string) => ({
        poll_id: pollId,
        alien_user_id: String(id).trim(),
      }));
      const { error: audError } = await getSupabase().from("poll_audience").insert(audienceRows);
      if (audError) {
        await getSupabase().from("polls").delete().eq("id", pollId);
        return NextResponse.json({ error: audError.message }, { status: 400 });
      }
    }

    return NextResponse.json(poll);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("authorization") || msg.includes("token") || msg.includes("Missing")) {
      return NextResponse.json({ error: "Missing or invalid authorization" }, { status: 401 });
    }
    if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED") || msg.includes("ETIMEDOUT") || msg.includes("network")) {
      return NextResponse.json({ error: "Auth service temporarily unavailable. Try again." }, { status: 503 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
