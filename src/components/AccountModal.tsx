import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ActivityIndicator, ScrollView,
} from 'react-native';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useI18n } from '../i18n';
import {
  authConfigured, getCurrentUser, onAuthChange, signInEmail, signUpEmail,
  signOut, resetPassword, signInOAuth, AuthUser,
} from '../services/auth';
import { validateCredentials } from '../services/authValidate';
import { syncOnLogin, pushUserData } from '../services/sync';

interface Props { visible: boolean; onClose: () => void; }
type Mode = 'signin' | 'signup' | 'forgot';

export default function AccountModal({ visible, onClose }: Props) {
  const { t, language } = useI18n();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    getCurrentUser().then(setUser);
    return onAuthChange(setUser);
  }, []);

  const reset = () => { setErr(''); setMsg(''); };

  const submit = async () => {
    reset();
    if (mode !== 'forgot') {
      const bad = validateCredentials(email, password);
      if (bad === 'email') return setErr(t('account.errEmail'));
      if (bad === 'password') return setErr(t('account.errPassword'));
    }
    setBusy(true);
    try {
      if (mode === 'signin') { await signInEmail(email, password); await afterLogin(); }
      else if (mode === 'signup') { await signUpEmail(email, password, language); setMsg(t('account.checkEmail')); }
      else { await resetPassword(email); setMsg(t('account.resetSent')); }
    } catch (e: any) {
      setErr(e?.message ?? 'Error');
    } finally {
      setBusy(false);
    }
  };

  // After a successful login, reconcile with the cloud (restore or back up).
  const afterLogin = async () => {
    const r = await syncOnLogin();
    if (r === 'restored') setMsg(t('account.restored'));
    else if (r === 'pushed') setMsg(t('account.backedUp'));
  };

  const backupNow = async () => {
    reset();
    setBusy(true);
    try { const ok = await pushUserData(); setMsg(ok ? t('account.backedUp') : 'Error'); }
    finally { setBusy(false); }
  };

  const oauth = async (provider: 'google' | 'apple') => {
    reset();
    setBusy(true);
    try { await signInOAuth(provider); await afterLogin(); }
    catch (e: any) { setErr(e?.message ?? 'Error'); }
    finally { setBusy(false); }
  };

  const close = () => { reset(); setPassword(''); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.title}>{t('account.title')}</Text>
              <TouchableOpacity onPress={close} hitSlop={10}><Text style={styles.close}>✕</Text></TouchableOpacity>
            </View>

            {!authConfigured() ? (
              <Text style={styles.info}>{t('account.notConfigured')}</Text>
            ) : user ? (
              <View>
                <Text style={styles.info}>{t('account.signedInAs')}</Text>
                <Text style={styles.email}>{user.email}</Text>
                <Text style={styles.syncNote}>{t('account.syncNote')}</Text>
                {err ? <Text style={styles.err}>{err}</Text> : null}
                {msg ? <Text style={styles.msg}>{msg}</Text> : null}
                <TouchableOpacity onPress={backupNow} disabled={busy} activeOpacity={0.85} style={styles.primaryWrap}>
                  <LinearGradient colors={GRADIENTS.button} style={styles.primaryBtn}>
                    {busy ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryText}>{t('account.backupNow')}</Text>}
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => signOut()} activeOpacity={0.85} style={[styles.secondaryBtn, { marginTop: SPACING.sm }]}>
                  <Text style={styles.secondaryText}>{t('account.signOut')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {mode !== 'forgot' && (
                  <>
                    <TouchableOpacity onPress={() => oauth('google')} activeOpacity={0.85} style={styles.oauthBtn} disabled={busy}>
                      <Text style={styles.oauthText}>{t('account.google')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => oauth('apple')} activeOpacity={0.85} style={styles.oauthBtn} disabled={busy}>
                      <Text style={styles.oauthText}>{t('account.apple')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.or}>{t('account.or')}</Text>
                  </>
                )}

                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('account.email')}
                  placeholderTextColor={COLORS.textDim}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
                {mode !== 'forgot' && (
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={t('account.password')}
                    placeholderTextColor={COLORS.textDim}
                    secureTextEntry
                  />
                )}

                {err ? <Text style={styles.err}>{err}</Text> : null}
                {msg ? <Text style={styles.msg}>{msg}</Text> : null}

                <TouchableOpacity onPress={submit} activeOpacity={0.85} disabled={busy} style={styles.primaryWrap}>
                  <LinearGradient colors={GRADIENTS.button} style={styles.primaryBtn}>
                    {busy ? <ActivityIndicator color={COLORS.white} /> : (
                      <Text style={styles.primaryText}>
                        {mode === 'signin' ? t('account.signIn') : mode === 'signup' ? t('account.signUp') : t('account.sendReset')}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.links}>
                  {mode === 'signin' && (
                    <>
                      <TouchableOpacity onPress={() => { reset(); setMode('signup'); }}><Text style={styles.link}>{t('account.needAccount')}</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => { reset(); setMode('forgot'); }}><Text style={styles.link}>{t('account.forgotQ')}</Text></TouchableOpacity>
                    </>
                  )}
                  {mode === 'signup' && (
                    <TouchableOpacity onPress={() => { reset(); setMode('signin'); }}><Text style={styles.link}>{t('account.haveAccount')}</Text></TouchableOpacity>
                  )}
                  {mode === 'forgot' && (
                    <TouchableOpacity onPress={() => { reset(); setMode('signin'); }}><Text style={styles.link}>{t('account.backToSignIn')}</Text></TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: SPACING.lg },
  sheet: { backgroundColor: COLORS.backgroundLight, borderRadius: RADIUS.lg, padding: SPACING.lg, maxHeight: '88%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  title: { fontFamily: FONTS.semiBold, fontSize: 20, color: COLORS.text },
  close: { fontSize: 20, color: COLORS.textMuted },
  info: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textMuted, marginBottom: SPACING.sm },
  email: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.text, marginBottom: SPACING.sm },
  syncNote: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginBottom: SPACING.md, lineHeight: 18 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.md, padding: SPACING.md, fontFamily: FONTS.medium, fontSize: 16,
    color: COLORS.text, marginBottom: SPACING.sm,
  },
  oauthBtn: {
    backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: RADIUS.full, paddingVertical: 13, alignItems: 'center', marginBottom: SPACING.sm,
  },
  oauthText: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.text },
  or: { textAlign: 'center', color: COLORS.textDim, fontFamily: FONTS.regular, marginVertical: SPACING.sm },
  primaryWrap: { marginTop: SPACING.sm },
  primaryBtn: { borderRadius: RADIUS.full, paddingVertical: 15, alignItems: 'center' },
  primaryText: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.white },
  secondaryBtn: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: RADIUS.full,
    paddingVertical: 13, alignItems: 'center',
  },
  secondaryText: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.text },
  links: { marginTop: SPACING.lg, gap: SPACING.sm, alignItems: 'center' },
  link: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.primaryLight },
  err: { color: '#fda4af', fontFamily: FONTS.medium, fontSize: 13, marginBottom: SPACING.sm },
  msg: { color: '#6BCB77', fontFamily: FONTS.medium, fontSize: 13, marginBottom: SPACING.sm },
});
