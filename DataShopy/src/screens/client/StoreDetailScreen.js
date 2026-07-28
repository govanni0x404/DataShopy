import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PromoCard from '../../components/PromoCard';
import { colors, radius, spacing } from '../../constants/theme';
import { getPromosByStore, getStoreById, importCatalogPromos, importCatalogStores, isFavoriteStore, toggleFavoriteStore, trackEvent } from '../../database/db';
import { supabase } from '../../supabase/client';

export default function StoreDetailScreen({ navigation, route }) {
  const storeId = route.params?.storeId;
  const userId = route.params?.userId || null;
  const [store, setStore] = useState(null);
  const [promos, setPromos] = useState([]);
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    const s = getStoreById(storeId);
    setStore(s);
    setFavorite(isFavoriteStore(userId, storeId));
    const claimed = Number(s?.claimed || 0) === 1;
    setPromos(claimed ? getPromosByStore(storeId) : []);
  }, [storeId]);

  useEffect(() => {
    let mounted = true;
    const syncStoreCoords = async () => {
      if (!storeId) return;
      const s = getStoreById(storeId);
      if (!s) return;
      const ext = String(s?.external_id || '');
      if (!ext.startsWith('sb:store/')) return;
      const supaStoreId = Number(ext.replace('sb:store/', ''));
      if (!supaStoreId || Number.isNaN(supaStoreId)) return;
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('id,name,category,description,address,phone,schedule_weekday,schedule_weekend,emoji,banner_color,city,country,lat,lng,source,claimed,claimed_at')
          .eq('id', supaStoreId)
          .maybeSingle();
        if (error) throw error;
        if (!data?.id) return;
        importCatalogStores({
          stores: [
            {
              name: data.name,
              category: data.category,
              description: data.description,
              address: data.address,
              phone: data.phone,
              schedule_weekday: data.schedule_weekday,
              schedule_weekend: data.schedule_weekend,
              emoji: data.emoji,
              banner_color: data.banner_color,
              city: data.city,
              country: data.country,
              lat: data.lat,
              lng: data.lng,
              source: data.source || 'supabase',
              external_id: `sb:store/${data.id}`,
              claimed: data.claimed ? 1 : 0,
              claimed_at: data.claimed_at,
            },
          ],
          source: 'supabase',
        });
        if (!mounted) return;
        setStore(getStoreById(storeId));
      } catch {}
    };
    syncStoreCoords();
    return () => {
      mounted = false;
    };
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
    let lat = typeof store.lat === 'number' ? store.lat : store.lat ? Number(store.lat) : null;
    let lng = typeof store.lng === 'number' ? store.lng : store.lng ? Number(store.lng) : null;
    let hasCoords = lat != null && !Number.isNaN(lat) && lng != null && !Number.isNaN(lng);
    let destinationLabel =
      [store.address, store.city, store.country].filter(Boolean).join(', ') || (store.name ? String(store.name).trim() : '');
    const ext = String(store?.external_id || '');
    const isSb = ext.startsWith('sb:store/');
    const supaStoreId = isSb ? Number(ext.replace('sb:store/', '')) : null;
    if (!hasCoords && isSb && supaStoreId && !Number.isNaN(supaStoreId)) {
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('lat,lng,address,city,country,name')
          .eq('id', supaStoreId)
          .maybeSingle();
        if (error) throw error;
        const nextLat = typeof data?.lat === 'number' ? data.lat : data?.lat ? Number(data.lat) : null;
        const nextLng = typeof data?.lng === 'number' ? data.lng : data?.lng ? Number(data.lng) : null;
        const ok = nextLat != null && !Number.isNaN(nextLat) && nextLng != null && !Number.isNaN(nextLng);
        if (ok) {
          lat = nextLat;
          lng = nextLng;
          hasCoords = true;
        }
        destinationLabel =
          [data?.address, data?.city, data?.country].filter(Boolean).join(', ') || (data?.name ? String(data.name).trim() : destinationLabel);
      } catch {}
    }
    const destinationByCoords = hasCoords ? `${lat},${lng}` : '';
    const destinationByAddress = destinationLabel;
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

    const openGoogleMaps = async ({ destination, isCoords }) => {
      const webDestination = isCoords ? destination : encodeURIComponent(destination);
      const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${webDestination}&travelmode=driving`;
      const googleMapsAppUrl =
        Platform.OS === 'ios'
          ? `comgooglemaps://?daddr=${isCoords ? destination : encodeURIComponent(destination)}&directionsmode=driving`
          : isCoords
            ? `google.navigation:q=loc:${destination}&mode=d`
            : `google.navigation:q=${encodeURIComponent(destination)}&mode=d`;
      try {
        const can = await Linking.canOpenURL(googleMapsAppUrl);
        if (can) {
          await Linking.openURL(googleMapsAppUrl);
          return;
        }
      } catch {}
      Linking.openURL(fallbackUrl);
    };

    if (hasCoords && destinationByAddress) {
      Alert.alert('Abrir ruta', '¿Qué destino quieres usar?', [
        {
          text:
            typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng)
              ? `Ubicación exacta (${lat.toFixed(4)}, ${lng.toFixed(4)})`
              : 'Ubicación exacta',
          onPress: () => openGoogleMaps({ destination: destinationByCoords, isCoords: true }),
        },
        { text: 'Dirección escrita', onPress: () => openGoogleMaps({ destination: destinationByAddress, isCoords: false }) },
        { text: 'Cancelar', style: 'cancel' },
      ]);
      return;
    }

    if (hasCoords) {
      openGoogleMaps({ destination: destinationByCoords, isCoords: true });
      return;
    }

    if (destinationByAddress) {
      openGoogleMaps({ destination: destinationByAddress, isCoords: false });
      return;
    }

    Alert.alert('Destino no disponible', 'Este local no tiene dirección ni coordenadas guardadas.');
  };

  const coords = useMemo(() => {
    if (!store) return null;
    const lat = typeof store.lat === 'number' ? store.lat : store.lat ? Number(store.lat) : null;
    const lng = typeof store.lng === 'number' ? store.lng : store.lng ? Number(store.lng) : null;
    const ok = lat != null && !Number.isNaN(lat) && lng != null && !Number.isNaN(lng);
    return ok ? { lat, lng } : null;
  }, [store]);

  const mapImageUrl = useMemo(() => null, []);

  const isClaimed = useMemo(() => Number(store?.claimed || 0) === 1, [store?.claimed]);
  const galleryUrls = useMemo(() => {
    if (!store?.gallery_urls) return [];
    if (Array.isArray(store.gallery_urls)) return store.gallery_urls.filter(Boolean);
    try {
      const parsed = JSON.parse(store.gallery_urls);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }, [store?.gallery_urls]);

  const handleToggleFavorite = () => {
    const result = toggleFavoriteStore(userId, storeId);
    setFavorite(result.isFavorite);
  };

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
        <TouchableOpacity style={styles.backBtn} onPress={handleToggleFavorite}>
          <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={20} color={favorite ? colors.danger : colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: store.banner_color || colors.primaryLight }]}>
          {!!store.cover_image_url && <Image source={{ uri: store.cover_image_url }} style={styles.heroImage} resizeMode="cover" />}
          <View style={styles.heroTopBadge}>
            <Text style={styles.heroTopBadgeText}>{isClaimed ? 'Perfil activo' : 'Pendiente de reclamo'}</Text>
          </View>
          {!!store.logo_url ? (
            <Image source={{ uri: store.logo_url }} style={styles.heroLogo} resizeMode="cover" />
          ) : (
            <Text style={styles.heroEmoji}>{store.emoji || '🏪'}</Text>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{store.name}</Text>
          <View style={styles.metaRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{store.category}</Text>
            </View>
            {!!store.city && (
              <View style={styles.softBadge}>
                <Ionicons name="navigate-outline" size={13} color={colors.brandInk} />
                <Text style={styles.softBadgeText}>{store.city}</Text>
              </View>
            )}
          </View>
          {store.description ? <Text style={styles.desc}>{store.description}</Text> : null}

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={openDirections} activeOpacity={0.85}>
              <Ionicons name="map-outline" size={18} color={colors.white} />
              <Text style={styles.actionBtnPrimaryText}>Cómo llegar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary, !store.phone && styles.actionBtnDisabled]}
              onPress={openCall}
              activeOpacity={0.85}
              disabled={!store.phone}
            >
              <Ionicons name="call-outline" size={18} color={store.phone ? colors.brandInk : colors.textTertiary} />
              <Text style={[styles.actionBtnSecondaryText, !store.phone && styles.actionBtnSecondaryTextDisabled]}>
                Llamar
              </Text>
            </TouchableOpacity>
          </View>

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
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color={colors.primary} />
              <Text style={styles.infoText}>{store.phone}</Text>
            </View>
          )}

          {!!galleryUrls.length && (
            <>
              <Text style={styles.sectionTitle}>Galería</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
                {galleryUrls.map((url) => (
                  <Image key={url} source={{ uri: url }} style={styles.galleryImage} resizeMode="cover" />
                ))}
              </ScrollView>
            </>
          )}

          <TouchableOpacity style={styles.mapCard} onPress={openDirections} activeOpacity={0.85}>
            {mapImageUrl ? (
              <>
                <Image source={{ uri: mapImageUrl }} style={styles.mapImage} resizeMode="cover" />
                <View style={styles.mapOverlay}>
                  <Ionicons name="map-outline" size={18} color={colors.white} />
                  <Text style={styles.mapOverlayText}>Abrir en Google Maps</Text>
                </View>
              </>
            ) : (
              <>
                <Ionicons name="map-outline" size={34} color={colors.primary} />
                <Text style={styles.mapText}>Ver en Google Maps</Text>
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
  hero: { height: 180, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroTopBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(15,14,12,0.82)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  heroTopBadgeText: { color: colors.brandPaper, fontSize: 11, fontWeight: '600' },
  heroLogo: {
    width: 82,
    height: 82,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.72)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroEmoji: { fontSize: 64 },
  body: { padding: spacing.lg },
  name: { fontSize: 22, fontWeight: '500', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 12 },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: { color: colors.primary, fontSize: 12, fontWeight: '500' },
  softBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.brandPaper,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  softBadgeText: { color: colors.brandInk, fontSize: 12, fontWeight: '500' },
  desc: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 16 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  actionBtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnPrimary: { backgroundColor: colors.brandInk },
  actionBtnSecondary: {
    backgroundColor: colors.brandPaper,
    borderWidth: 0.5,
    borderColor: '#ECE6DA',
  },
  actionBtnDisabled: { backgroundColor: colors.bgSecondary, borderColor: colors.borderLight },
  actionBtnPrimaryText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  actionBtnSecondaryText: { color: colors.brandInk, fontSize: 13, fontWeight: '600' },
  actionBtnSecondaryTextDisabled: { color: colors.textTertiary },
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
  galleryRow: { gap: 10, paddingBottom: 6 },
  galleryImage: { width: 140, height: 96, borderRadius: radius.md },
  emptyPromos: { fontSize: 13, color: colors.textSecondary, paddingVertical: 12 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, color: colors.textSecondary },
});
