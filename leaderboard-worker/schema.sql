-- ClarMind leaderboard — Cloudflare D1 table.
-- Apply with: wrangler d1 execute clarmind-leaderboard --file=schema.sql --remote
CREATE TABLE IF NOT EXISTS scores (
  device_id     TEXT PRIMARY KEY,
  name          TEXT NOT NULL DEFAULT 'Anon',
  zodiac        TEXT NOT NULL DEFAULT 'Aries',
  xp            INTEGER NOT NULL DEFAULT 0,
  streak        INTEGER NOT NULL DEFAULT 0,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  updated_at    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS scores_xp_idx ON scores(xp DESC);
CREATE INDEX IF NOT EXISTS scores_streak_idx ON scores(streak DESC);
CREATE INDEX IF NOT EXISTS scores_minutes_idx ON scores(total_minutes DESC);
