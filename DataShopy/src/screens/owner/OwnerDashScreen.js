import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LoadingOverlay from '../../components/LoadingOverlay';
import { colors, radius, spacing } from '../../constants/theme';
import { supabase } from '../../supabase/client';
import { confirmAndDeleteAccount } from '../../supabase/account';
import { isRemoteUser } from '../../supabase/favorites';
import { activePromoFilter } from '../../supabase/promos';

export default function OwnerDashScreen({ navigation, route }) {
  const owner = route.params?.owner;
  const [store, setStore] = useState(null);
  const [signingOut, setSigningOut] = useState(false);
  const [activePromos, setActivePromos] = useState(0);
  const [visitsToday, setVisitsToday] = useState(0);
  const [callClicksToday, setCallClicksToday] = useState(0);
  const [directionsToday, setDirectionsToday] = useState(0);

  const load = async () => {
    if (!owner?.id) return;
    try {
      const { data: s, error } = await supabase.from('stores').select('*').eq('owner_id', owner.id).limit(1).maybeSingle();
      if (error) throw error;
      setStore(s || null);
      if (s?.id) {
        const { count, error: promoErr } = await supabase
          .from('promotions')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', s.id)
          .eq('is_active', true)
          .or(activePromoFilter());
        if (promoErr) throw promoErr;
        setActivePromos(count || 0);
        const now = new Date();
        const startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
        const startIso = startUtc.toISOString();
        const visits = await supabase
          .from('tracking_events')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', s.id)
          .eq('event_name', 'store_view')
          .gte('created_at', startIso);
        if (!visits.error) setVisitsToday(visits.count || 0);
        else setVisitsToday(0);
        const calls = await supabase
          .from('tracking_events')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', s.id)
          .eq('event_name', 'call_click')
          .gte('created_at', startIso);
        if (!calls.error) setCallClicksToday(calls.count || 0);
        else setCallClicksToday(0);
        const directions = await supabase
          .from('tracking_events')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', s.id)
          .eq('event_name', 'directions_click')
          .gte('created_at', startIso);
        if (!directions.error) setDirectionsToday(directions.count || 0);
        else setDirectionsToday(0);
      } else {
        setActivePromos(0);
        setVisitsToday(0);
        setCallClicksToday(0);
        setDirectionsToday(0);
      }
    } catch {
      setStore(null);
      setActivePromos(0);
      setVisitsToday(0);
      setCallClicksToday(0);
      setDirectionsToday(0);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, owner?.id]);

  useEffect(() => {
    load();
  }, [owner?.id]);

  const storeName = useMemo(() => store?.name || 'Tu tienda', [store?.name]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Bienvenido de vuelta,</Text>
          <Text style={styles.storeName} numberOfLines={1}>
            {storeName}
          </Text>
          <Text style={styles.sub}>Panel de administración</Text>
        </View>

        <View style={styles.stats}>
          <View style={[styles.statCard, styles.statCardViolet]}>
            <View style={[styles.statIconBadge, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="eye-outline" size={16} color={colors.primary} />
            </View>
            <Text style={styles.statLabel}>Visitas hoy</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{visitsToday}</Text>
            <Text style={styles.statSub}>vistas del local</Text>
          </View>
          <View style={[styles.statCard, styles.statCardCoral]}>
            <View style={[styles.statIconBadge, { backgroundColor: colors.secondaryLight }]}>
              <Ionicons name="navigate-outline" size={16} color={colors.secondary} />
            </View>
            <Text style={styles.statLabel}>Cómo llegar</Text>
            <Text style={[styles.statValue, { color: colors.secondary }]}>{directionsToday}</Text>
            <Text style={styles.statSub}>clicks hoy</Text>
          </View>
          <View style={[styles.statCard, styles.statCardGreen]}>
            <View style={[styles.statIconBadge, { backgroundColor: colors.successLight }]}>
              <Ionicons name="pricetag-outline" size={16} color={colors.success} />
            </View>
            <Text style={styles.statLabel}>Promos activas</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>{activePromos}</Text>
            <Text style={styles.statSub}>activas</Text>
          </View>
          <View style={[styles.statCard, styles.statCardAmber]}>
            <View style={[styles.statIconBadge, { backgroundColor: colors.warningLight }]}>
              <Ionicons name="call-outline" size={16} color={colors.warning} />
            </View>
            <Text style={styles.statLabel}>Clicks tel.</Text>
            <Text style={[styles.statValue, { color: colors.warning }]}>{callClicksToday}</Text>
            <Text style={styles.statSub}>hoy</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Gestión</Text>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('ManagePromos', { owner, storeId: store?.id })}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.secondaryLight }]}>
            <Ionicons name="pricetags-outline" size={18} color={colors.secondary} />
          </View>
          <Text style={styles.menuLabel}>Mis promociones</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('EditStore', { owner })}>
          <View style={[styles.menuIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="storefront-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.menuLabel}>Info de mi tienda</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        {!store?.id && (
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ClaimStore', { owner })}>
            <View style={[styles.menuIcon, { backgroundColor: colors.successLight }]}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
            </View>
            <Text style={styles.menuLabel}>Reclamar negocio</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('OwnerBranding', { owner })}>
          <View style={[styles.menuIcon, { backgroundColor: colors.warningLight }]}>
            <Ionicons name="images-outline" size={18} color={colors.warning} />
          </View>
          <Text style={styles.menuLabel}>Galería y logo</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('OwnerStats', { owner })}>
          <View style={[styles.menuIcon, { backgroundColor: colors.brandMint }]}>
            <Ionicons name="bar-chart-outline" size={18} color={colors.brandAccent} />
          </View>
          <Text style={styles.menuLabel}>Estadísticas</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Legal', { doc: 'privacy' })}>
          <View style={[styles.menuIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.menuLabel}>Privacidad y términos</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Legal', { doc: 'terms' })}>
          <View style={[styles.menuIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.menuLabel}>Términos y condiciones</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
        {isRemoteUser(owner?.id) && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => confirmAndDeleteAccount({ navigation, loginRoute: 'OwnerLogin', setBusy: setSigningOut })}
          >
            <View style={[styles.menuIcon, styles.logoutIcon]}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </View>
            <Text style={styles.logoutText}>Eliminar mi cuenta</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.menuItem, styles.logoutItem]}
          onPress={async () => {
            setSigningOut(true);
            try {
              await supabase.auth.signOut();
            } catch (e) {
              console.warn('[OwnerDash] signOut failed', e);
            }
            const root = navigation.getParent?.()?.getParent?.() || navigation.getParent?.();
            if (root?.replace) root.replace('OwnerLogin');
            else navigation.navigate('OwnerLogin');
            setSigningOut(false);
          }}
        >
          <View style={[styles.menuIcon, styles.logoutIcon]}>
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          </View>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
      <LoadingOverlay visible={signingOut} label="Procesando..." />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: spacing.xxl },
  header: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.lg },
  greeting: { fontSize: 13, color: colors.white, opacity: 0.8, marginBottom: 4 },
  storeName: { fontSize: 20, fontWeight: '500', color: colors.white },
  sub: { fontSize: 12, color: colors.white, opacity: 0.7, marginTop: 4 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: spacing.lg },
  statCard: {
    width: '48%',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
    borderTopWidth: 3,
  },
  statCardViolet: { borderTopColor: colors.primary },
  statCardCoral: { borderTopColor: colors.secondary },
  statCardGreen: { borderTopColor: colors.success },
  statCardAmber: { borderTopColor: colors.warning },
  statIconBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.text },
  statSub: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
  sectionLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    paddingHorizontal: spacing.lg,
    paddingBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  menuIcon: {
    width: 36,
    height: 36,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 14, color: colors.text },
  logoutItem: { marginTop: 8, borderBottomWidth: 0 },
  logoutIcon: { backgroundColor: colors.dangerLight },
  logoutText: { flex: 1, fontSize: 14, color: colors.danger, fontWeight: '500' },
});
