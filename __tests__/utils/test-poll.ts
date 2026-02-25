import type { PollRow, PollOptionRow } from "@/lib/polls-types";

/**
 * Factory for capital poll option payload (create poll body).
 */
export function capitalOption(
  text: string,
  recipientWallet: string,
  amount: number,
  payoutToken = "ALIEN",
  payoutNetwork = "alien"
) {
  return {
    text,
    recipient_wallet: recipientWallet,
    amount,
    payout_token: payoutToken,
    payout_network: payoutNetwork,
  };
}

/**
 * Minimal poll row for mocking GET poll by id.
 */
export function mockPollRow(overrides: Partial<PollRow> = {}): PollRow {
  return {
    id: "poll-uuid-1",
    title: "Test Poll",
    description: null,
    type: "standard",
    creator_alien_id: "creator-alien-id",
    audience_type: "public",
    vote_identity_mode: "anonymous",
    result_visibility_mode: "after_poll_closes",
    start_time: new Date().toISOString(),
    end_time: null,
    status: "active",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Minimal poll option row for mocking.
 */
export function mockPollOptionRow(
  pollId: string,
  overrides: Partial<PollOptionRow> = {}
): PollOptionRow {
  return {
    id: "option-uuid-1",
    poll_id: pollId,
    option_text: "Option A",
    vote_count: 0,
    recipient_wallet: null,
    amount: null,
    payout_token: null,
    payout_network: null,
    ...overrides,
  };
}
