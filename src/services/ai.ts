// Single gateway for all Gemini calls.
//
// SECURITY: shipping EXPO_PUBLIC_GEMINI_API_KEY in the app bundles the key into
// the APK, where anyone can extract it. Set EXPO_PUBLIC_AI_PROXY_URL to a small
// server (see /proxy) that holds the key as a server-side secret — then the key
// never ships in the app. Direct mode stays as a local-dev fallback.
const MODEL = 'gemini-3.6-flash';
const DIRECT_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const PROXY_URL = process.env.EXPO_PUBLIC_AI_PROXY_URL;
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

/** True when the app can reach Gemini (via proxy or a dev key). */
export const hasAi = (): boolean => !!(PROXY_URL || API_KEY);

/** True when running against the secure proxy (no key in the app). */
export const usingProxy = (): boolean => !!PROXY_URL;

/**
 * POST a Gemini request body and return the model's text.
 * `body` is the full generateContent payload ({ contents, systemInstruction?, generationConfig? }).
 * Throws on a non-OK response; callers decide whether to fall back.
 */
export const callGemini = async (body: Record<string, unknown>): Promise<string> => {
  const url = PROXY_URL || `${DIRECT_URL}?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`AI error ${res.status}: ${err}`.slice(0, 300));
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
};
