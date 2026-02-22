-- HUMN v1 schema: polls, poll_options, votes, poll_audience
-- Run in Supabase SQL editor or via: supabase db push

-- ========== ENUMS ==========
CREATE TYPE poll_type AS ENUM ('standard', 'capital');
CREATE TYPE audience_type AS ENUM ('public', 'targeted');
CREATE TYPE vote_identity_mode AS ENUM ('anonymous', 'public');
CREATE TYPE result_visibility_mode AS ENUM ('live', 'after_i_vote', 'after_poll_closes');
CREATE TYPE poll_status AS ENUM ('draft', 'active', 'closed');

-- ========== POLLS ==========
CREATE TABLE polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type poll_type NOT NULL,
  creator_alien_id text NOT NULL,
  amount numeric CHECK (type <> 'capital' OR (amount IS NOT NULL AND amount > 0)),
  recipient_wallet text CHECK (type <> 'capital' OR recipient_wallet IS NOT NULL),
  audience_type audience_type NOT NULL,
  vote_identity_mode vote_identity_mode NOT NULL DEFAULT 'anonymous',
  result_visibility_mode result_visibility_mode NOT NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz CHECK (end_time IS NULL OR end_time > start_time),
  status poll_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_polls_status_end ON polls (status, end_time);
CREATE INDEX idx_polls_creator ON polls (creator_alien_id);
CREATE INDEX idx_polls_feed ON polls (status, created_at DESC);

-- ========== POLL OPTIONS ==========
CREATE TABLE poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES polls (id) ON DELETE CASCADE,
  option_text text NOT NULL,
  vote_count integer NOT NULL DEFAULT 0,
  UNIQUE (poll_id, option_text)
);

CREATE INDEX idx_poll_options_poll ON poll_options (poll_id);

-- ========== VOTES ==========
CREATE TABLE votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES polls (id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES poll_options (id) ON DELETE CASCADE,
  alien_user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, alien_user_id)
);

CREATE INDEX idx_votes_option ON votes (option_id);

-- Ensure vote.option_id belongs to vote.poll_id
CREATE OR REPLACE FUNCTION check_vote_option_poll() RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT poll_id FROM poll_options WHERE id = NEW.option_id) <> NEW.poll_id THEN
    RAISE EXCEPTION 'option_id must belong to poll_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vote_option_poll_check
  BEFORE INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION check_vote_option_poll();

-- Keep vote_count in sync on insert (PostgreSQL 14+ uses EXECUTE FUNCTION; older use EXECUTE PROCEDURE)
CREATE OR REPLACE FUNCTION increment_option_vote_count() RETURNS TRIGGER AS $$
BEGIN
  UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = NEW.option_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_vote_insert
  AFTER INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION increment_option_vote_count();

-- ========== POLL AUDIENCE (targeted polls) ==========
CREATE TABLE poll_audience (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES polls (id) ON DELETE CASCADE,
  alien_user_id text NOT NULL,
  UNIQUE (poll_id, alien_user_id)
);

CREATE INDEX idx_poll_audience_poll ON poll_audience (poll_id);
