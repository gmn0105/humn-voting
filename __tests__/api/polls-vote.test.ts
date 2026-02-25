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

describe("POST /api/polls/[pollId]/vote", () => {
  const pollId = "poll-vote-1";
  const optionId = "option-1";

  beforeEach(() => {
    getMockSupabase().clear();
    mockVerifyToken.mockResolvedValue({
      sub: "voter-alien",
      exp: 0,
      iat: 0,
    });
  });

  it("returns 400 when optionId missing", async () => {
    const { POST } = await import("@/app/api/polls/[pollId]/vote/route");
    const req = createAuthenticatedRequest(
      `http://localhost/api/polls/${pollId}/vote`,
      { method: "POST", body: {} }
    );
    const res = await POST(req, {
      params: Promise.resolve({ pollId }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when poll not found", async () => {
    getMockSupabase().pushSelect({
      data: null,
      error: { message: "Not found" },
    });
    const { POST } = await import("@/app/api/polls/[pollId]/vote/route");
    const req = createAuthenticatedRequest(
      `http://localhost/api/polls/${pollId}/vote`,
      { method: "POST", body: { optionId } }
    );
    const res = await POST(req, {
      params: Promise.resolve({ pollId }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when poll not active", async () => {
    const poll = mockPollRow({
      id: pollId,
      status: "closed",
      creator_alien_id: "other",
    });
    const mock = getMockSupabase();
    mock.pushSelect({ data: poll, error: null });
    mock.pushSelect({
      data: { id: optionId, poll_id: pollId },
      error: null,
    });
    const { POST } = await import("@/app/api/polls/[pollId]/vote/route");
    const req = createAuthenticatedRequest(
      `http://localhost/api/polls/${pollId}/vote`,
      { method: "POST", body: { optionId } }
    );
    const res = await POST(req, {
      params: Promise.resolve({ pollId }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("not active");
  });

  it("returns 400 when option does not belong to poll", async () => {
    const poll = mockPollRow({ id: pollId, status: "active" });
    const mock = getMockSupabase();
    mock.pushSelect({ data: poll, error: null });
    mock.pushSelect({
      data: { id: optionId, poll_id: "other-poll" },
      error: null,
    });
    const { POST } = await import("@/app/api/polls/[pollId]/vote/route");
    const req = createAuthenticatedRequest(
      `http://localhost/api/polls/${pollId}/vote`,
      { method: "POST", body: { optionId } }
    );
    const res = await POST(req, {
      params: Promise.resolve({ pollId }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 403 when targeted and user not in audience", async () => {
    const poll = mockPollRow({
      id: pollId,
      status: "active",
      audience_type: "targeted",
    });
    const mock = getMockSupabase();
    mock.pushSelect({ data: poll, error: null });
    mock.pushSelect({
      data: { id: optionId, poll_id: pollId },
      error: null,
    });
    mock.pushSelect({ data: null, error: null });
    const { POST } = await import("@/app/api/polls/[pollId]/vote/route");
    const req = createAuthenticatedRequest(
      `http://localhost/api/polls/${pollId}/vote`,
      { method: "POST", body: { optionId } }
    );
    const res = await POST(req, {
      params: Promise.resolve({ pollId }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 and success when vote accepted", async () => {
    const poll = mockPollRow({ id: pollId, status: "active", audience_type: "public" });
    const mock = getMockSupabase();
    mock.pushSelect({ data: poll, error: null });
    mock.pushSelect({
      data: { id: optionId, poll_id: pollId },
      error: null,
    });
    mock.pushInsert({ data: null, error: null });
    const { POST } = await import("@/app/api/polls/[pollId]/vote/route");
    const req = createAuthenticatedRequest(
      `http://localhost/api/polls/${pollId}/vote`,
      { method: "POST", body: { optionId } }
    );
    const res = await POST(req, {
      params: Promise.resolve({ pollId }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("returns 401 when no auth", async () => {
    const { POST } = await import("@/app/api/polls/[pollId]/vote/route");
    const req = createRequest(
      `http://localhost/api/polls/${pollId}/vote`,
      { method: "POST", body: { optionId }, headers: {} }
    );
    const res = await POST(req, {
      params: Promise.resolve({ pollId }),
    });
    expect(res.status).toBe(401);
  });
});
