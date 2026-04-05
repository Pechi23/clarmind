import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';
import { ZODIAC_SIGNS, ZodiacInfo } from '../constants/zodiac';
import { saveUserProfile } from '../services/storage';
import { UserProfile } from '../types';

const { width } = Dimensions.get('window');

interface Props {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [selectedZodiac, setSelectedZodiac] = useState<ZodiacInfo | null>(null);

  const handleNameNext = () => {
    if (name.trim().length >= 2) setStep(2);
  };

  const handleFinish = async () => {
    if (!selectedZodiac) return;
    const profile: UserProfile = {
      name: name.trim(),
      zodiacSign: selectedZodiac.name,
      onboardingComplete: true,
    };
    await saveUserProfile(profile);
    onComplete();
  };

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {step === 1 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.logo}>✦ ClarMind</Text>
            <Text style={styles.headline}>Clear your mind,{'\n'}every single day.</Text>
            <Text style={styles.subtext}>
              Personalized mindfulness, zodiac insights and daily calm — built just for you.
            </Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>What should we call you?</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name..."
                placeholderTextColor={COLORS.textDim}
                value={name}
                onChangeText={setName}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={handleNameNext}
              />
            </View>
            <TouchableOpacity
              style={[styles.button, name.trim().length < 2 && styles.buttonDisabled]}
              onPress={handleNameNext}
              disabled={name.trim().length < 2}
              activeOpacity={0.8}
            >
              <LinearGradient colors={GRADIENTS.button} style={styles.buttonGradient}>
                <Text style={styles.buttonText}>Continue →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.flex}>
            <View style={styles.stepHeader}>
              <TouchableOpacity onPress={() => setStep(1)}>
                <Text style={styles.back}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.logo}>✦ ClarMind</Text>
              <View style={{ width: 50 }} />
            </View>
            <Text style={styles.headline2}>What's your{'\n'}zodiac sign?</Text>
            <Text style={styles.subtext2}>
              Hi {name}! Your sign helps us personalize your daily message.
            </Text>
            <ScrollView
              contentContainerStyle={styles.zodiacGrid}
              showsVerticalScrollIndicator={false}
            >
              {ZODIAC_SIGNS.map((sign) => {
                const isSelected = selectedZodiac?.name === sign.name;
                return (
                  <TouchableOpacity
                    key={sign.name}
                    style={[
                      styles.zodiacCard,
                      isSelected && { borderColor: sign.color, backgroundColor: `${sign.color}22` },
                    ]}
                    onPress={() => setSelectedZodiac(sign)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.zodiacEmoji}>{sign.emoji}</Text>
                    <Text style={[styles.zodiacName, isSelected && { color: sign.color }]}>
                      {sign.romanian}
                    </Text>
                    <Text style={styles.zodiacDate}>{sign.dateRange}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={[styles.button, !selectedZodiac && styles.buttonDisabled]}
                onPress={handleFinish}
                disabled={!selectedZodiac}
                activeOpacity={0.8}
              >
                <LinearGradient colors={GRADIENTS.button} style={styles.buttonGradient}>
                  <Text style={styles.buttonText}>Start my journey ✦</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const CARD_WIDTH = (width - SPACING.lg * 2 - SPACING.sm * 2) / 3;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  stepContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: 80,
    paddingBottom: SPACING.xl,
  },
  logo: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: SPACING.xxl,
  },
  headline: {
    fontFamily: FONTS.bold,
    fontSize: 36,
    color: COLORS.text,
    lineHeight: 44,
    marginBottom: SPACING.md,
  },
  subtext: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textMuted,
    lineHeight: 24,
    marginBottom: SPACING.xxl,
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  inputWrapper: { marginBottom: SPACING.xl },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontFamily: FONTS.medium,
    fontSize: 18,
    color: COLORS.text,
  },
  button: { width: '100%' },
  buttonDisabled: { opacity: 0.4 },
  buttonGradient: {
    paddingVertical: 16,
    borderRadius: RADIUS.full,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 56,
    paddingBottom: SPACING.md,
  },
  back: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.primary,
    width: 50,
  },
  headline2: {
    fontFamily: FONTS.bold,
    fontSize: 30,
    color: COLORS.text,
    lineHeight: 38,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  subtext2: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textMuted,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  zodiacGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    paddingBottom: 100,
  },
  zodiacCard: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: SPACING.sm,
    alignItems: 'center',
    gap: 4,
  },
  zodiacEmoji: { fontSize: 26 },
  zodiacName: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.text,
  },
  zodiacDate: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.textDim,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 34,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.background,
  },
});
