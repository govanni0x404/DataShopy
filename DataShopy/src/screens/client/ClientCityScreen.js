import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import { getAllStores, getClientPreferences, saveClientPreferences } from '../../database/db';

export default function ClientCityScreen({ navigation, route }) {
  const user = route.params?.user;
  const prefs = getClientPreferences(user?.id);
  const [city, setCity] = useState(prefs.preferred_city || '');

  const suggestions = useMemo(() => {
    const all = getAllStores(null)
      .map((store) => String(store.city || '').trim())
      .filter(Boolean);
    return [...new Set(all)].sort((a, b) => a.localeCompare(b)).slice(0, 12);
  }, []);

  const handleSave = () => {
    saveClientPreferences(user?.id, { preferred_city: city });
    navigation.goBack();
  };

  const clearPreference = () => {
    setCity('');
    saveClientPreferences(user?.id, { preferred_city: '' });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi ciudad</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <Text style={styles.title}>Personaliza el catálogo</Text>
          <Text style={styles.desc}>
            Si eliges una ciudad favorita, DataShopy prioriza esa zona cuando no haya una ubicación exacta disponible.
          </Text>

          <Text style={styles.label}>Ciudad preferida</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="Temuco"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={styles.label}>Sugerencias</Text>
          <View style={styles.chips}>
            {suggestions.map((item) => (
              <TouchableOpacity key={item} style={styles.chip} onPress={() => setCity(item)}>
                <Text style={styles.chipText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
            <Text style={styles.primaryBtnText}>Guardar ciudad</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={clearPreference}>
            <Text style={styles.secondaryBtnText}>Usar ubicación automática</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    height: 56,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  body: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
    padding: spacing.lg,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  desc: { marginTop: 8, fontSize: 13, lineHeight: 20, color: colors.textSecondary },
  label: { marginTop: 18, marginBottom: 8, fontSize: 12, color: colors.textSecondary },
  input: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  chipText: { color: colors.primary, fontSize: 12, fontWeight: '500' },
  primaryBtn: {
    marginTop: 22,
    backgroundColor: colors.brandInk,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryBtnText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  secondaryBtn: {
    marginTop: 10,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryBtnText: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
});
