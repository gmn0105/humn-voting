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

describe("GET /api/polls/[pollId]", () => {
  const pollId = "poll-123";

  beforeEach(() => {
    getMockSupabase().clear();
    mockVerifyToken.mockResolvedValue({
      sub: "user-alien",
      exp: 0,
      iat: 0,
    });
  });

  it("returns 400 when pollId missing", async () => {
    const { GET } = await import("@/app/api/polls/[pollId]/route");
    const req = createRequest("http://localhost/api/polls");
    const res = await GET(req, {
      params: Promise.resolve({ pollId: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when poll not found", async () => {
    getMockSupabase().pushSelect({
      data: null,
      error: { message: "Not found", code: "PGRST116" },
    });
    const { GET } = await import("@/app/api/polls/[pollId]/route");
    const req = createRequest(`http://localhost/api/polls/${pollId}`);
    const res = await GET(req, {
      params: Promise.resolve({ pollId }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 with poll and options", async () => {
    const poll = mockPollRow({
      id: pollId,
      title: "Test Poll",
      creator_alien_id: "creator",
      audience_type: "public",
    });
    const options = [
      mockPollOptionRow(pollId, { id: "opt1", option_text: "A", vote_count: 0 }),
      mockPollOptionRow(pollId, { id: "opt2", option_text: "B", vote_count: 0 }),
    ];
    const mock = getMockSupabase();
    mock.pushSelect({ data: poll, error: null });
    mock.pushSelect({ data: options, error: null });
    mock.pushSelect({ data: null, error: null });
    const { GET } = await import("@/app/api/polls/[pollId]/route");
    const req = createAuthenticatedRequest(`http://localhost/api/polls/${pollId}`);
    const res = await GET(req, {
      params: Promise.resolve({ pollId }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.poll.id).toBe(pollId);
    expect(data.poll.title).toBe("Test Poll");
    expect(data.options).toHaveLength(2);
    expect(data.has_voted).toBe(false);
    expect(data.is_creator).toBe(false);
  });

  it("sets is_creator when user is creator", async () => {
    const poll = mockPollRow({
      id: pollId,
      creator_alien_id: "user-alien",
      audience_type: "public",
    });
    const mock = getMockSupabase();
    mock.pushSelect({ data: poll, error: null });
    mock.pushSelect({ data: [mockPollOptionRow(pollId)], error: null });
    mock.pushSelect({ data: null, error: null });
    const { GET } = await import("@/app/api/polls/[pollId]/route");
    const req = createAuthenticatedRequest(`http://localhost/api/polls/${pollId}`);
    const res = await GET(req, {
      params: Promise.resolve({ pollId }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.is_creator).toBe(true);
  });
});
