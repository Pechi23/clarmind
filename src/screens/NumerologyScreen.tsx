import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ActivityIndicator, Platform, Modal,
} from 'react-native';
import DateTimePicker from '../components/DateTimePicker';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { useI18n } from '../i18n';
import { UserProfile, BirthDetails, Gender } from '../types';
import { saveBirthDetails } from '../services/storage';
import { parseDob, computeNumerology } from '../services/numerology';
import {
  computeDestinyMatrix, arcanaName, arcanaMeaning, positionInfo, PositionKey,
  CHAKRAS, computeChakras, chakraTotals,
} from '../services/destinyMatrix';
import { getNumerologyReading, NumerologyReading } from '../services/numerologyReading';
import { isFeatureLocked } from '../services/entitlements';
import { ascendantSign } from '../services/ascendant';
import { moonSign } from '../services/birthChart';
import { ZODIAC_SIGNS } from '../constants/zodiac';
import DestinyMatrixChart, { MatrixNodeSelection } from '../components/DestinyMatrixChart';
import GradientCard from '../components/GradientCard';
import NatalChartScreen from './NatalChartScreen';

interface Props {
  profile: UserProfile;
  onClose: () => void;
  onUpdated: (p: UserProfile) => void;
}

export default function NumerologyScreen({ profile, onClose, onUpdated }: Props) {
  const { t, language } = useI18n();
  const [birth, setBirth] = useState<BirthDetails | undefined>(profile.birth);
  const [editing, setEditing] = useState(!profile.birth);

  // Form state
  const [firstName, setFirstName] = useState(profile.birth?.firstName ?? profile.name ?? '');
  const [lastName, setLastName] = useState(profile.birth?.lastName ?? '');
  const [gender, setGender] = useState<Gender>(profile.birth?.gender ?? 'other');
  const initialDate = profile.birth
    ? (() => { const p = parseDob(profile.birth.dob); return new Date(p.year, p.month - 1, p.day); })()
    : null;
  const initialTime = profile.birth
    ? (() => { const d = new Date(); d.setHours(profile.birth.hour, profile.birth.minute, 0, 0); return d; })()
    : null;
  const [dateVal, setDateVal] = useState<Date | null>(initialDate);
  const [timeVal, setTimeVal] = useState<Date | null>(initialTime);
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const initialPlace = profile.birth?.place ?? '';
  const initialComma = initialPlace.indexOf(',');
  const [locality, setLocality] = useState(initialComma >= 0 ? initialPlace.slice(0, initialComma).trim() : initialPlace.trim());
  const [country, setCountry] = useState(initialComma >= 0 ? initialPlace.slice(initialComma + 1).trim() : '');
  const countryRef = useRef<TextInput>(null);
  const [error, setError] = useState('');

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateLabel = dateVal ? `${pad(dateVal.getDate())}.${pad(dateVal.getMonth() + 1)}.${dateVal.getFullYear()}` : '';
  const timeLabel = timeVal ? `${pad(timeVal.getHours())}:${pad(timeVal.getMinutes())}` : '';

  const [reading, setReading] = useState<NumerologyReading | null>(null);
  const [loadingReading, setLoadingReading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<MatrixNodeSelection | null>(null);
  const [locked, setLocked] = useState<boolean | null>(null);
  const [natalOpen, setNatalOpen] = useState(false);

  useEffect(() => { isFeatureLocked('numerology').then(setLocked); }, []);

  useEffect(() => {
    if (birth) {
      setLoadingReading(true);
      getNumerologyReading(birth, profile.zodiacSign, language)
        .then(setReading)
        .finally(() => setLoadingReading(false));
    }
  }, [birth, language, profile.zodiacSign]);

  const onSave = async () => {
    const valid = firstName.trim() && lastName.trim() && dateVal && timeVal;
    if (!valid) { setError(t('numerology.incomplete')); return; }

    const details: BirthDetails = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      dob: `${dateVal.getFullYear()}-${pad(dateVal.getMonth() + 1)}-${pad(dateVal.getDate())}`,
      hour: timeVal.getHours(),
      minute: timeVal.getMinutes(),
      place: [locality.trim(), country.trim()].filter(Boolean).join(', '),
    };
    const updated = await saveBirthDetails(details);
    if (updated) onUpdated(updated);
    setBirth(details);
    setEditing(false);
  };

  const Header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={onClose} hitSlop={12}><Text style={styles.close}>✕</Text></TouchableOpacity>
      <Text style={styles.headerTitle}>{t('numerology.label')}</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  // ---------- PAYWALL ----------
  if (locked) {
    return (
      <LinearGradient colors={GRADIENTS.background} style={styles.container}>
        {Header}
        <View style={styles.paywallWrap}>
          <Text style={styles.paywallEmoji}>🔢✨</Text>
          <Text style={styles.paywallTitle}>{t('numerology.lockedTitle')}</Text>
          <Text style={styles.paywallBody}>{t('numerology.lockedBody')}</Text>
          <Text style={styles.paywallHint}>{t('numerology.lockedHint')}</Text>
        </View>
      </LinearGradient>
    );
  }

  // ---------- FORM ----------
  if (editing || !birth) {
    return (
      <LinearGradient colors={GRADIENTS.background} style={styles.container}>
        {Header}
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{t('numerology.setupTitle')}</Text>
            <Text style={styles.subtitle}>{t('numerology.setupSubtitle')}</Text>

            <Text style={styles.label}>{t('numerology.firstName')}</Text>
            <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder={t('numerology.firstName')} placeholderTextColor={COLORS.textDim} />

            <Text style={styles.label}>{t('numerology.lastName')}</Text>
            <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder={t('numerology.lastName')} placeholderTextColor={COLORS.textDim} />

            <Text style={styles.label}>{t('numerology.gender')}</Text>
            <View style={styles.chipRow}>
              {(['female', 'male', 'other'] as Gender[]).map((g) => (
                <TouchableOpacity key={g} onPress={() => setGender(g)} style={[styles.chip, gender === g && styles.chipActive]}>
                  <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>
                    {t(`numerology.gender${g[0].toUpperCase()}${g.slice(1)}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{t('numerology.dob')}</Text>
            <TouchableOpacity style={styles.pickerField} onPress={() => { setShowTime(false); setShowDate(true); }} activeOpacity={0.8}>
              <Text style={[styles.pickerText, !dateVal && styles.pickerPlaceholder]}>
                {dateVal ? dateLabel : t('numerology.selectDate')}
              </Text>
              <Text style={styles.pickerIcon}>📅</Text>
            </TouchableOpacity>
            {showDate && (
              <DateTimePicker
                value={dateVal ?? new Date(2000, 0, 1)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                onChange={(e, d) => {
                  if (Platform.OS === 'android') setShowDate(false);
                  if (e.type === 'set' && d) setDateVal(d);
                }}
              />
            )}
            {Platform.OS === 'ios' && showDate && (
              <TouchableOpacity onPress={() => setShowDate(false)} style={styles.pickerDone}>
                <Text style={styles.pickerDoneText}>{t('common.done')}</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.label}>{t('numerology.birthTime')}</Text>
            <TouchableOpacity style={styles.pickerField} onPress={() => { setShowDate(false); setShowTime(true); }} activeOpacity={0.8}>
              <Text style={[styles.pickerText, !timeVal && styles.pickerPlaceholder]}>
                {timeVal ? timeLabel : t('numerology.selectTime')}
              </Text>
              <Text style={styles.pickerIcon}>🕐</Text>
            </TouchableOpacity>
            {showTime && (
              <DateTimePicker
                value={timeVal ?? new Date(2000, 0, 1, 12, 0)}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, d) => {
                  if (Platform.OS === 'android') setShowTime(false);
                  if (e.type === 'set' && d) setTimeVal(d);
                }}
              />
            )}
            {Platform.OS === 'ios' && showTime && (
              <TouchableOpacity onPress={() => setShowTime(false)} style={styles.pickerDone}>
                <Text style={styles.pickerDoneText}>{t('common.done')}</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.label}>{t('numerology.locality')}</Text>
            <TextInput
              style={styles.input}
              value={locality}
              onChangeText={setLocality}
              placeholder={t('numerology.localityPlaceholder')}
              placeholderTextColor={COLORS.textDim}
              returnKeyType="next"
              onSubmitEditing={() => countryRef.current?.focus()}
              blurOnSubmit={false}
            />

            <Text style={styles.label}>{t('numerology.country')}</Text>
            <TextInput
              ref={countryRef}
              style={styles.input}
              value={country}
              onChangeText={setCountry}
              placeholder={t('numerology.countryPlaceholder')}
              placeholderTextColor={COLORS.textDim}
              returnKeyType="done"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity onPress={onSave} activeOpacity={0.85} style={{ marginTop: SPACING.lg }}>
              <LinearGradient colors={GRADIENTS.button} style={styles.button}>
                <Text style={styles.buttonText}>{t('numerology.save')}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>{t('numerology.disclaimer')}</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  // ---------- READING ----------
  const dob = parseDob(birth.dob);
  const nums = computeNumerology(dob, `${birth.firstName} ${birth.lastName}`);
  const matrix = computeDestinyMatrix(dob);

  const ascName = ascendantSign(profile.zodiacSign, birth.hour, birth.minute);
  const ascInfo = ZODIAC_SIGNS.find((z) => z.name === ascName)!;
  const sunInfo = ZODIAC_SIGNS.find((z) => z.name === profile.zodiacSign)!;
  const moonInfo = ZODIAC_SIGNS.find((z) => z.name === moonSign(birth.dob, birth.hour, birth.minute))!;
  const signLabel = (z: typeof ascInfo) => (language === 'ro' ? z.romanian : z.name);

  const NumberTile = ({ label, value, hint, big }: { label: string; value: number; hint?: string; big?: boolean }) => (
    <GradientCard colors={['rgba(167,139,250,0.18)', 'rgba(124,58,237,0.05)']} style={styles.tile}>
      <Text style={[styles.tileValue, big && { fontSize: 44 }]}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
      {hint ? <Text style={styles.tileHint}>{hint}</Text> : null}
    </GradientCard>
  );

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      {Header}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Today's reading */}
        <Text style={styles.sectionLabel}>{t('numerology.todayTitle')}</Text>
        <GradientCard colors={['rgba(125,211,252,0.16)', 'rgba(59,130,246,0.05)']} style={styles.cardSpacing}>
          {loadingReading || !reading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.md }} />
          ) : (
            <>
              <View style={styles.pdBadge}><Text style={styles.pdBadgeText}>{t('numerology.personalDay')} {reading.personalDay}</Text></View>
              <Text style={styles.readingHeadline}>{reading.headline}</Text>
              <Text style={styles.readingMessage}>{reading.message}</Text>
              <Text style={styles.readingFocus}>🎯 {reading.focus}</Text>
            </>
          )}
        </GradientCard>

        {/* Core numbers */}
        <Text style={styles.sectionLabel}>{t('numerology.coreTitle')}</Text>
        <NumberTile label={t('numerology.lifePath')} value={nums.lifePath} hint={t('numerology.lifePathHint')} big />
        <View style={styles.tileRow}>
          <View style={styles.tileCol}><NumberTile label={t('numerology.expression')} value={nums.expression} /></View>
          <View style={styles.tileCol}><NumberTile label={t('numerology.soulUrge')} value={nums.soulUrge} /></View>
          <View style={styles.tileCol}><NumberTile label={t('numerology.personality')} value={nums.personality} /></View>
        </View>

        {/* Birth chart — the big three (Sun / Moon / Rising) */}
        <Text style={styles.sectionLabel}>{t('numerology.bigThreeTitle')}</Text>
        <GradientCard colors={['rgba(167,139,250,0.16)', 'rgba(124,58,237,0.04)']} style={styles.cardSpacing}>
          <View style={styles.astroRow}>
            <View style={styles.astroCol}>
              <Text style={styles.astroEmoji}>{sunInfo.emoji}</Text>
              <Text style={styles.astroValue}>{signLabel(sunInfo)}</Text>
              <Text style={styles.astroLabel}>☀️ {t('numerology.sunSign')}</Text>
            </View>
            <View style={styles.astroDivider} />
            <View style={styles.astroCol}>
              <Text style={styles.astroEmoji}>{moonInfo.emoji}</Text>
              <Text style={styles.astroValue}>{signLabel(moonInfo)}</Text>
              <Text style={styles.astroLabel}>🌙 {t('numerology.moonSign')}</Text>
            </View>
            <View style={styles.astroDivider} />
            <View style={styles.astroCol}>
              <Text style={styles.astroEmoji}>{ascInfo.emoji}</Text>
              <Text style={styles.astroValue}>{signLabel(ascInfo)}</Text>
              <Text style={styles.astroLabel}>⬆️ {t('numerology.ascendant')}</Text>
            </View>
          </View>
          <Text style={styles.astroHint}>{t('numerology.bigThreeHint')}</Text>
          <TouchableOpacity onPress={() => setNatalOpen(true)} activeOpacity={0.85} style={styles.natalBtn}>
            <Text style={styles.natalBtnText}>{t('numerology.natalOpen')}</Text>
          </TouchableOpacity>
        </GradientCard>

        <Modal visible={natalOpen} animationType="slide" onRequestClose={() => setNatalOpen(false)}>
          <NatalChartScreen profile={profile} onClose={() => setNatalOpen(false)} />
        </Modal>

        {/* Destiny Matrix */}
        <Text style={styles.sectionLabel}>{t('numerology.matrixTitle')}</Text>
        <GradientCard style={styles.cardSpacing}>
          <DestinyMatrixChart
            matrix={matrix}
            onNodePress={setSelectedNode}
            selectedValue={selectedNode?.value ?? null}
          />
          <Text style={styles.matrixHint}>
            {selectedNode ? t('numerology.matrixHint') : t('numerology.matrixTapHint')}
          </Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#a78bfa' }]} /><Text style={styles.legendText}>{t('numerology.genMale')}</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#fda4af' }]} /><Text style={styles.legendText}>{t('numerology.genFemale')}</Text></View>
          </View>
        </GradientCard>

        {/* Interactive node detail */}
        {selectedNode && (() => {
          const pos = positionInfo(selectedNode.position, language);
          return (
            <GradientCard colors={['rgba(252,211,77,0.14)', 'rgba(252,211,77,0.04)']} style={styles.cardSpacing}>
              <View style={styles.detailHead}>
                <View style={styles.detailNum}><Text style={styles.detailNumText}>{selectedNode.value}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailTitle}>{pos.title}</Text>
                  <Text style={styles.detailArcana}>
                    {t('numerology.arcanaLabel')} {selectedNode.value} · {arcanaName(selectedNode.value, language)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedNode(null)} hitSlop={10}>
                  <Text style={styles.detailClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.detailText}>{pos.meaning}</Text>
              <Text style={styles.detailText}>{arcanaMeaning(selectedNode.value, language)}</Text>
              <Text style={styles.detailInfluence}>
                {t('numerology.influence', { arcana: arcanaName(selectedNode.value, language) })}
              </Text>
            </GradientCard>
          );
        })()}

        {/* Chakra energy map */}
        <Text style={styles.sectionLabel}>{t('numerology.chakraTitle')}</Text>
        <GradientCard style={styles.cardSpacing}>
          <View style={styles.chakraHeader}>
            <View style={styles.chakraName} />
            <Text style={styles.chakraColHead}>{t('numerology.chakraPhysical')}</Text>
            <Text style={styles.chakraColHead}>{t('numerology.chakraEnergy')}</Text>
            <Text style={styles.chakraColHead}>{t('numerology.chakraEmotions')}</Text>
          </View>
          {computeChakras(matrix).map((row) => {
            const meta = CHAKRAS.find((c) => c.key === row.key)![language === 'ro' ? 'ro' : 'en'];
            const color = CHAKRAS.find((c) => c.key === row.key)!.color;
            return (
              <View key={row.key} style={styles.chakraRow}>
                <View style={styles.chakraName}>
                  <View style={[styles.chakraDot, { backgroundColor: color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chakraNameText}>{meta.name}</Text>
                    <Text style={styles.chakraTheme}>{meta.theme}</Text>
                  </View>
                </View>
                <Text style={styles.chakraNum}>{row.physical}</Text>
                <Text style={[styles.chakraNum, { color: COLORS.primaryLight }]}>{row.energy}</Text>
                <Text style={styles.chakraNum}>{row.emotional}</Text>
              </View>
            );
          })}
          {(() => {
            const totals = chakraTotals(computeChakras(matrix));
            return (
              <View style={[styles.chakraRow, styles.chakraTotalRow]}>
                <Text style={[styles.chakraNameTotal, styles.chakraTotalLabel]}>{t('numerology.chakraTotal')}</Text>
                <Text style={[styles.chakraNum, styles.chakraTotalLabel]}>{totals.physical}</Text>
                <Text style={[styles.chakraNum, styles.chakraTotalLabel]}>{totals.energy}</Text>
                <Text style={[styles.chakraNum, styles.chakraTotalLabel]}>{totals.emotional}</Text>
              </View>
            );
          })()}
          <Text style={styles.chakraNote}>{t('numerology.chakraNote')}</Text>
        </GradientCard>

        <TouchableOpacity onPress={() => setEditing(true)} style={styles.editBtn}>
          <Text style={styles.editText}>{t('numerology.edit')}</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>{t('numerology.disclaimer')}</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 60, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  close: { fontFamily: FONTS.medium, fontSize: 20, color: COLORS.textMuted, width: 40 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  scroll: { padding: SPACING.lg, paddingBottom: 40 },
  title: { fontFamily: FONTS.bold, fontSize: 26, color: COLORS.text, marginBottom: SPACING.xs },
  subtitle: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textMuted, marginBottom: SPACING.lg, lineHeight: 20 },
  label: {
    fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textMuted,
    letterSpacing: 1, textTransform: 'uppercase', marginTop: SPACING.md, marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.md, padding: SPACING.md, fontFamily: FONTS.medium, fontSize: 16, color: COLORS.text,
  },
  chipRow: { flexDirection: 'row', gap: SPACING.sm },
  chip: {
    flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: { backgroundColor: 'rgba(167,139,250,0.2)', borderColor: COLORS.primary },
  chipText: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.textMuted },
  chipTextActive: { color: COLORS.primaryLight },
  row3: { flexDirection: 'row', gap: SPACING.sm },
  smallInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.md, padding: SPACING.md, fontFamily: FONTS.medium, fontSize: 16, color: COLORS.text, textAlign: 'center',
  },
  pickerField: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.md, paddingVertical: SPACING.md, paddingHorizontal: SPACING.md,
  },
  pickerText: { fontFamily: FONTS.medium, fontSize: 16, color: COLORS.text },
  pickerPlaceholder: { color: COLORS.textDim },
  pickerIcon: { fontSize: 18 },
  pickerDone: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 16, marginTop: 4 },
  pickerDoneText: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.primaryLight },
  paywallWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  paywallEmoji: { fontSize: 48, marginBottom: SPACING.lg },
  paywallTitle: { fontFamily: FONTS.bold, fontSize: 26, color: COLORS.text, textAlign: 'center', marginBottom: SPACING.md },
  paywallBody: { fontFamily: FONTS.regular, fontSize: 16, color: COLORS.textMuted, textAlign: 'center', lineHeight: 24, marginBottom: SPACING.lg },
  paywallHint: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textDim, textAlign: 'center', fontStyle: 'italic' },
  error: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.accentWarm, marginTop: SPACING.md, textAlign: 'center' },
  button: { paddingVertical: 16, borderRadius: RADIUS.full, alignItems: 'center' },
  buttonText: { fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.white },
  disclaimer: {
    fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textDim,
    marginTop: SPACING.lg, lineHeight: 16, textAlign: 'center',
  },
  sectionLabel: {
    fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textMuted,
    letterSpacing: 1, textTransform: 'uppercase', marginTop: SPACING.md, marginBottom: SPACING.sm,
  },
  cardSpacing: { marginBottom: SPACING.md },
  pdBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(125,211,252,0.18)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full, marginBottom: SPACING.sm,
  },
  pdBadgeText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.accent },
  readingHeadline: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.text, marginBottom: SPACING.sm },
  readingMessage: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.textMuted, lineHeight: 23 },
  readingFocus: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text, marginTop: SPACING.md },
  tile: { alignItems: 'center', marginBottom: SPACING.sm },
  tileValue: { fontFamily: FONTS.bold, fontSize: 30, color: COLORS.primaryLight },
  tileLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.text, marginTop: 2 },
  tileHint: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textDim, marginTop: 2 },
  tileRow: { flexDirection: 'row', gap: SPACING.sm },
  tileCol: { flex: 1 },
  matrixHint: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.sm },
  detailHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.sm },
  detailNum: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(252,211,77,0.15)', borderWidth: 1, borderColor: 'rgba(252,211,77,0.4)',
  },
  detailNumText: { fontFamily: FONTS.bold, fontSize: 20, color: '#fcd34d' },
  detailTitle: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.text },
  detailArcana: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.primaryLight, marginTop: 2 },
  detailClose: { fontFamily: FONTS.medium, fontSize: 18, color: COLORS.textMuted },
  detailText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textMuted, lineHeight: 21, marginTop: SPACING.sm },
  detailInfluence: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text, lineHeight: 21, marginTop: SPACING.md, fontStyle: 'italic' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.md, marginTop: SPACING.sm, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted },
  lineTile: { alignItems: 'center' },
  astroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  astroCol: { flex: 1, alignItems: 'center' },
  astroDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: SPACING.xs },
  astroEmoji: { fontSize: 26, color: COLORS.primaryLight, marginBottom: 2 },
  astroValue: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text, textAlign: 'center' },
  astroLabel: { fontFamily: FONTS.medium, fontSize: 10, color: COLORS.textMuted, letterSpacing: 0.3, marginTop: 2 },
  astroHint: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textDim, textAlign: 'center', marginTop: SPACING.md, lineHeight: 16 },
  natalBtn: { marginTop: SPACING.md, alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: RADIUS.full, backgroundColor: 'rgba(167,139,250,0.2)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)' },
  natalBtnText: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.primaryLight },
  chakraHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  chakraRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  chakraName: { flex: 2.4, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  chakraNameTotal: { flex: 2.4 },
  chakraColHead: { flex: 1, textAlign: 'center', fontFamily: FONTS.medium, fontSize: 11, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 0.5 },
  chakraNum: { flex: 1, textAlign: 'center', fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.text },
  chakraDot: { width: 10, height: 10, borderRadius: 5 },
  chakraNameText: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.text },
  chakraTheme: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textDim },
  chakraTotalRow: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', marginTop: 4 },
  chakraTotalLabel: { fontFamily: FONTS.bold, color: COLORS.text },
  chakraNote: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textDim, marginTop: SPACING.md, lineHeight: 16 },
  editBtn: { alignItems: 'center', padding: SPACING.md, marginTop: SPACING.sm },
  editText: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.primary },
});
