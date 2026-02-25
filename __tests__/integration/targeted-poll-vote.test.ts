import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthenticatedRequest } from "@/__tests__/utils/request";
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

describe("Integration: targeted poll — audience member can vote, non-member gets 403", () => {
  const pollId = "poll-targeted-1";
  const optionId = "opt-1";
  const memberId = "member-alien";
  const nonMemberId = "non-member-alien";

  beforeEach(() => {
    getMockSupabase().clear();
  });

  it("audience member can vote", async () => {
    mockVerifyToken.mockResolvedValue({
      sub: memberId,
      exp: 0,
      iat: 0,
    });
    const mock = getMockSupabase();
    const poll = mockPollRow({
      id: pollId,
      status: "active",
      audience_type: "targeted",
    });
    mock.pushSelect({ data: poll, error: null });
    mock.pushSelect({
      data: { id: optionId, poll_id: pollId },
      error: null,
    });
    mock.pushSelect({ data: { id: "audience-row" }, error: null });
    mock.pushInsert({ data: null, error: null });

    const { POST } = await import("@/app/api/polls/[pollId]/vote/route");
    const res = await POST(
      createAuthenticatedRequest(`http://localhost/api/polls/${pollId}/vote`, {
        method: "POST",
        body: { optionId },
      }),
      { params: Promise.resolve({ pollId }) }
    );
    expect(res.status).toBe(200);
  });

  it("non-member gets 403", async () => {
    mockVerifyToken.mockResolvedValue({
      sub: nonMemberId,
      exp: 0,
      iat: 0,
    });
    const mock = getMockSupabase();
    const poll = mockPollRow({
      id: pollId,
      status: "active",
      audience_type: "targeted",
    });
    mock.pushSelect({ data: poll, error: null });
    mock.pushSelect({
      data: { id: optionId, poll_id: pollId },
      error: null,
    });
    mock.pushSelect({ data: null, error: null });

    const { POST } = await import("@/app/api/polls/[pollId]/vote/route");
    const res = await POST(
      createAuthenticatedRequest(`http://localhost/api/polls/${pollId}/vote`, {
        method: "POST",
        body: { optionId },
      }),
      { params: Promise.resolve({ pollId }) }
    );
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("audience");
  });
});
