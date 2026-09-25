import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import PromoCard from '../../components/PromoCard';
import ReviewsSection from '../../components/ReviewsSection';
import { Stars } from '../../components/StarRating';
import { colors, radius, spacing, categories } from '../../constants/theme';
import { promptGuestSignIn } from '../../utils/guest';
import { distanceKm, formatDistance, travelEstimate } from '../../utils/geo';
import { buildStoreShareUrl } from '../../utils/deepLinks';
import { getOpenStatus } from '../../utils/openingHours';
import { expiryLabel, pickFeaturedPromo } from '../../utils/promoHighlight';
import { isRemoteUser } from '../../supabase/favorites';
import { getPromosByStore, getStoreById, importCatalogStores, isFavoriteStore, replaceActivePromoSnapshot, toggleFavoriteStore, trackEvent } from '../../database/db';
import { supabase } from '../../supabase/client';
import { activePromoFilter } from '../../supabase/promos';
import { pushFavoriteChange } from '../../supabase/favorites';

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
      } catch (e) {
        console.warn('[StoreDetail] syncStoreCoords failed', e);
      }
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
          .or(activePromoFilter())
          .limit(50);
        if (error) throw error;
        replaceActivePromoSnapshot({ promos: Array.isArray(data) ? data : [], storeIds: [supaStoreId] });
        if (!mounted) return;
        setPromos(getPromosByStore(storeId));
      } catch (e) {
        console.warn('[StoreDetail] syncPromos failed', e);
      }
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
    } catch (e) {
      console.warn('[StoreDetail] trackEvent store_view failed', e);
    }
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
    } catch (e) {
      console.warn('[StoreDetail] trackEvent call_click failed', e);
    }
    const url = `tel:${store.phone}`;
    Linking.openURL(url);
  };

  // Directions use the written address only (no exact coordinates): "address, city, country",
  // falling back to the store name. Opened from the "Cómo llegar" button.
  const openDirections = async () => {
    if (!store) return;
    const destination =
      [store.address, store.city, store.country].filter(Boolean).join(', ') || (store.name ? String(store.name).trim() : '');
    if (!destination) {
      Alert.alert('Destino no disponible', 'Este local no tiene una dirección guardada.');
      return;
    }
    try {
      trackEvent('directions_click', {
        storeId,
        userId,
        metadata: { address: store.address || null, city: store.city || null, country: store.country || null },
      });
    } catch (e) {
      console.warn('[StoreDetail] trackEvent directions_click failed', e);
    }

    const encoded = encodeURIComponent(destination);
    const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving`;
    const googleMapsAppUrl =
      Platform.OS === 'ios'
        ? `comgooglemaps://?daddr=${encoded}&directionsmode=driving`
        : `google.navigation:q=${encoded}&mode=d`;
    try {
      if (await Linking.canOpenURL(googleMapsAppUrl)) {
        await Linking.openURL(googleMapsAppUrl);
        return;
      }
    } catch (e) {
      console.warn('[StoreDetail] opening Maps app failed, falling back to web', e);
    }
    Linking.openURL(fallbackUrl);
  };

  const mapImageUrl = useMemo(() => null, []);

  // Open/closed badge, re-evaluated every minute.
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const openStatus = useMemo(() => getOpenStatus(store, clock), [store?.schedule_weekday, store?.schedule_weekend, clock]);

  // Distance/time estimate from the last known position (never asks for permission here).
  const [myCoords, setMyCoords] = useState(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== 'granted') return;
        const last = await Location.getLastKnownPositionAsync();
        if (mounted && last?.coords) setMyCoords({ lat: last.coords.latitude, lng: last.coords.longitude });
      } catch (e) {
        console.warn('[StoreDetail] last known position failed', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  const distance = useMemo(() => {
    const lat = Number(store?.lat);
    const lng = Number(store?.lng);
    if (!myCoords || store?.lat == null || store?.lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const km = distanceKm(myCoords, { lat, lng });
    return km == null ? null : { km, ...travelEstimate(km) };
  }, [myCoords, store?.lat, store?.lng]);

  const featuredPromo = useMemo(() => (Number(store?.claimed || 0) === 1 ? pickFeaturedPromo(promos, clock) : null), [promos, store?.claimed, clock]);

  const handleShare = async () => {
    const place = [store.address, store.city].filter(Boolean).join(', ');
    const lines = [
      `${store.emoji || '🏪'} ${store.name}${store.category ? ` · ${store.category}` : ''}`,
      place ? `📍 ${place}` : null,
      featuredPromo ? `🎁 ${featuredPromo.title}${expiryLabel(featuredPromo.expires_at, clock) ? ` (${expiryLabel(featuredPromo.expires_at, clock).toLowerCase()})` : ''}` : null,
      'Descúbrelo en DataShopy',
      buildStoreShareUrl(String(store.external_id || '').startsWith('sb:store/') ? store.external_id.replace('sb:store/', '') : null),
    ].filter(Boolean);
    try {
      await Share.share({ message: lines.join('\n') });
    } catch (e) {
      console.warn('[StoreDetail] share failed', e);
    }
  };

  const isClaimed = useMemo(() => Number(store?.claimed || 0) === 1, [store?.claimed]);
  const categoryStyle = useMemo(() => {
    const label = String(store?.category || '').trim().toLowerCase();
    const found = categories.find((c) => c.id !== 'all' && String(c.label).toLowerCase() === label);
    return found || { color: colors.primary, bg: colors.primaryLight };
  }, [store?.category]);
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

  // Reviews update the cached rating; re-read the row so the header reflects it.
  const refreshStoreFromCache = () => setStore(getStoreById(storeId));

  const handleToggleFavorite = () => {
    if (!isRemoteUser(userId)) {
      promptGuestSignIn(
        navigation,
        'Crea una cuenta gratis para guardar favoritos, recibir avisos de sus promociones y no perderlos si cambias de teléfono.'
      );
      return;
    }
    const result = toggleFavoriteStore(userId, storeId);
    setFavorite(result.isFavorite);
    pushFavoriteChange(userId, storeId, result.isFavorite);
  };

  if (!store) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
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
    <SafeAreaView style={styles.safe} edges={['top']}>
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
        <View style={[styles.hero, { backgroundColor: store.banner_color || categoryStyle.bg }]}>
          {!!store.cover_image_url && <Image source={{ uri: store.cover_image_url }} style={styles.heroImage} resizeMode="cover" />}
          <View style={[styles.heroTopBadge, { backgroundColor: isClaimed ? colors.success : colors.warning }]}>
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
            <View style={[styles.categoryBadge, { backgroundColor: categoryStyle.bg }]}>
              <Text style={[styles.categoryText, { color: categoryStyle.color }]}>{store.category}</Text>
            </View>
            {!!openStatus && (
              <View style={[styles.statusBadge, styles[`status_${openStatus.state}`]]}>
                <View style={[styles.statusDot, styles[`statusDot_${openStatus.state}`]]} />
                <Text style={[styles.statusText, styles[`statusText_${openStatus.state}`]]}>{openStatus.label}</Text>
              </View>
            )}
            {!!store.city && (
              <View style={styles.softBadge}>
                <Ionicons name="navigate-outline" size={13} color={colors.brandInk} />
                <Text style={styles.softBadgeText}>{store.city}</Text>
              </View>
            )}
          </View>
          {Number(store.rating_count) > 0 && (
            <View style={styles.ratingRow}>
              <Stars value={Number(store.rating_avg)} size={15} />
              <Text style={styles.ratingText}>
                {Number(store.rating_avg).toFixed(1)} · {store.rating_count} {Number(store.rating_count) === 1 ? 'reseña' : 'reseñas'}
              </Text>
            </View>
          )}
          {!!featuredPromo && (
            <View style={styles.featuredPromo}>
              <View style={styles.featuredIcon}>
                <Ionicons name="pricetag" size={18} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featuredTitle} numberOfLines={2}>
                  {featuredPromo.title}
                </Text>
                {!!expiryLabel(featuredPromo.expires_at, clock) && (
                  <Text style={styles.featuredExpiry}>{expiryLabel(featuredPromo.expires_at, clock)}</Text>
                )}
              </View>
            </View>
          )}
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
              <Ionicons name="call-outline" size={18} color={store.phone ? colors.secondary : colors.textTertiary} />
              <Text style={[styles.actionBtnSecondaryText, !store.phone && styles.actionBtnSecondaryTextDisabled]}>
                Llamar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85} accessibilityLabel="Compartir local">
              <Ionicons name="share-social-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {!!scheduleText && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color={categoryStyle.color} />
              <Text style={styles.infoText}>{scheduleText}</Text>
            </View>
          )}
          {!!store.address && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={categoryStyle.color} />
              <Text style={styles.infoText}>{store.address}</Text>
            </View>
          )}
          {!!distance && (
            <View style={styles.infoRow}>
              <Ionicons name={distance.mode === 'walk' ? 'walk-outline' : 'car-outline'} size={18} color={categoryStyle.color} />
              <Text style={styles.infoText}>
                {formatDistance(distance.km).replace(/^a /, 'A ')} · {distance.minutes} min {distance.mode === 'walk' ? 'a pie' : 'en auto'}
              </Text>
            </View>
          )}
          {!!store.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color={categoryStyle.color} />
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

          {/* Tarjeta "Ver en Google Maps" desactivada: el mapa se abre solo desde el botón "Cómo llegar".
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
          */}

          <Text style={styles.sectionTitle}>Promociones de hoy</Text>
          {!isClaimed ? (
            <Text style={styles.emptyPromos}>Este local aún no fue reclamado. Las promociones aparecerán cuando el dueño lo registre.</Text>
          ) : promos.length === 0 ? (
            <Text style={styles.emptyPromos}>Este local no tiene promociones activas por ahora.</Text>
          ) : (
            promos.map((p) => <PromoCard key={String(p.id)} promo={p} />)
          )}

          <ReviewsSection storeId={storeId} userId={userId} onStatsChange={refreshStoreFromCache} />
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  heroTopBadgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
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
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  ratingText: { fontSize: 12, color: colors.textSecondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 12 },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
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
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  status_open: { backgroundColor: colors.successLight },
  status_closing: { backgroundColor: colors.warningLight },
  status_closed: { backgroundColor: colors.dangerLight },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusDot_open: { backgroundColor: colors.success },
  statusDot_closing: { backgroundColor: colors.warning },
  statusDot_closed: { backgroundColor: colors.danger },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusText_open: { color: colors.success },
  statusText_closing: { color: colors.warning },
  statusText_closed: { color: colors.danger },
  featuredPromo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.secondaryLight,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  featuredIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  featuredTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  featuredExpiry: { marginTop: 2, fontSize: 12, fontWeight: '600', color: colors.secondary },
  shareBtn: {
    width: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },
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
  actionBtnPrimary: { backgroundColor: colors.primary },
  actionBtnSecondary: {
    backgroundColor: colors.secondaryLight,
    borderWidth: 0.5,
    borderColor: colors.secondaryLight,
  },
  actionBtnDisabled: { backgroundColor: colors.bgSecondary, borderColor: colors.borderLight },
  actionBtnPrimaryText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  actionBtnSecondaryText: { color: colors.secondary, fontSize: 13, fontWeight: '700' },
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
