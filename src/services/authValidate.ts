// Pure credential validation (no native imports, so it is unit-testable).

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export type CredError = 'email' | 'password' | null;

/** Returns the first problem with a sign-up/sign-in, or null when valid. */
export const validateCredentials = (email: string, password: string): CredError => {
  if (!isValidEmail(email)) return 'email';
  if (password.length < 6) return 'password';
  return null;
};
