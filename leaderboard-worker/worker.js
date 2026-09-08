// ClarMind real leaderboard — Cloudflare Worker backed by D1 (SQLite).
//
// POST /score  { deviceId, name, zodiac, xp, streak, totalMinutes }  → upsert your row
// GET  /top?by=xp|streak|minutes&limit=25   (header X-Device-Id)      → top N, no ids
//
// Privacy/abuse note: device_ids are NEVER returned. Your row is keyed by a random
// device_id kept only on your device, so only you can overwrite your own row; the
// /top response marks your row with isYou by matching the X-Device-Id header
// server-side. Rows expose name + sign + stats only.
//
// Deploy: see README.md (needs a D1 binding named DB in wrangler.toml).

const COLS = { xp: 'xp', streak: 'streak', minutes: 'total_minutes' };
const MAX_BODY = 4000;

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors() });
    if (!env.DB) return json({ error: 'D1 binding "DB" missing' }, 500);

    const url = new URL(request.url);
    try {
      if (request.method === 'POST' && url.pathname === '/score') {
        const raw = await request.text();
        if (raw.length > MAX_BODY) return json({ error: 'payload too large' }, 413);
        const b = JSON.parse(raw);
        const deviceId = String(b.deviceId || '').slice(0, 64);
        if (!deviceId) return json({ error: 'deviceId required' }, 400);
        await env.DB.prepare(
          `INSERT INTO scores (device_id, name, zodiac, xp, streak, total_minutes, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
           ON CONFLICT(device_id) DO UPDATE SET
             name=excluded.name, zodiac=excluded.zodiac, xp=excluded.xp,
             streak=excluded.streak, total_minutes=excluded.total_minutes,
             updated_at=excluded.updated_at`
        ).bind(
          deviceId,
          String(b.name ?? 'Anon').slice(0, 40),
          String(b.zodiac ?? 'Aries').slice(0, 20),
          clampInt(b.xp), clampInt(b.streak), clampInt(b.totalMinutes),
          Date.now()
        ).run();
        return json({ ok: true });
      }

      if (request.method === 'GET' && url.pathname === '/top') {
        const by = COLS[url.searchParams.get('by')] || 'xp';
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '25', 10) || 25));
        const me = (request.headers.get('X-Device-Id') || '').slice(0, 64);
        const { results } = await env.DB.prepare(
          `SELECT device_id, name, zodiac, xp, streak, total_minutes
           FROM scores ORDER BY ${by} DESC, updated_at ASC LIMIT ?1`
        ).bind(limit).all();
        const rows = (results || []).map((r) => ({
          name: r.name, zodiac: r.zodiac, xp: r.xp, streak: r.streak,
          totalMinutes: r.total_minutes, isYou: !!me && r.device_id === me,
        }));
        return json({ rows });
      }

      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: String((e && e.message) || e).slice(0, 200) }, 500);
    }
  },
};

const clampInt = (v) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(10_000_000, Math.max(0, n)) : 0;
};
const cors = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Device-Id',
});
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors() } });
