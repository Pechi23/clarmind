# ClarMind leaderboard (Cloudflare Worker + D1)

A tiny free backend for the real leaderboard. No new account — reuses your
Cloudflare setup. D1 (SQLite) free tier is 5 GB / 5M reads a day; Workers free
tier is 100k requests/day. Plenty.

## Deploy (from this `leaderboard-worker/` folder)

You're already logged in from the AI proxy (`wrangler login`). Then:

1. **Create the database** — copy the `database_id` it prints:
   ```bash
   wrangler d1 create clarmind-leaderboard
   ```
2. **Paste that id** into `wrangler.toml` (replace `PASTE_YOUR_DATABASE_ID_HERE`).
3. **Create the table** (remote):
   ```bash
   wrangler d1 execute clarmind-leaderboard --file=schema.sql --remote
   ```
4. **Deploy the Worker:**
   ```bash
   wrangler deploy
   ```
   Copy the printed URL, e.g. `https://clarmind-leaderboard.<you>.workers.dev`.

## Point the app at it

- Local/native: add to the app's `.env`
  ```
  EXPO_PUBLIC_LEADERBOARD_URL=https://clarmind-leaderboard.<you>.workers.dev
  ```
- Web deploy: add it as a GitHub Actions **variable** (Settings → Secrets and
  variables → Actions → Variables) so the live site uses it too.

The app already falls back to the seeded leaderboard when this URL isn't set, so
nothing breaks before you deploy.

## API

- `POST /score` — body `{ deviceId, name, zodiac, xp, streak, totalMinutes }` → upsert.
- `GET /top?by=xp|streak|minutes&limit=25` — header `X-Device-Id: <id>` → `{ rows: [{ name, zodiac, xp, streak, totalMinutes, isYou }] }`. Device ids are never returned.

## Notes / hardening (optional, later)
- No login: rows are keyed by a random per-device id kept only on the device, so
  only you can overwrite your row. Someone could still spam fake rows — add a
  Cloudflare rate-limit rule or a lightweight signed token if abuse ever happens.
- To wipe the board: `wrangler d1 execute clarmind-leaderboard --command "DELETE FROM scores" --remote`.
