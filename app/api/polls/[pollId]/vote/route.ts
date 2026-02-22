import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { verifyRequest } from "@/lib/auth";
import type { PollRow } from "@/lib/polls-types";

type Context = { params: Promise<{ pollId: string }> };

export async function POST(req: Request, context: Context) {
  try {
    const { alienId } = await verifyRequest(req);
    const { pollId } = await context.params;
    if (!pollId) return NextResponse.json({ error: "Missing pollId" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const optionId = body?.optionId ?? body?.option_id;
    if (!optionId) {
      return NextResponse.json({ error: "Missing optionId" }, { status: 400 });
    }

    const { data: poll, error: pollError } = await getSupabase()
      .from("polls")
      .select("*")
      .eq("id", pollId)
      .single();

    if (pollError || !poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    const p = poll as PollRow;
    if (p.status !== "active") {
      return NextResponse.json({ error: "Poll is not active" }, { status: 400 });
    }

    if (p.end_time && new Date(p.end_time) <= new Date()) {
      return NextResponse.json({ error: "Poll has ended" }, { status: 400 });
    }

    const { data: option } = await getSupabase()
      .from("poll_options")
      .select("id, poll_id")
      .eq("id", optionId)
      .single();

    if (!option || option.poll_id !== pollId) {
      return NextResponse.json({ error: "Invalid option for this poll" }, { status: 400 });
    }

    if (p.audience_type === "targeted") {
      const { data: inAudience } = await getSupabase()
        .from("poll_audience")
        .select("id")
        .eq("poll_id", pollId)
        .eq("alien_user_id", alienId)
        .maybeSingle();
      if (!inAudience) {
        return NextResponse.json({ error: "You are not in the audience for this poll" }, { status: 403 });
      }
    }

    const { error: voteError } = await getSupabase().from("votes").insert([
      {
        poll_id: pollId,
        option_id: optionId,
        alien_user_id: alienId,
      },
    ]);

    if (voteError) {
      if (voteError.code === "23505") {
        return NextResponse.json({ error: "Already voted" }, { status: 400 });
      }
      return NextResponse.json({ error: voteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("authorization")) {
      return NextResponse.json({ error: "Missing or invalid authorization" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
