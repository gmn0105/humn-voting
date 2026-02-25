import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthenticatedRequest, createRequest } from "@/__tests__/utils/request";
import { createMockSupabase } from "@/__tests__/utils/supabase-mock";
import { mockPollRow, mockPollOptionRow } from "@/__tests__/utils/test-poll";

const { mockVerifyToken } = vi.hoisted(() => ({ mockVerifyToken: vi.fn() }));
const mockSupabaseRef = vi.hoisted(() => ({ current: null as any }));

vi.mock("@alien_org/auth-client", () => ({
  createAuthClient: () => ({ verifyToken: mockVerifyToken }),
  JwtErrors: {},
}));
vi.mock("@/lib/supabase", () => ({
  getSupabase: () => mockSupabaseRef.current!.client,
}));

function getMockSupabase() {
  if (!mockSupabaseRef.current) mockSupabaseRef.current = createMockSupabase();
  return mockSupabaseRef.current;
}

describe("POST /api/polls/[pollId]/payout-intent", () => {
  const pollId = "poll-payout-1";

  beforeEach(() => {
    getMockSupabase().clear();
    mockVerifyToken.mockResolvedValue({
      sub: "creator-alien",
      exp: 0,
      iat: 0,
    });
  });

  it("returns 400 when pollId missing", async () => {
    const { POST } = await import("@/app/api/polls/[pollId]/payout-intent/route");
    const req = createAuthenticatedRequest(
      "http://localhost/api/polls/payout-intent",
      { method: "POST" }
    );
    const res = await POST(req, {
      params: Promise.resolve({ pollId: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when poll not found", async () => {
    getMockSupabase().pushSelect({
      data: null,
      error: { message: "Not found" },
    });
    const { POST } = await import("@/app/api/polls/[pollId]/payout-intent/route");
    const req = createAuthenticatedRequest(
      `http://localhost/api/polls/${pollId}/payout-intent`,
      { method: "POST" }
    );
    const res = await POST(req, {
      params: Promise.resolve({ pollId }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when non-creator requests payout intent", async () => {
    const poll = mockPollRow({
      id: pollId,
      type: "capital",
      status: "closed",
      creator_alien_id: "other",
    });
    getMockSupabase().pushSelect({ data: poll, error: null });
    const { POST } = await import("@/app/api/polls/[pollId]/payout-intent/route");
    const req = createAuthenticatedRequest(
      `http://localhost/api/polls/${pollId}/payout-intent`,
      { method: "POST" }
    );
    const res = await POST(req, {
      params: Promise.resolve({ pollId }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 when poll is not capital", async () => {
    const poll = mockPollRow({
      id: pollId,
      type: "standard",
      status: "closed",
      creator_alien_id: "creator-alien",
    });
    getMockSupabase().pushSelect({ data: poll, error: null });
    const { POST } = await import("@/app/api/polls/[pollId]/payout-intent/route");
    const req = createAuthenticatedRequest(
      `http://localhost/api/polls/${pollId}/payout-intent`,
      { method: "POST" }
    );
    const res = await POST(req, {
      params: Promise.resolve({ pollId }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("capital");
  });

  it("returns 400 when poll not closed", async () => {
    const poll = mockPollRow({
      id: pollId,
      type: "capital",
      status: "active",
      creator_alien_id: "creator-alien",
    });
    getMockSupabase().pushSelect({ data: poll, error: null });
    const { POST } = await import("@/app/api/polls/[pollId]/payout-intent/route");
    const req = createAuthenticatedRequest(
      `http://localhost/api/polls/${pollId}/payout-intent`,
      { method: "POST" }
    );
    const res = await POST(req, {
      params: Promise.resolve({ pollId }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 on tie", async () => {
    const poll = mockPollRow({
      id: pollId,
      type: "capital",
      status: "closed",
      creator_alien_id: "creator-alien",
    });
    const options = [
      mockPollOptionRow(pollId, {
        id: "o1",
        option_text: "A",
        vote_count: 5,
        recipient_wallet: "addr1",
        amount: 100,
      }),
      mockPollOptionRow(pollId, {
        id: "o2",
        option_text: "B",
        vote_count: 5,
        recipient_wallet: "addr2",
        amount: 50,
      }),
    ];
    const mock = getMockSupabase();
    mock.pushSelect({ data: poll, error: null });
    mock.pushSelect({ data: options, error: null });
    const { POST } = await import("@/app/api/polls/[pollId]/payout-intent/route");
    const req = createAuthenticatedRequest(
      `http://localhost/api/polls/${pollId}/payout-intent`,
      { method: "POST" }
    );
    const res = await POST(req, {
      params: Promise.resolve({ pollId }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Tie");
  });

  it("returns 200 with invoice, recipient, amount (smallest unit), token, network for single winner", async () => {
    const poll = mockPollRow({
      id: pollId,
      type: "capital",
      status: "closed",
      creator_alien_id: "creator-alien",
    });
    const options = [
      mockPollOptionRow(pollId, {
        id: "o1",
        option_text: "Winner",
        vote_count: 10,
        recipient_wallet: "winner-addr",
        amount: 1,
        payout_token: "ALIEN",
        payout_network: "alien",
      }),
      mockPollOptionRow(pollId, {
        id: "o2",
        option_text: "Loser",
        vote_count: 2,
        recipient_wallet: "loser-addr",
        amount: 50,
      }),
    ];
    const mock = getMockSupabase();
    mock.pushSelect({ data: poll, error: null });
    mock.pushSelect({ data: options, error: null });
    const { POST } = await import("@/app/api/polls/[pollId]/payout-intent/route");
    const req = createAuthenticatedRequest(
      `http://localhost/api/polls/${pollId}/payout-intent`,
      { method: "POST" }
    );
    const res = await POST(req, {
      params: Promise.resolve({ pollId }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.invoice).toMatch(/^inv-/);
    expect(data.recipient).toBe("winner-addr");
    expect(data.token).toBe("ALIEN");
    expect(data.network).toBe("alien");
    expect(data.amount).toBe("1000000000");
  });

  it("returns 401 when no auth", async () => {
    const { POST } = await import("@/app/api/polls/[pollId]/payout-intent/route");
    const req = createRequest(
      `http://localhost/api/polls/${pollId}/payout-intent`,
      { method: "POST", headers: {} }
    );
    const res = await POST(req, {
      params: Promise.resolve({ pollId }),
    });
    expect(res.status).toBe(401);
  });
});
