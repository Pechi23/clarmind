import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
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
import DestinyMatrixChart, { MatrixNodeSelection } from '../components/DestinyMatrixChart';
import GradientCard from '../components/GradientCard';

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
  const [day, setDay] = useState(profile.birth ? String(parseDob(profile.birth.dob).day) : '');
  const [month, setMonth] = useState(profile.birth ? String(parseDob(profile.birth.dob).month) : '');
  const [year, setYear] = useState(profile.birth ? String(parseDob(profile.birth.dob).year) : '');
  const [hour, setHour] = useState(profile.birth ? String(profile.birth.hour) : '');
  const [minute, setMinute] = useState(profile.birth ? String(profile.birth.minute) : '');
  const [place, setPlace] = useState(profile.birth?.place ?? '');
  const [error, setError] = useState('');

  const [reading, setReading] = useState<NumerologyReading | null>(null);
  const [loadingReading, setLoadingReading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<MatrixNodeSelection | null>(null);

  useEffect(() => {
    if (birth) {
      setLoadingReading(true);
      getNumerologyReading(birth, profile.zodiacSign, language)
        .then(setReading)
        .finally(() => setLoadingReading(false));
    }
  }, [birth, language, profile.zodiacSign]);

  const onSave = async () => {
    const d = parseInt(day, 10), m = parseInt(month, 10), y = parseInt(year, 10);
    const h = parseInt(hour || '0', 10), min = parseInt(minute || '0', 10);
    const valid =
      firstName.trim() && lastName.trim() &&
      d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= new Date().getFullYear();
    if (!valid) { setError(t('numerology.incomplete')); return; }

    const details: BirthDetails = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      dob: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      hour: Math.min(23, Math.max(0, h || 0)),
      minute: Math.min(59, Math.max(0, min || 0)),
      place: place.trim(),
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

  // ---------- FORM ----------
  if (editing || !birth) {
    return (
      <LinearGradient colors={GRADIENTS.background} style={styles.container}>
        {Header}
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
            <View style={styles.row3}>
              <TextInput style={styles.smallInput} value={day} onChangeText={setDay} keyboardType="number-pad" maxLength={2} placeholder={t('numerology.day')} placeholderTextColor={COLORS.textDim} />
              <TextInput style={styles.smallInput} value={month} onChangeText={setMonth} keyboardType="number-pad" maxLength={2} placeholder={t('numerology.month')} placeholderTextColor={COLORS.textDim} />
              <TextInput style={[styles.smallInput, { flex: 1.4 }]} value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} placeholder={t('numerology.year')} placeholderTextColor={COLORS.textDim} />
            </View>

            <Text style={styles.label}>{t('numerology.birthTime')}</Text>
            <View style={styles.row3}>
              <TextInput style={styles.smallInput} value={hour} onChangeText={setHour} keyboardType="number-pad" maxLength={2} placeholder={t('numerology.hour')} placeholderTextColor={COLORS.textDim} />
              <TextInput style={styles.smallInput} value={minute} onChangeText={setMinute} keyboardType="number-pad" maxLength={2} placeholder={t('numerology.minute')} placeholderTextColor={COLORS.textDim} />
              <View style={{ flex: 1.4 }} />
            </View>

            <Text style={styles.label}>{t('numerology.place')}</Text>
            <TextInput style={styles.input} value={place} onChangeText={setPlace} placeholder={t('numerology.placePlaceholder')} placeholderTextColor={COLORS.textDim} />

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

        {/* Life lines */}
        <Text style={styles.sectionLabel}>{t('numerology.linesTitle')}</Text>
        <View style={styles.tileRow}>
          <View style={styles.tileCol}>
            <GradientCard colors={['rgba(253,164,175,0.16)', 'rgba(253,164,175,0.04)']} style={styles.lineTile}>
              <Text style={styles.tileValue}>{matrix.relationships}</Text>
              <Text style={styles.tileLabel}>{t('numerology.relationships')}</Text>
              <Text style={styles.tileHint}>{arcanaName(matrix.relationships, language)}</Text>
            </GradientCard>
          </View>
          <View style={styles.tileCol}>
            <GradientCard colors={['rgba(107,203,119,0.16)', 'rgba(107,203,119,0.04)']} style={styles.lineTile}>
              <Text style={styles.tileValue}>{matrix.money}</Text>
              <Text style={styles.tileLabel}>{t('numerology.money')}</Text>
              <Text style={styles.tileHint}>{arcanaName(matrix.money, language)}</Text>
            </GradientCard>
          </View>
        </View>

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
            const meta = CHAKRAS.find((c) => c.key === row.key)![language];
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
