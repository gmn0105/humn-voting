// Match Supabase enums and poll shape for API

export type PollType = "standard" | "capital";
export type AudienceType = "public" | "targeted";
export type VoteIdentityMode = "anonymous" | "public";
export type ResultVisibilityMode = "live" | "after_i_vote" | "after_poll_closes";
export type PollStatus = "draft" | "active" | "closed";

export interface PollRow {
  id: string;
  title: string;
  description: string | null;
  type: PollType;
  creator_alien_id: string;
  audience_type: AudienceType;
  vote_identity_mode: VoteIdentityMode;
  result_visibility_mode: ResultVisibilityMode;
  start_time: string;
  end_time: string | null;
  status: PollStatus;
  created_at: string;
}

export interface PollOptionRow {
  id: string;
  poll_id: string;
  option_text: string;
  vote_count: number;
  recipient_wallet: string | null;
  amount: number | null;
  payout_token: string | null;
  payout_network: string | null;
}

export interface VoteRow {
  id: string;
  poll_id: string;
  option_id: string;
  alien_user_id: string;
  created_at: string;
}

export interface PollAudienceRow {
  id: string;
  poll_id: string;
  alien_user_id: string;
}
