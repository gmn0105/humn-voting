-- Capital poll: per-option recipient + amount; no payout-from on polls.
-- Run after 20250220000000_humn_schema.sql

-- Add per-option payout fields (nullable; required for capital polls enforced in API)
ALTER TABLE poll_options
  ADD COLUMN IF NOT EXISTS recipient_wallet text,
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS payout_token text,
  ADD COLUMN IF NOT EXISTS payout_network text;

-- Remove poll-level amount and recipient_wallet (payout sender = creator who taps "Send prize")
ALTER TABLE polls
  DROP COLUMN IF EXISTS amount,
  DROP COLUMN IF EXISTS recipient_wallet;
