import { describe, it, expect } from "vitest";
import {
  createPaymentIntent,
  getPaymentIntent,
  setPaymentIntentStatus,
  type PaymentIntent,
} from "@/lib/payments";

describe("lib/payments", () => {
  it("createPaymentIntent stores intent and getPaymentIntent returns it", () => {
    const intent = createPaymentIntent(
      "inv-1",
      "alien-1",
      "100",
      "ALIEN",
      "alien",
      "recipient-addr"
    );
    expect(intent).toMatchObject({
      invoice: "inv-1",
      alienId: "alien-1",
      amount: "100",
      token: "ALIEN",
      network: "alien",
      recipient: "recipient-addr",
      status: "pending",
    });
    expect(intent.createdAt).toBeDefined();

    const found = getPaymentIntent("inv-1");
    expect(found).toEqual(intent);
  });

  it("getPaymentIntent returns undefined for unknown invoice", () => {
    expect(getPaymentIntent("inv-nonexistent")).toBeUndefined();
  });

  it("setPaymentIntentStatus updates status and optional txHash", () => {
    createPaymentIntent("inv-2", "alien-2", "50", "ALIEN", "alien", "rec");
    setPaymentIntentStatus("inv-2", "finalized", "tx-hash-123");
    const intent = getPaymentIntent("inv-2");
    expect(intent?.status).toBe("finalized");
    expect((intent as PaymentIntent & { txHash?: string }).txHash).toBe("tx-hash-123");
  });

  it("setPaymentIntentStatus to failed", () => {
    createPaymentIntent("inv-3", "alien-3", "25", "ALIEN", "alien", "rec");
    setPaymentIntentStatus("inv-3", "failed");
    expect(getPaymentIntent("inv-3")?.status).toBe("failed");
  });

  it("setPaymentIntentStatus is no-op for unknown invoice", () => {
    setPaymentIntentStatus("inv-unknown", "finalized");
    expect(getPaymentIntent("inv-unknown")).toBeUndefined();
  });
});
