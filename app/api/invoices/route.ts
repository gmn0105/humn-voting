import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { verifyRequest, JwtErrors } from "@/lib/auth";
import {
  createPaymentIntent,
  getPaymentIntent,
} from "@/lib/payments";

const ALLOWED_TOKENS = ["USDC", "SOL", "ALIEN"] as const;
const ALLOWED_NETWORKS = ["solana", "alien"] as const;

function getRecipient(token: string, network: string): string | null {
  if (network === "alien" && token === "ALIEN") {
    return process.env.TREASURY_ALIEN_PROVIDER_ADDRESS ?? null;
  }
  if (network === "solana" && (token === "USDC" || token === "SOL")) {
    return process.env.TREASURY_SOLANA_ADDRESS ?? null;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const { alienId } = await verifyRequest(req);
    const body = await req.json();
    const {
      amount,
      token = "ALIEN",
      network = "alien",
    } = body as { amount?: string; token?: string; network?: string };

    if (!amount || typeof amount !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid amount" },
        { status: 400 },
      );
    }
    if (!(ALLOWED_TOKENS as readonly string[]).includes(token)) {
      return NextResponse.json(
        { error: "Invalid token. Use USDC, SOL, or ALIEN" },
        { status: 400 },
      );
    }
    if (!(ALLOWED_NETWORKS as readonly string[]).includes(network)) {
      return NextResponse.json(
        { error: "Invalid network. Use solana or alien" },
        { status: 400 },
      );
    }

    const recipient = getRecipient(token, network);
    if (!recipient) {
      return NextResponse.json(
        {
          error:
            "Treasury recipient not configured. Set TREASURY_SOLANA_ADDRESS or TREASURY_ALIEN_PROVIDER_ADDRESS.",
        },
        { status: 503 },
      );
    }

    const invoice = `inv-${randomUUID()}`;
    createPaymentIntent(invoice, alienId, amount, token, network, recipient);

    return NextResponse.json({
      invoice,
      recipient,
      amount,
      token,
      network,
    });
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

export async function GET(req: Request) {
  try {
    await verifyRequest(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const invoice = searchParams.get("invoice");
  if (!invoice) {
    return NextResponse.json({ error: "Missing invoice" }, { status: 400 });
  }
  const intent = getPaymentIntent(invoice);
  if (!intent) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  return NextResponse.json(intent);
}
