// Extends the static app.json. Its only job: when EXPO_PUBLIC_BASE_URL is set
// (e.g. "/clarmind" for GitHub Pages project sites), bake that base path into the
// web export so every asset URL resolves under the subpath. When the env var is
// unset — local dev, native builds, root-hosted web (Netlify/Vercel) — the config
// is byte-for-byte the same as app.json.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_PUBLIC_BASE_URL;
  if (!baseUrl) return config;
  return {
    ...config,
    experiments: { ...(config.experiments || {}), baseUrl },
  };
};
