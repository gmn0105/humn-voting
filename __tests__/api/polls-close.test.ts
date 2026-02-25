import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthenticatedRequest, createRequest } from "@/__tests__/utils/request";
import { createMockSupabase } from "@/__tests__/utils/supabase-mock";
import { mockPollRow } from "@/__tests__/utils/test-poll";

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

describe("POST /api/polls/[pollId]/close", () => {
  const pollId = "poll-close-1";

  beforeEach(() => {
    getMockSupabase().clear();
    mockVerifyToken.mockResolvedValue({
      sub: "creator-alien",
      exp: 0,
      iat: 0,
    });
  });

  it("returns 400 when pollId missing", async () => {
    const { POST } = await import("@/app/api/polls/[pollId]/close/route");
    const req = createAuthenticatedRequest(
      "http://localhost/api/polls/close",
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
    const { POST } = await import("@/app/api/polls/[pollId]/close/route");
    const req = createAuthenticatedRequest(
      `http://localhost/api/polls/${pollId}/close`,
      { method: "POST" }
    );
    const res = await POST(req, {
      params: Promise.resolve({ pollId }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when non-creator closes", async () => {
    const poll = mockPollRow({
      id: pollId,
      creator_alien_id: "other-creator",
      status: "active",
    });
    getMockSupabase().pushSelect({ data: poll, error: null });
    const { POST } = await import("@/app/api/polls/[pollId]/close/route");
    const req = createAuthenticatedRequest(
      `http://localhost/api/polls/${pollId}/close`,
      { method: "POST" }
    );
    const res = await POST(req, {
      params: Promise.resolve({ pollId }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 when poll already closed", async () => {
    const poll = mockPollRow({
      id: pollId,
      creator_alien_id: "creator-alien",
      status: "closed",
    });
    getMockSupabase().pushSelect({ data: poll, error: null });
    const { POST } = await import("@/app/api/polls/[pollId]/close/route");
    const req = createAuthenticatedRequest(
      `http://localhost/api/polls/${pollId}/close`,
      { method: "POST" }
    );
    const res = await POST(req, {
      params: Promise.resolve({ pollId }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 200 when creator closes poll", async () => {
    const poll = mockPollRow({
      id: pollId,
      creator_alien_id: "creator-alien",
      status: "active",
    });
    const mock = getMockSupabase();
    mock.pushSelect({ data: poll, error: null });
    mock.pushUpdate({ error: null });
    const { POST } = await import("@/app/api/polls/[pollId]/close/route");
    const req = createAuthenticatedRequest(
      `http://localhost/api/polls/${pollId}/close`,
      { method: "POST" }
    );
    const res = await POST(req, {
      params: Promise.resolve({ pollId }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
