import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPaymentIntent, getPaymentIntent, setPaymentIntentStatus } from "@/lib/payments";

async function generateEd25519KeyPair(): Promise<{
  publicKeyHex: string;
  sign: (data: string) => Promise<string>;
}> {
  const keyPair = await crypto.subtle.generateKey(
    "Ed25519",
    true,
    ["sign", "verify"]
  );
  const rawPub = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const publicKeyHex = Buffer.from(rawPub).toString("hex");
  const sign = async (data: string) => {
    const sig = await crypto.subtle.sign(
      "Ed25519",
      keyPair.privateKey,
      new TextEncoder().encode(data)
    );
    return Buffer.from(sig).toString("hex");
  };
  return { publicKeyHex, sign };
}

describe("POST /api/webhooks/payment", () => {
  let publicKeyHex: string;
  let sign: (data: string) => Promise<string>;

  beforeEach(async () => {
    const pair = await generateEd25519KeyPair();
    publicKeyHex = pair.publicKeyHex;
    sign = pair.sign;
    process.env.WEBHOOK_PUBLIC_KEY = publicKeyHex;
  });

  it("returns 401 when x-webhook-signature missing", async () => {
    const { POST } = await import("@/app/api/webhooks/payment/route");
    const req = new Request("http://localhost/api/webhooks/payment", {
      method: "POST",
      body: JSON.stringify({ invoice: "inv-1", status: "finalized" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("signature");
  });

  it("returns 500 when WEBHOOK_PUBLIC_KEY not set", async () => {
    delete process.env.WEBHOOK_PUBLIC_KEY;
    const { POST } = await import("@/app/api/webhooks/payment/route");
    const body = JSON.stringify({ invoice: "inv-1", status: "finalized" });
    const sig = await sign(body);
    const req = new Request("http://localhost/api/webhooks/payment", {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/json",
        "x-webhook-signature": sig,
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    process.env.WEBHOOK_PUBLIC_KEY = publicKeyHex;
  });

  it("returns 401 when signature invalid", async () => {
    const { POST } = await import("@/app/api/webhooks/payment/route");
    const req = new Request("http://localhost/api/webhooks/payment", {
      method: "POST",
      body: JSON.stringify({ invoice: "inv-1", status: "finalized" }),
      headers: {
        "Content-Type": "application/json",
        "x-webhook-signature": "00".repeat(32),
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 200 and updates intent when signature valid", async () => {
    createPaymentIntent("inv-webhook-1", "a1", "100", "ALIEN", "alien", "rec");
    const { POST } = await import("@/app/api/webhooks/payment/route");
    const payload = {
      invoice: "inv-webhook-1",
      status: "finalized" as const,
      txHash: "tx-123",
    };
    const body = JSON.stringify(payload);
    const sig = await sign(body);
    const req = new Request("http://localhost/api/webhooks/payment", {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/json",
        "x-webhook-signature": sig,
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const intent = getPaymentIntent("inv-webhook-1");
    expect(intent?.status).toBe("finalized");
    expect((intent as { txHash?: string }).txHash).toBe("tx-123");
  });
});
