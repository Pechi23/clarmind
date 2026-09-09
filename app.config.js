// Extends the static app.json with two build-time switches:
//  - EXPO_PUBLIC_BASE_URL (e.g. "/clarmind") bakes a subpath into the web export
//    so assets resolve under GitHub Pages project sites.
//  - EXPO_PUBLIC_APP_VARIANT=paid builds the paid twin: a distinct name + bundle id
//    so the free and paid apps are separate store listings (see constants/appVariant).
// With neither env var set — local dev, native free build, root-hosted web — the
// config is byte-for-byte the same as app.json.
module.exports = ({ config }) => {
  let c = config;

  const baseUrl = process.env.EXPO_PUBLIC_BASE_URL;
  if (baseUrl) {
    c = { ...c, experiments: { ...(c.experiments || {}), baseUrl } };
  }

  if (process.env.EXPO_PUBLIC_APP_VARIANT === 'paid') {
    const iosId = (c.ios && c.ios.bundleIdentifier) || 'com.clarmind.app';
    const androidId = (c.android && c.android.package) || 'com.clarmind.app';
    c = {
      ...c,
      name: `${c.name} Pro`,
      ios: { ...(c.ios || {}), bundleIdentifier: `${iosId}.pro` },
      android: { ...(c.android || {}), package: `${androidId}.pro` },
    };
  }

  return c;
};
