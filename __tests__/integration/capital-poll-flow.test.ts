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

describe("Integration: capital poll create → vote → close → payout-intent", () => {
  const creatorId = "creator-alien";
  const voterId = "voter-alien";
  const pollId = "poll-cap-1";
  const winnerOptionId = "opt-winner";
  const loserOptionId = "opt-loser";

  beforeEach(() => {
    getMockSupabase().clear();
  });

  it("full flow: create capital poll, vote, close, payout-intent returns winner amount and recipient", async () => {
    mockVerifyToken.mockResolvedValue({
      sub: creatorId,
      exp: 0,
      iat: 0,
    });

    const mock = getMockSupabase();
    const createdPoll = mockPollRow({
      id: pollId,
      type: "capital",
      status: "active",
      creator_alien_id: creatorId,
      audience_type: "public",
    });
    mock.pushInsert({ data: createdPoll, error: null });
    mock.pushInsert({ data: null, error: null });

    const { POST: postPoll } = await import("@/app/api/polls/route");
    const createRes = await postPoll(
      createAuthenticatedRequest("http://localhost/api/polls", {
        method: "POST",
        body: {
          title: "Capital Poll",
          type: "capital",
          options: [
            { text: "Winner", recipient_wallet: "winner-addr", amount: 100 },
            { text: "Loser", recipient_wallet: "loser-addr", amount: 50 },
          ],
          audience_type: "public",
          result_visibility_mode: "after_poll_closes",
        },
      })
    );
    expect(createRes.status).toBe(200);

    mockVerifyToken.mockResolvedValue({ sub: voterId, exp: 0, iat: 0 });
    const activePoll = mockPollRow({
      id: pollId,
      type: "capital",
      status: "active",
      audience_type: "public",
    });
    const options = [
      mockPollOptionRow(pollId, {
        id: winnerOptionId,
        option_text: "Winner",
        vote_count: 0,
        recipient_wallet: "winner-addr",
        amount: 100,
      }),
      mockPollOptionRow(pollId, {
        id: loserOptionId,
        option_text: "Loser",
        vote_count: 0,
        recipient_wallet: "loser-addr",
        amount: 50,
      }),
    ];
    mock.pushSelect({ data: activePoll, error: null });
    mock.pushSelect({
      data: { id: winnerOptionId, poll_id: pollId },
      error: null,
    });
    mock.pushInsert({ data: null, error: null });

    const { POST: postVote } = await import("@/app/api/polls/[pollId]/vote/route");
    const voteRes = await postVote(
      createAuthenticatedRequest(`http://localhost/api/polls/${pollId}/vote`, {
        method: "POST",
        body: { optionId: winnerOptionId },
      }),
      { params: Promise.resolve({ pollId }) }
    );
    expect(voteRes.status).toBe(200);

    mockVerifyToken.mockResolvedValue({ sub: creatorId, exp: 0, iat: 0 });
    const pollToClose = mockPollRow({
      id: pollId,
      type: "capital",
      status: "active",
      creator_alien_id: creatorId,
    });
    mock.pushSelect({ data: pollToClose, error: null });
    mock.pushUpdate({ error: null });

    const { POST: postClose } = await import("@/app/api/polls/[pollId]/close/route");
    const closeRes = await postClose(
      createAuthenticatedRequest(`http://localhost/api/polls/${pollId}/close`, {
        method: "POST",
      }),
      { params: Promise.resolve({ pollId }) }
    );
    expect(closeRes.status).toBe(200);

    const winnerOptions = [
      mockPollOptionRow(pollId, {
        id: winnerOptionId,
        vote_count: 1,
        recipient_wallet: "winner-addr",
        amount: 100,
        payout_token: "ALIEN",
        payout_network: "alien",
      }),
      mockPollOptionRow(pollId, {
        id: loserOptionId,
        vote_count: 0,
        recipient_wallet: "loser-addr",
        amount: 50,
      }),
    ].sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0));
    const closedPoll = mockPollRow({
      id: pollId,
      type: "capital",
      status: "closed",
      creator_alien_id: creatorId,
    });
    mock.pushSelect({ data: closedPoll, error: null });
    mock.pushSelect({ data: winnerOptions, error: null });

    const { POST: postPayoutIntent } = await import(
      "@/app/api/polls/[pollId]/payout-intent/route"
    );
    const payoutRes = await postPayoutIntent(
      createAuthenticatedRequest(
        `http://localhost/api/polls/${pollId}/payout-intent`,
        { method: "POST" }
      ),
      { params: Promise.resolve({ pollId }) }
    );
    expect(payoutRes.status).toBe(200);
    const payoutData = await payoutRes.json();
    expect(payoutData.recipient).toBe("winner-addr");
    expect(payoutData.token).toBe("ALIEN");
    expect(payoutData.network).toBe("alien");
    expect(payoutData.invoice).toMatch(/^inv-/);
    expect(Number(payoutData.amount)).toBe(100 * 1e9);
  });
});
