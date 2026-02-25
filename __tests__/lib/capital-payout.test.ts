import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { executeCapitalPayout } from "@/lib/capital-payout";

describe("lib/capital-payout", () => {
  const origEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = "test";
    delete process.env.CAPITAL_PAYOUT_FROM_ALIEN_ADDRESS;
  });

  afterEach(() => {
    process.env.NODE_ENV = origEnv;
  });

  it("returns ok when CAPITAL_PAYOUT_FROM_ALIEN_ADDRESS is unset", async () => {
    const result = await executeCapitalPayout("poll-1", 100, "recipient-wallet");
    expect(result).toEqual({ ok: true });
  });

  it("returns ok when CAPITAL_PAYOUT_FROM_ALIEN_ADDRESS is set (stub)", async () => {
    process.env.CAPITAL_PAYOUT_FROM_ALIEN_ADDRESS = "from-addr";
    const result = await executeCapitalPayout("poll-1", 50, "recipient-wallet");
    expect(result).toEqual({ ok: true });
  });
});
