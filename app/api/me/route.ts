import { NextResponse } from "next/server";
import { verifyRequest, JwtErrors } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { alienId } = await verifyRequest(request);
    return NextResponse.json({ alienId });
  } catch (error) {
    if (error instanceof JwtErrors.JWTExpired) {
      return NextResponse.json(
        { error: "Token expired" },
        { status: 401 },
      );
    }
    if (error instanceof JwtErrors.JOSEError) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: "Missing authorization token" },
      { status: 401 },
    );
  }
}
