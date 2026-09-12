// Supabase authentication (optional). The app works fully offline without an
// account; signing in lets a user back up and sync later. Configured via
// EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY (both public-safe).
// The leaderboard stays on Cloudflare D1; this only handles user identity.
import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

const SUPA_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPA_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** True when Supabase keys are present, i.e. accounts are available. */
export const authConfigured = (): boolean => !!(SUPA_URL && SUPA_ANON);

export const supabase: SupabaseClient | null = authConfigured()
  ? createClient(SUPA_URL, SUPA_ANON, {
      auth: {
        storage: AsyncStorage as any,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;

export interface AuthUser { id: string; email: string | null; }

const mapUser = (u: any): AuthUser | null => (u ? { id: u.id, email: u.email ?? null } : null);

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return mapUser(data.session?.user);
  } catch {
    return null;
  }
};

/** Subscribe to sign-in/sign-out. Returns an unsubscribe function. */
export const onAuthChange = (cb: (u: AuthUser | null) => void): (() => void) => {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(mapUser(session?.user)));
  return () => data.subscription.unsubscribe();
};

export const signUpEmail = async (email: string, password: string): Promise<void> => {
  if (!supabase) throw new Error('Auth not configured');
  const { error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) throw error;
};

export const signInEmail = async (email: string, password: string): Promise<void> => {
  if (!supabase) throw new Error('Auth not configured');
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
};

export const signOut = async (): Promise<void> => {
  try { await supabase?.auth.signOut(); } catch {}
};

export const resetPassword = async (email: string): Promise<void> => {
  if (!supabase) throw new Error('Auth not configured');
  const redirectTo = makeRedirectUri({ scheme: 'clarmind', path: 'reset' });
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error) throw error;
};

/**
 * Sign in with Google or Apple via a browser redirect (PKCE). Requires the
 * provider to be enabled in the Supabase dashboard; Apple also needs the Apple
 * developer account. Resolves once a session is set.
 */
export const signInOAuth = async (provider: 'google' | 'apple'): Promise<void> => {
  if (!supabase) throw new Error('Auth not configured');
  const redirectTo = makeRedirectUri({ scheme: 'clarmind', path: 'auth' });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('No OAuth URL returned');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) return; // user cancelled
  const code = new URL(result.url).searchParams.get('code');
  if (code) {
    const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
    if (exErr) throw exErr;
  }
};
