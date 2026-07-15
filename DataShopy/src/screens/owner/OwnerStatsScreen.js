import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import { supabase } from '../../supabase/client';

function MetricCard({ label, value, hint }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricHint}>{hint}</Text>
    </View>
  );
}

export default function OwnerStatsScreen({ navigation, route }) {
  const owner = route.params?.owner;
  const [store, setStore] = useState(null);
  const [summary, setSummary] = useState({
    viewsToday: 0,
    callsToday: 0,
    directionsToday: 0,
    viewsTotal: 0,
    callsTotal: 0,
    directionsTotal: 0,
    activePromos: 0,
  });

  const load = async () => {
    if (!owner?.id) return;
    try {
      const { data: s, error: storeError } = await supabase.from('stores').select('*').eq('owner_id', owner.id).limit(1).maybeSingle();
      if (storeError) throw storeError;
      setStore(s || null);
      if (!s?.id) {
        setSummary({
          viewsToday: 0,
          callsToday: 0,
          directionsToday: 0,
          viewsTotal: 0,
          callsTotal: 0,
          directionsTotal: 0,
          activePromos: 0,
        });
        return;
      }

      const now = new Date();
      const startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
      const startIso = startUtc.toISOString();

      const queryCount = async (eventName, since = null) => {
        let q = supabase
          .from('tracking_events')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', s.id)
          .eq('event_name', eventName);
        if (since) q = q.gte('created_at', since);
        const { count } = await q;
        return count || 0;
      };

      const [
        viewsToday,
        callsToday,
        directionsToday,
        viewsTotal,
        callsTotal,
        directionsTotal,
        activePromos,
      ] = await Promise.all([
        queryCount('store_view', startIso),
        queryCount('call_click', startIso),
        queryCount('directions_click', startIso),
        queryCount('store_view'),
        queryCount('call_click'),
        queryCount('directions_click'),
        supabase
          .from('promotions')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', s.id)
          .eq('is_active', true)
          .then((result) => result.count || 0),
      ]);

      setSummary({
        viewsToday,
        callsToday,
        directionsToday,
        viewsTotal,
        callsTotal,
        directionsTotal,
        activePromos,
      });
    } catch {
      setStore(null);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, owner?.id]);

  useEffect(() => {
    load();
  }, [owner?.id]);

  const conversionText = useMemo(() => {
    const actions = summary.callsToday + summary.directionsToday;
    if (!summary.viewsToday) return 'Sin suficientes vistas hoy';
    return `${Math.round((actions / summary.viewsToday) * 100)}% de interacción hoy`;
  }, [summary]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Estadísticas</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Actividad del negocio</Text>
          <Text style={styles.heroTitle}>{store?.name || 'Tu tienda'}</Text>
          <Text style={styles.heroDesc}>
            {store?.id
              ? 'Mide cómo descubren tu local, cuántos llaman y cuántas personas piden la ruta.'
              : 'Crea o reclama tu local para empezar a ver estadísticas reales.'}
          </Text>
        </View>

        {!store?.id ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Todavía no hay estadísticas</Text>
            <Text style={styles.emptyDesc}>Necesitas una tienda activa para registrar visitas, llamadas y rutas.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('EditStore', { owner })}>
              <Text style={styles.primaryBtnText}>Crear mi tienda</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.grid}>
              <MetricCard label="Visitas hoy" value={summary.viewsToday} hint="clientes vieron tu ficha" />
              <MetricCard label="Llamadas hoy" value={summary.callsToday} hint="clicks en teléfono" />
              <MetricCard label="Rutas hoy" value={summary.directionsToday} hint="clicks en cómo llegar" />
              <MetricCard label="Interacción" value={conversionText} hint="llamadas + rutas / vistas" />
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Acumulado</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Vistas totales</Text>
                <Text style={styles.summaryValue}>{summary.viewsTotal}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Llamadas totales</Text>
                <Text style={styles.summaryValue}>{summary.callsTotal}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Rutas totales</Text>
                <Text style={styles.summaryValue}>{summary.directionsTotal}</Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Siguiente recomendación</Text>
              <Text style={styles.recommendation}>
                {summary.activePromos > 0
                  ? 'Tus promociones ya están activas. Ajusta título y vencimiento para probar qué convierte mejor.'
                  : 'Publica al menos una promoción activa para convertir más visitas en acciones.'}
              </Text>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('ManagePromos', { owner, storeId: store.id })}>
                <Text style={styles.secondaryBtnText}>Ir a promociones</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
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
  body: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: 16 },
  hero: {
    borderRadius: radius.xl,
    backgroundColor: colors.brandInk,
    padding: spacing.xl,
  },
  heroEyebrow: { color: 'rgba(255,255,255,0.68)', fontSize: 12, marginBottom: 6 },
  heroTitle: { color: colors.white, fontSize: 24, fontWeight: '700' },
  heroDesc: { color: 'rgba(255,255,255,0.78)', fontSize: 13, lineHeight: 20, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: {
    width: '48%',
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  metricLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 6 },
  metricValue: { fontSize: 22, fontWeight: '700', color: colors.text },
  metricHint: { marginTop: 4, fontSize: 11, lineHeight: 16, color: colors.textTertiary },
  sectionCard: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
    padding: spacing.lg,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  recommendation: { fontSize: 13, lineHeight: 20, color: colors.textSecondary },
  primaryBtn: {
    marginTop: 18,
    backgroundColor: colors.brandInk,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryBtnText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  secondaryBtn: {
    marginTop: 14,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  emptyBox: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyDesc: { marginTop: 8, fontSize: 13, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },
});
