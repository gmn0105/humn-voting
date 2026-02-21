import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyRequest, JwtErrors } from "@/lib/auth";

export async function GET() {
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .order("vote_count", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  try {
    const { alienId } = await verifyRequest(req);
    const body = await req.json();

    const { data, error } = await supabase
      .from("proposals")
      .insert([{ ...body, created_by: alienId }])
      .select()
      .single();

    if (error) return NextResponse.json({ error }, { status: 400 });

    return NextResponse.json(data);
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
