import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import { getClientPreferences, saveClientPreferences } from '../../database/db';

const RADIUS_OPTIONS = [
  { label: '100 m', value: 0.1 },
  { label: '300 m', value: 0.3 },
  { label: '500 m', value: 0.5 },
  { label: '1 km', value: 1 },
  { label: '2 km', value: 2 },
];

function SettingRow({ title, desc, value, onValueChange }) {
  return (
    <View style={styles.settingRow}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDesc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#DADADA', true: colors.primaryMid }}
        thumbColor={value ? colors.primary : colors.white}
      />
    </View>
  );
}

export default function ClientSettingsScreen({ navigation, route }) {
  const user = route.params?.user;
  const initial = getClientPreferences(user?.id);
  const [prefs, setPrefs] = useState(initial);

  const updatePref = (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveClientPreferences(user?.id, { [key]: value });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preferencias de la app</Text>
          <Text style={styles.cardDesc}>Ajusta qué tipo de novedades quieres ver y cómo quieres descubrir negocios.</Text>

          <SettingRow
            title="Notificaciones en la app"
            desc="Muestra alertas de promociones, cambios y novedades en tu panel."
            value={prefs.notifications_enabled}
            onValueChange={(value) => updatePref('notifications_enabled', value)}
          />

          <SettingRow
            title="Promociones destacadas"
            desc="Prioriza avisos sobre descuentos activos y nuevas promociones."
            value={prefs.promo_alerts}
            onValueChange={(value) => updatePref('promo_alerts', value)}
          />

          <SettingRow
            title="Locales cercanos"
            desc="Da prioridad a novedades de negocios de tu ciudad o ubicación."
            value={prefs.nearby_alerts}
            onValueChange={(value) => updatePref('nearby_alerts', value)}
          />

          {prefs.nearby_alerts && (
            <View style={styles.radiusBox}>
              <Text style={styles.radiusTitle}>Radio de cercanía</Text>
              <Text style={styles.radiusDesc}>Elige a cuántos kilómetros se considera “cerca” para mostrarte promociones.</Text>
              <View style={styles.radiusRow}>
                {RADIUS_OPTIONS.map((opt) => {
                  const active = Number(prefs.nearby_radius_km || 0.3) === opt.value;
                  return (
                    <TouchableOpacity
                      key={String(opt.value)}
                      style={[styles.radiusChip, active && styles.radiusChipActive]}
                      onPress={() => updatePref('nearby_radius_km', opt.value)}
                    >
                      <Text style={[styles.radiusChipText, active && styles.radiusChipTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <SettingRow
            title="Actualizaciones de producto"
            desc="Recibe avisos sobre cambios de DataShopy y funciones nuevas."
            value={prefs.marketing_updates}
            onValueChange={(value) => updatePref('marketing_updates', value)}
          />
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  cardDesc: { marginTop: 8, fontSize: 13, lineHeight: 20, color: colors.textSecondary, marginBottom: 8 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  settingTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 },
  settingDesc: { fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  radiusBox: { paddingTop: 12, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: colors.borderLight },
  radiusTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  radiusDesc: { marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  radiusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  radiusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    backgroundColor: '#F2F2F2',
    borderWidth: 1,
    borderColor: '#E6E6E6',
  },
  radiusChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primaryMid },
  radiusChipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  radiusChipTextActive: { color: colors.primary },
});
