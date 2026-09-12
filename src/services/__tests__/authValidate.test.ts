import { isValidEmail, validateCredentials } from '../authValidate';

describe('isValidEmail', () => {
  it('accepts normal addresses', () => {
    expect(isValidEmail('a@b.com')).toBe(true);
    expect(isValidEmail(' george.pecherle@gmail.com ')).toBe(true);
  });
  it('rejects bad ones', () => {
    for (const e of ['', 'a', 'a@b', 'a b@c.com', '@b.com']) expect(isValidEmail(e)).toBe(false);
  });
});

describe('validateCredentials', () => {
  it('flags a bad email first', () => {
    expect(validateCredentials('nope', 'longenough')).toBe('email');
  });
  it('flags a short password', () => {
    expect(validateCredentials('a@b.com', '123')).toBe('password');
  });
  it('passes valid credentials', () => {
    expect(validateCredentials('a@b.com', 'secret1')).toBeNull();
  });
});
