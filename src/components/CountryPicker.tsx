import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, FlatList,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';
import { COUNTRIES, Country, flagEmoji } from '../constants/countries';
import { useI18n } from '../i18n';

interface Props {
  value?: string; // selected country name
  onSelect: (country: Country) => void;
  placeholder: string;
}

export default function CountryPicker({ value, onSelect, placeholder }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.code === q);
  }, [query]);

  const selected = value ? COUNTRIES.find((c) => c.name.toLowerCase() === value.toLowerCase()) : undefined;

  return (
    <>
      <TouchableOpacity style={styles.field} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={[styles.fieldText, !value && styles.placeholder]} numberOfLines={1}>
          {selected ? `${flagEmoji(selected.code)}  ${selected.name}` : value || placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <TextInput
                style={styles.search}
                value={query}
                onChangeText={setQuery}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textDim}
                autoFocus
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => { setOpen(false); setQuery(''); }} hitSlop={10}>
                <Text style={styles.cancel}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={results}
              keyExtractor={(c) => c.code}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={20}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => { onSelect(item); setOpen(false); setQuery(''); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rowFlag}>{flagEmoji(item.code)}</Text>
                  <Text style={styles.rowName}>{item.name}</Text>
                  {selected?.code === item.code && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.empty}>—</Text>}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.md, padding: SPACING.md,
  },
  fieldText: { flex: 1, fontFamily: FONTS.medium, fontSize: 16, color: COLORS.text },
  placeholder: { color: COLORS.textDim },
  chevron: { color: COLORS.textMuted, fontSize: 14, marginLeft: SPACING.sm },
  // Full-height, top-anchored so the search box and list stay above the keyboard
  // (a bottom sheet gets covered by the keyboard on Android).
  backdrop: { flex: 1, backgroundColor: COLORS.background, paddingTop: 44 },
  sheet: { flex: 1, backgroundColor: COLORS.background, paddingTop: SPACING.md },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
  },
  search: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10,
    fontFamily: FONTS.medium, fontSize: 16, color: COLORS.text,
  },
  cancel: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.primary },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  rowFlag: { fontSize: 22 },
  rowName: { flex: 1, fontFamily: FONTS.medium, fontSize: 16, color: COLORS.text },
  check: { color: COLORS.primary, fontFamily: FONTS.bold, fontSize: 16 },
  empty: { color: COLORS.textDim, textAlign: 'center', padding: SPACING.lg },
});
