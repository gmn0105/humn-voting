import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyRequest, JwtErrors } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { alienId } = await verifyRequest(req);
    const { proposalId } = await req.json();

    if (!proposalId) {
      return NextResponse.json(
        { error: "Missing proposalId" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("votes")
      .insert([{ alien_user_id: alienId, proposal_id: proposalId }]);

    if (error) {
      return NextResponse.json({ error: "Already voted" }, { status: 400 });
    }

    await supabase.rpc("increment_vote_count", { proposal_id: proposalId });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof JwtErrors.JWTExpired) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    if (error instanceof JwtErrors.JOSEError) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Missing authorization token" },
      { status: 401 },
    );
  }
}
