import { NextResponse } from "next/server";
import { setPaymentIntentStatus } from "@/lib/payments";

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(hex.length / 2);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr;
}

async function verifySignature(
  publicKeyHex: string,
  signatureHex: string,
  body: string,
): Promise<boolean> {
  const publicKey = await crypto.subtle.importKey(
    "raw",
    hexToBytes(publicKeyHex),
    { name: "Ed25519" },
    false,
    ["verify"],
  );

  return crypto.subtle.verify(
    "Ed25519",
    publicKey,
    hexToBytes(signatureHex),
    new TextEncoder().encode(body),
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHex =
    request.headers.get("x-webhook-signature") ?? "";

  if (!signatureHex) {
    return NextResponse.json(
      { error: "Missing webhook signature" },
      { status: 401 },
    );
  }

  const publicKey = process.env.WEBHOOK_PUBLIC_KEY;
  if (!publicKey) {
    console.error("WEBHOOK_PUBLIC_KEY not set");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 },
    );
  }

  try {
    const isValid = await verifySignature(publicKey, signatureHex, rawBody);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
    }

    const payload = JSON.parse(rawBody) as {
      invoice: string;
      status: "finalized" | "failed";
      txHash?: string;
    };

    setPaymentIntentStatus(
      payload.invoice,
      payload.status,
      payload.txHash,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 },
    );
  }
}
