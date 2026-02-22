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
      return NextResponse.json({ error: "Only the creator can close this poll" }, { status: 403 });
    }

    if (p.status === "closed") {
      return NextResponse.json({ error: "Poll is already closed" }, { status: 400 });
    }

    const { error: updateError } = await getSupabase()
      .from("polls")
      .update({ status: "closed" })
      .eq("id", pollId);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("authorization")) {
      return NextResponse.json({ error: "Missing or invalid authorization" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
