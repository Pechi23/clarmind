# User accounts (Supabase) — setup

Accounts are **optional**: the app works fully offline. Signing in lets a user
back up and sync later. The leaderboard stays on Cloudflare D1; this only handles
identity.

## 1. Create the project (5 min)
1. Go to https://supabase.com, create a free project.
2. Project Settings → API. Copy the **Project URL** and the **anon public** key.
3. Put them in `.env` (and as GitHub Actions variables for the web build):

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

Email/password + password reset work immediately after this (rebuild the app).

## 2. Email settings
Authentication → Providers → Email is on by default. Under Authentication →
URL Configuration, add the redirect URL `clarmind://reset` (and `clarmind://auth`).

## 3. Google login (optional)
1. Authentication → Providers → Google → enable.
2. Create an OAuth client in Google Cloud Console, paste the client id/secret into
   Supabase, and add `clarmind://auth` as an allowed redirect.
3. A prebuild is needed so the `clarmind://` scheme is in the Android manifest:
   `npx expo prebuild -p android` (then re-apply the `gradle.properties` memory bump if it resets).

## 4. Apple login (optional, needs the Apple Developer account)
Same as Google, plus Sign in with Apple configured in your Apple Developer account.
Defer until you have the $99 account.

## Notes
- Both keys are public-safe (the anon key is designed to ship in the app).
- Without the keys, the Account screen shows "Accounts are not set up yet" and the
  app stays fully usable offline.
