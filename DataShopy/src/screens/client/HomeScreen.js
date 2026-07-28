import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import CategoryFilter from '../../components/CategoryFilter';
import BrandMark from '../../components/BrandMark';
import StoreCard from '../../components/StoreCard';
import { colors, spacing, radius, categories } from '../../constants/theme';
import { countActivePromos, getAllStores, getAppMeta, getClientPreferences, importCatalogStores, setAppMeta } from '../../database/db';
import { supabase } from '../../supabase/client';

const toRad = (deg) => (deg * Math.PI) / 180;
const distanceKm = (a, b) => {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
};

export default function HomeScreen({ navigation, route }) {
  const user = route.params?.user;
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [query, setQuery] = useState('');
  const [stores, setStores] = useState([]);
  const [promoCounts, setPromoCounts] = useState({});
  const [locationStatus, setLocationStatus] = useState('idle'); // idle | granted | denied
  const [userCoords, setUserCoords] = useState(null); // {lat,lng}
  const [userCity, setUserCity] = useState(null);
  const [preferredCity, setPreferredCity] = useState('');
  const [cityFallback, setCityFallback] = useState(false);
  const [googleNote, setGoogleNote] = useState('');
  const [nearbyPromo, setNearbyPromo] = useState(null); // { storeId, storeName, promoCount, distanceKm }
  const [nearbyIgnore, setNearbyIgnore] = useState({ storeId: null, until: 0 });
  const effectiveCity = (preferredCity || userCity || '').trim();

  const selectedCategoryLabel = useMemo(() => {
    if (selectedCategoryId === 'all') return null;
    const found = categories.find((c) => c.id === selectedCategoryId);
    return found?.label || null;
  }, [selectedCategoryId]);

  const filteredStores = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter((s) => {
      const hay = `${s.name || ''} ${s.category || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, stores]);

  const loadStores = () => {
    const list = getAllStores(selectedCategoryLabel);
    const counts = {};
    for (const store of list) {
      const claimed = Number(store?.claimed || 0) === 1;
      counts[store.id] = claimed ? countActivePromos(store.id) : 0;
    }
    setPromoCounts(counts);

    const city = effectiveCity.toLowerCase();
    const withDistance = list.map((s) => {
      const lat = typeof s.lat === 'number' ? s.lat : s.lat ? Number(s.lat) : null;
      const lng = typeof s.lng === 'number' ? s.lng : s.lng ? Number(s.lng) : null;
      const d = userCoords && lat != null && lng != null ? distanceKm(userCoords, { lat, lng }) : null;
      return { ...s, _distanceKm: d };
    });

    let byCity = withDistance;
    if (city) {
      byCity = withDistance.filter((s) => String(s.city || '').trim().toLowerCase() === city);
    }

    let visible = byCity;
    let fallback = false;
    if (city && byCity.length === 0) {
      visible = withDistance;
      fallback = true;
    }

    visible.sort((a, b) => {
      const da = a._distanceKm;
      const db = b._distanceKm;
      const aHas = typeof da === 'number' && !Number.isNaN(da);
      const bHas = typeof db === 'number' && !Number.isNaN(db);
      if (aHas && bHas) return da - db;
      if (aHas) return -1;
      if (bHas) return 1;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    setCityFallback(fallback);
    setStores(visible);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const prefs = getClientPreferences(user?.id);
      setPreferredCity(prefs.preferred_city || '');
      loadStores();
    });
    return unsubscribe;
  }, [navigation, selectedCategoryLabel, user?.id, preferredCity, userCity, userCoords]);

  useEffect(() => {
    const prefs = getClientPreferences(user?.id);
    setPreferredCity(prefs.preferred_city || '');
    loadStores();
  }, [selectedCategoryLabel, userCity, userCoords, user?.id]);

  useEffect(() => {
    let mounted = true;
    let subscription = null;
    const loadLocation = async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!mounted) return;
        if (perm.status !== 'granted') {
          setLocationStatus('denied');
          return;
        }
        setLocationStatus('granted');
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!mounted) return;
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        const geo = await Location.reverseGeocodeAsync({
          latitude: coords.lat,
          longitude: coords.lng,
        });
        if (!mounted) return;
        const g = geo?.[0];
        const c = g?.city || g?.subregion || g?.region || null;
        setUserCity(c);

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 35,
          },
          (nextPos) => {
            if (!mounted) return;
            const next = { lat: nextPos.coords.latitude, lng: nextPos.coords.longitude };
            setUserCoords(next);
          }
        );
      } catch {
        if (mounted) setLocationStatus('denied');
      }
    };
    loadLocation();
    return () => {
      mounted = false;
      if (subscription?.remove) subscription.remove();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const prefs = getClientPreferences(user?.id);
      const radiusKm = typeof prefs.nearby_radius_km === 'number' ? prefs.nearby_radius_km : 0.3;
      if (!prefs.notifications_enabled || !prefs.nearby_alerts) {
        if (mounted) setNearbyPromo(null);
        return;
      }
      if (!userCoords) {
        if (mounted) setNearbyPromo(null);
        return;
      }
      const now = Date.now();
      if (nearbyIgnore?.until && now < nearbyIgnore.until) return;

      let candidate = null;
      for (const s of stores) {
        const claimed = Number(s?.claimed || 0) === 1;
        if (!claimed) continue;
        const d = s?._distanceKm;
        const ok = typeof d === 'number' && !Number.isNaN(d);
        if (!ok) continue;
        if (d > radiusKm) continue;
        if (!candidate || d < candidate._distanceKm) candidate = s;
      }

      if (!candidate?.id) {
        if (mounted) setNearbyPromo(null);
        return;
      }

      const alreadyShown = nearbyPromo?.storeId === candidate.id;
      if (alreadyShown) return;

      const localCount = Number(promoCounts?.[candidate.id] || 0);
      if (localCount > 0) {
        if (!mounted) return;
        setNearbyPromo({
          storeId: candidate.id,
          storeName: candidate.name || 'Un local',
          promoCount: localCount,
          distanceKm: candidate._distanceKm,
        });
        return;
      }

      const ext = String(candidate?.external_id || '');
      if (!ext.startsWith('sb:store/')) {
        if (mounted) setNearbyPromo(null);
        return;
      }
      const supaStoreId = Number(ext.replace('sb:store/', ''));
      if (!supaStoreId || Number.isNaN(supaStoreId)) {
        if (mounted) setNearbyPromo(null);
        return;
      }

      try {
        const { count, error } = await supabase
          .from('promotions')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', supaStoreId)
          .eq('is_active', true);
        if (error) throw error;
        const promoCount = count || 0;
        if (!mounted) return;
        if (promoCount <= 0) {
          setNearbyPromo(null);
          return;
        }
        setNearbyPromo({
          storeId: candidate.id,
          storeName: candidate.name || 'Un local',
          promoCount,
          distanceKm: candidate._distanceKm,
        });
      } catch {
        if (mounted) setNearbyPromo(null);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [stores, promoCounts, userCoords, user?.id, nearbyIgnore?.until]);

  useEffect(() => {
    let mounted = true;
    const syncCatalog = async () => {
      const city = effectiveCity;
      const syncKey = `sb_sync_city:${city ? city.toLowerCase() : '__any__'}`;
      const last = getAppMeta(syncKey);
      const now = Date.now();
      if (last) {
        const lastMs = Date.parse(last);
        if (!Number.isNaN(lastMs) && now - lastMs < 30 * 60 * 1000) return;
      }

      setGoogleNote('Sincronizando catálogo…');
      try {
        let q = supabase
          .from('stores')
          .select(
            'id,name,category,description,address,phone,schedule_weekday,schedule_weekend,emoji,banner_color,city,country,lat,lng,source,claimed,claimed_at,logo_url,cover_image_url,gallery_urls'
          )
          .limit(250);
        if (city) q = q.eq('city', city);
        let { data, error } = await q;
        if (error) throw error;
        if (city && Array.isArray(data) && data.length === 0) {
          const fallback = await supabase
            .from('stores')
            .select(
              'id,name,category,description,address,phone,schedule_weekday,schedule_weekend,emoji,banner_color,city,country,lat,lng,source,claimed,claimed_at,logo_url,cover_image_url,gallery_urls'
            )
            .limit(250);
          if (fallback.error) throw fallback.error;
          data = fallback.data;
        }
        const mapped = (Array.isArray(data) ? data : []).map((s) => ({
          name: s.name,
          category: s.category,
          description: s.description,
          address: s.address,
          phone: s.phone,
          schedule_weekday: s.schedule_weekday,
          schedule_weekend: s.schedule_weekend,
          emoji: s.emoji,
          banner_color: s.banner_color,
          city: s.city,
          country: s.country,
          lat: s.lat,
          lng: s.lng,
          source: s.source || 'supabase',
          external_id: `sb:store/${s.id}`,
          claimed: s.claimed ? 1 : 0,
          claimed_at: s.claimed_at,
          logo_url: s.logo_url || null,
          cover_image_url: s.cover_image_url || null,
          gallery_urls: s.gallery_urls || [],
        }));
        const res = importCatalogStores({ stores: mapped, source: 'supabase' });
        setAppMeta(syncKey, new Date().toISOString());
        setAppMeta('sb_sync_last', new Date().toISOString());
        if (!mounted) return;
        setGoogleNote(res.inserted || res.updated ? `Catálogo: +${res.inserted} / ~${res.updated}` : '');
        loadStores();
      } catch {
        if (!mounted) return;
        setGoogleNote('Catálogo: error de sincronización');
      }
    };
    syncCatalog();
    return () => {
      mounted = false;
    };
  }, [effectiveCity]);

  const goToNotifications = () => {
    const maybeTabNav = navigation.getParent?.()?.getParent?.() || navigation.getParent?.();
    if (maybeTabNav?.navigate) {
      maybeTabNav.navigate('Notifications');
      return;
    }
    navigation.navigate('Notifications');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>Descubrir</Text>
          <Text style={styles.headerTitle}>DataShopy</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon} onPress={goToNotifications}>
          <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredStores}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            {!!nearbyPromo && (
              <View style={styles.nearbyWrap}>
                <View style={styles.nearbyCard}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.nearbyTitle}>Promos cerca de ti</Text>
                    <Text style={styles.nearbyDesc}>
                      {nearbyPromo.promoCount} {nearbyPromo.promoCount === 1 ? 'promo' : 'promos'} en {nearbyPromo.storeName}
                      {typeof nearbyPromo.distanceKm === 'number' && !Number.isNaN(nearbyPromo.distanceKm)
                        ? ` · a ${Math.round(nearbyPromo.distanceKm * 1000)} m`
                        : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.nearbyBtn}
                    onPress={() => navigation.navigate('StoreDetail', { storeId: nearbyPromo.storeId, userId: user?.id || null })}
                  >
                    <Text style={styles.nearbyBtnText}>Ver</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.nearbyClose}
                    onPress={() => {
                      const until = Date.now() + 10 * 60 * 1000;
                      setNearbyIgnore({ storeId: nearbyPromo.storeId, until });
                      setNearbyPromo(null);
                    }}
                  >
                    <Ionicons name="close" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <View style={styles.heroWrap}>
              <View style={styles.heroCard}>
                <BrandMark
                  size={56}
                  title={`Hola${user?.name ? `, ${String(user.name).split(' ')[0]}` : ''}`}
                  subtitle={effectiveCity ? `Explora negocios y promociones en ${effectiveCity}.` : 'Explora negocios, promociones y rutas cercanas.'}
                />
                <View style={styles.heroStats}>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatValue}>{stores.length}</Text>
                    <Text style={styles.heroStatLabel}>Locales</Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatValue}>
                      {Object.values(promoCounts).reduce((acc, value) => acc + Number(value || 0), 0)}
                    </Text>
                    <Text style={styles.heroStatLabel}>Promos</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.searchBar}>
              <View style={styles.searchInput}>
                <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
                <TextInput
                  style={styles.searchText}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Buscar locales, categorías..."
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            <CategoryFilter selected={selectedCategoryId} onSelect={setSelectedCategoryId} />

            <View style={styles.countRow}>
              <Text style={styles.countText}>
                {filteredStores.length} {filteredStores.length === 1 ? 'local' : 'locales'}
                {effectiveCity ? ` en ${effectiveCity}` : ' cerca de ti'}
              </Text>
              <Text style={styles.countSubtext}>Abre un local para ver promociones, llamada y mapa en un toque.</Text>
              {!!googleNote && (
                <Text style={styles.helperText}>{googleNote}</Text>
              )}
              {cityFallback && (
                <Text style={styles.helperText}>
                  No hay locales en {effectiveCity}. Mostrando todos.
                </Text>
              )}
              {locationStatus === 'denied' && (
                <Text style={styles.helperText}>
                  Activa la ubicación para ver los locales más cercanos.
                </Text>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.gridItem}>
            <StoreCard
              store={item}
              promoCount={promoCounts[item.id] || 0}
              onPress={() => navigation.navigate('StoreDetail', { storeId: item.id, userId: user?.id || null })}
            />
          </View>
        )}
      />
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
  headerEyebrow: { fontSize: 11, color: colors.textTertiary, marginBottom: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.brandInk },
  headerIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  nearbyWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  nearbyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryMid,
    backgroundColor: colors.primarySoft,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 8,
  },
  nearbyTitle: { fontSize: 13, fontWeight: '800', color: colors.brandInk },
  nearbyDesc: { marginTop: 4, fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  nearbyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    marginRight: 8,
  },
  nearbyBtnText: { fontSize: 12, fontWeight: '800', color: colors.white },
  nearbyClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  heroWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  heroCard: {
    borderRadius: 24,
    backgroundColor: colors.brandPaper,
    padding: spacing.lg,
    borderWidth: 0.5,
    borderColor: '#ECE6DA',
  },
  heroStats: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatDivider: { width: 1, height: 28, backgroundColor: colors.borderLight },
  heroStatValue: { fontSize: 20, fontWeight: '700', color: colors.brandInk },
  heroStatLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  searchBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  countRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  countText: { fontSize: 13, color: colors.textSecondary },
  countSubtext: { marginTop: 4, fontSize: 12, color: colors.textTertiary },
  helperText: { marginTop: 4, fontSize: 12, color: colors.textTertiary },
  list: { paddingBottom: spacing.xxl },
  gridRow: { paddingHorizontal: spacing.lg, gap: 12 },
  gridItem: { flex: 1, marginBottom: 12 },
});
