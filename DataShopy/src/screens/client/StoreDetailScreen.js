import React, { useEffect, useMemo, useState } from 'react';
import { Image, Linking, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PromoCard from '../../components/PromoCard';
import { colors, radius, spacing } from '../../constants/theme';
import { getPromosByStore, getStoreById, importCatalogPromos, trackEvent } from '../../database/db';
import { supabase } from '../../supabase/client';

export default function StoreDetailScreen({ navigation, route }) {
  const storeId = route.params?.storeId;
  const userId = route.params?.userId || null;
  const [store, setStore] = useState(null);
  const [promos, setPromos] = useState([]);

  useEffect(() => {
    if (!storeId) return;
    const s = getStoreById(storeId);
    setStore(s);
    const claimed = Number(s?.claimed || 0) === 1;
    setPromos(claimed ? getPromosByStore(storeId) : []);
  }, [storeId]);

  useEffect(() => {
    let mounted = true;
    const syncPromos = async () => {
      if (!storeId) return;
      const s = getStoreById(storeId);
      if (!s) return;
      const claimed = Number(s?.claimed || 0) === 1;
      const ext = String(s?.external_id || '');
      if (!claimed || !ext.startsWith('sb:store/')) return;
      const supaStoreId = Number(ext.replace('sb:store/', ''));
      if (!supaStoreId || Number.isNaN(supaStoreId)) return;
      try {
        const { data, error } = await supabase
          .from('promotions')
          .select('id,store_id,title,description,tag,expires_at,is_active,created_at')
          .eq('store_id', supaStoreId)
          .eq('is_active', true)
          .limit(50);
        if (error) throw error;
        importCatalogPromos({ promos: Array.isArray(data) ? data : [], source: 'supabase' });
        if (!mounted) return;
        setPromos(getPromosByStore(storeId));
      } catch {}
    };
    syncPromos();
    return () => {
      mounted = false;
    };
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    try {
      trackEvent('store_view', { storeId, userId });
    } catch {}
  }, [storeId, userId]);

  const scheduleText = useMemo(() => {
    if (!store) return '';
    const parts = [];
    if (store.schedule_weekday) parts.push(store.schedule_weekday);
    if (store.schedule_weekend) parts.push(store.schedule_weekend);
    return parts.join(' · ');
  }, [store]);

  const openCall = async () => {
    if (!store?.phone) return;
    try {
      trackEvent('call_click', { storeId, userId, metadata: { phone: store.phone } });
    } catch {}
    const url = `tel:${store.phone}`;
    Linking.openURL(url);
  };

  const openDirections = async () => {
    if (!store) return;
    const lat = typeof store.lat === 'number' ? store.lat : store.lat ? Number(store.lat) : null;
    const lng = typeof store.lng === 'number' ? store.lng : store.lng ? Number(store.lng) : null;
    const hasCoords = lat != null && !Number.isNaN(lat) && lng != null && !Number.isNaN(lng);
    const destination = hasCoords
      ? `${lat},${lng}`
      : [store.address, store.city, store.country].filter(Boolean).join(', ') || store.name || '';
    try {
      trackEvent('directions_click', {
        storeId,
        userId,
        metadata: {
          address: store.address || null,
          city: store.city || null,
          country: store.country || null,
          lat: hasCoords ? lat : null,
          lng: hasCoords ? lng : null,
        },
      });
    } catch {}
    const url = hasCoords
      ? `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lng)}#map=18/${encodeURIComponent(
          lat
        )}/${encodeURIComponent(lng)}`
      : `https://www.openstreetmap.org/search?query=${encodeURIComponent(destination)}`;
    Linking.openURL(url);
  };

  const coords = useMemo(() => {
    if (!store) return null;
    const lat = typeof store.lat === 'number' ? store.lat : store.lat ? Number(store.lat) : null;
    const lng = typeof store.lng === 'number' ? store.lng : store.lng ? Number(store.lng) : null;
    const ok = lat != null && !Number.isNaN(lat) && lng != null && !Number.isNaN(lng);
    return ok ? { lat, lng } : null;
  }, [store]);

  const mapImageUrl = useMemo(() => {
    if (!coords) return null;
    const { lat, lng } = coords;
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${encodeURIComponent(
      `${lat},${lng}`
    )}&zoom=16&size=600x300&markers=${encodeURIComponent(`${lat},${lng},red-pushpin`)}`;
  }, [coords]);

  const isClaimed = useMemo(() => Number(store?.claimed || 0) === 1, [store?.claimed]);

  if (!store) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Local</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {store.name}
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => {}}>
          <Ionicons name="heart-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: store.banner_color || colors.primaryLight }]}>
          <Text style={styles.heroEmoji}>{store.emoji || '🏪'}</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{store.name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{store.category}</Text>
          </View>
          {store.description ? <Text style={styles.desc}>{store.description}</Text> : null}

          {!!scheduleText && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={styles.infoText}>{scheduleText}</Text>
            </View>
          )}
          {!!store.address && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <Text style={styles.infoText}>{store.address}</Text>
            </View>
          )}
          {!!store.phone && (
            <TouchableOpacity style={styles.infoRow} onPress={openCall} activeOpacity={0.75}>
              <Ionicons name="call-outline" size={18} color={colors.primary} />
              <Text style={styles.infoText}>{store.phone}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.mapCard} onPress={openDirections} activeOpacity={0.85}>
            {mapImageUrl ? (
              <>
                <Image source={{ uri: mapImageUrl }} style={styles.mapImage} resizeMode="cover" />
                <View style={styles.mapOverlay}>
                  <Ionicons name="map-outline" size={18} color={colors.white} />
                  <Text style={styles.mapOverlayText}>Abrir en OpenStreetMap</Text>
                </View>
              </>
            ) : (
              <>
                <Ionicons name="map-outline" size={34} color={colors.primary} />
                <Text style={styles.mapText}>Ver en OpenStreetMap</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Promociones de hoy</Text>
          {!isClaimed ? (
            <Text style={styles.emptyPromos}>Este local aún no fue reclamado. Las promociones aparecerán cuando el dueño lo registre.</Text>
          ) : promos.length === 0 ? (
            <Text style={styles.emptyPromos}>Este local no tiene promociones activas por ahora.</Text>
          ) : (
            promos.map((p) => <PromoCard key={String(p.id)} promo={p} />)
          )}
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '500', color: colors.text, paddingHorizontal: 8 },
  scroll: { paddingBottom: spacing.xxl },
  hero: { height: 180, alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 64 },
  body: { padding: spacing.lg },
  name: { fontSize: 22, fontWeight: '500', color: colors.text },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6,
    marginBottom: 12,
  },
  categoryText: { color: colors.primary, fontSize: 12, fontWeight: '500' },
  desc: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 16 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  infoText: { flex: 1, fontSize: 13, color: colors.text },
  mapCard: {
    height: 140,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 6,
    gap: 8,
    overflow: 'hidden',
  },
  mapText: { fontSize: 13, color: colors.textSecondary },
  mapImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  mapOverlay: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  mapOverlayText: { fontSize: 12, color: colors.white, fontWeight: '500' },
  sectionTitle: { fontSize: 15, fontWeight: '500', color: colors.text, marginTop: 18, marginBottom: 10 },
  emptyPromos: { fontSize: 13, color: colors.textSecondary, paddingVertical: 12 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, color: colors.textSecondary },
});
