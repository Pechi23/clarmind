import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { searchPlaces, PlaceSuggestion } from '../services/placeSearch';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  /** Called when the user taps a suggestion (city name). */
  onSelectCity: (city: string) => void;
  countryCode?: string; // ISO alpha-2 to bias results
  placeholder: string;
}

export default function CityAutocomplete({
  value, onChangeText, onSelectCity, countryCode, placeholder,
}: Props) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const justPicked = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Don't re-query the term we just selected.
    if (justPicked.current) { justPicked.current = false; return; }
    const q = value.trim();
    if (q.length < 2) { setSuggestions([]); setOpen(false); return; }

    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      const results = await searchPlaces(q, countryCode, ctrl.signal);
      setLoading(false);
      setSuggestions(results);
      setOpen(results.length > 0);
    }, 450);

    return () => clearTimeout(handle);
  }, [value, countryCode]);

  const pick = (s: PlaceSuggestion) => {
    justPicked.current = true;
    onSelectCity(s.city || s.label.split(',')[0]);
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textDim}
          autoCorrect={false}
          onFocus={() => { if (suggestions.length) setOpen(true); }}
        />
        {loading && <ActivityIndicator size="small" color={COLORS.primaryLight} style={styles.spinner} />}
      </View>
      {open && (
        <View style={styles.dropdown}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={`${s.lat},${s.lon},${i}`}
              style={[styles.item, i === suggestions.length - 1 && styles.itemLast]}
              onPress={() => pick(s)}
              activeOpacity={0.7}
            >
              <Text style={styles.itemCity} numberOfLines={1}>{s.city}</Text>
              <Text style={styles.itemLabel} numberOfLines={1}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: { justifyContent: 'center' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.md, padding: SPACING.md,
    fontFamily: FONTS.medium, fontSize: 16, color: COLORS.text,
  },
  spinner: { position: 'absolute', right: SPACING.md },
  dropdown: {
    marginTop: 4,
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.md, overflow: 'hidden',
  },
  item: {
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  itemLast: { borderBottomWidth: 0 },
  itemCity: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.text },
  itemLabel: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
});
