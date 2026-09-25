import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { getNewsCount, subscribeNewsCount } from '../../supabase/newsBadge';
import { cityOfNearestStore, distanceKm } from '../../utils/geo';
import CategoryFilter from '../../components/CategoryFilter';
import StoreCard from '../../components/StoreCard';
import { colors, spacing, radius, categories } from '../../constants/theme';
import { rankStores } from '../../constants/search';
import {
  countActivePromos,
  getActivePromoTexts,
  getAllStores,
  getAppMeta,
  getClientPreferences,
  importCatalogStores,
  replaceActivePromoSnapshot,
  replaceStoreRatings,
  setAppMeta,
} from '../../database/db';
import { supabase } from '../../supabase/client';
import { activePromoFilter } from '../../supabase/promos';
import { syncFavorites } from '../../supabase/favorites';


export default function HomeScreen({ navigation, route }) {
  const user = route.params?.user;
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [query, setQuery] = useState('');
  const [stores, setStores] = useState([]);
  const [promoCounts, setPromoCounts] = useState({});
  const [promoTexts, setPromoTexts] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);
  const listRef = useRef(null);
  const [newsCount, setNewsCount] = useState(getNewsCount());
  useEffect(() => subscribeNewsCount(setNewsCount), []);
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

  const filteredStores = useMemo(() => rankStores(stores, query.trim(), promoTexts), [query, stores, promoTexts]);

  const loadStores = () => {
    const list = getAllStores(selectedCategoryLabel);
    const counts = {};
    for (const store of list) {
      const claimed = Number(store?.claimed || 0) === 1;
      counts[store.id] = claimed ? countActivePromos(store.id) : 0;
    }
    setPromoCounts(counts);
    setPromoTexts(getActivePromoTexts());

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

  // Location: asks permission, reads the position, resolves the city and keeps following the user.
  // Callable again (e.g. when Home regains focus after the user allowed location in Settings).
  const locationSubRef = useRef(null);
  const locationBusyRef = useRef(false);
  const startLocation = async () => {
    if (locationBusyRef.current) return;
    locationBusyRef.current = true;
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!mountedRef.current) return;
      if (perm.status !== 'granted') {
        setLocationStatus('denied');
        return;
      }
      setLocationStatus('granted');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!mountedRef.current) return;
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserCoords(coords);

      // The system geocoder can fail (no Google services, offline): that must not
      // cancel location. Fall back to the city of the nearest catalog store.
      let city = null;
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lng });
        const g = geo?.[0];
        city = g?.city || g?.subregion || g?.region || null;
      } catch (e) {
        console.warn('[Home] reverseGeocode failed, using nearest store city', e);
      }
      if (!city) city = cityOfNearestStore(getAllStores(null), coords);
      if (!mountedRef.current) return;
      setUserCity(city);

      if (!locationSubRef.current) {
        locationSubRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 35 },
          (nextPos) => {
            if (!mountedRef.current) return;
            setUserCoords({ lat: nextPos.coords.latitude, lng: nextPos.coords.longitude });
          }
        );
      }
    } catch (e) {
      console.warn('[Home] location failed', e);
      if (mountedRef.current) setLocationStatus('denied');
    } finally {
      locationBusyRef.current = false;
    }
  };

  useEffect(() => {
    startLocation();
    return () => {
      locationSubRef.current?.remove?.();
      locationSubRef.current = null;
    };
  }, []);

  // Coming back to Home without a position (permission was denied, or the user just
  // switched to "ubicación automática"): try again.
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!userCoords) startLocation();
    });
    return unsubscribe;
  }, [navigation, userCoords]);

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
          .eq('is_active', true)
          .or(activePromoFilter());
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
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Pulls the store catalog (and the active promotions of claimed stores) from
  // Supabase into the local SQLite cache. Throttled to once per 30 min per
  // city unless `force` (pull-to-refresh) is set.
  const syncCatalog = async ({ force = false } = {}) => {
    const city = effectiveCity;
    const syncKey = `sb_sync_city_v2:${city ? city.toLowerCase() : '__any__'}`;
    const last = getAppMeta(syncKey);
    const now = Date.now();
    if (!force && last) {
      const lastMs = Date.parse(last);
      if (!Number.isNaN(lastMs) && now - lastMs < 30 * 60 * 1000) return;
    }

    setGoogleNote('Sincronizando catálogo…');
    try {
      const STORE_COLUMNS =
        'id,name,category,description,address,phone,schedule_weekday,schedule_weekend,emoji,banner_color,city,country,lat,lng,source,claimed,claimed_at,logo_url,cover_image_url,gallery_urls,keywords';
      let q = supabase.from('stores').select(STORE_COLUMNS).limit(250);
      if (city) q = q.eq('city', city);
      let { data, error } = await q;
      if (error) throw error;
      if (city && Array.isArray(data) && data.length === 0) {
        const fallback = await supabase.from('stores').select(STORE_COLUMNS).limit(250);
        if (fallback.error) throw fallback.error;
        data = fallback.data;
      }
      const rows = Array.isArray(data) ? data : [];
      const mapped = rows.map((s) => ({
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
        keywords: s.keywords || null,
      }));
      const res = importCatalogStores({ stores: mapped, source: 'supabase' });

      const claimedIds = rows.filter((s) => s.claimed).map((s) => s.id);
      if (claimedIds.length) {
        const { data: promoRows, error: promoError } = await supabase
          .from('promotions')
          .select('id,store_id,title,description,tag,expires_at,is_active,created_at')
          .in('store_id', claimedIds)
          .eq('is_active', true)
          .or(activePromoFilter())
          .limit(1000);
        if (promoError) console.warn('[Home] syncing promotions failed', promoError);
        else replaceActivePromoSnapshot({ promos: promoRows || [], storeIds: claimedIds });
      }

      // Average rating per store (one row per store that has reviews).
      const { data: ratingRows, error: ratingError } = await supabase
        .from('store_rating_stats')
        .select('store_id,rating_avg,rating_count')
        .limit(1000);
      if (ratingError) console.warn('[Home] syncing ratings failed', ratingError);
      else replaceStoreRatings(ratingRows || []);

      // Favorites reference cached stores, so reconcile once the catalog is in.
      await syncFavorites(user?.id);

      setAppMeta(syncKey, new Date().toISOString());
      setAppMeta('sb_sync_last', new Date().toISOString());
      if (!mountedRef.current) return;
      setGoogleNote(res.inserted || res.updated ? `Catálogo: +${res.inserted} / ~${res.updated}` : '');
      loadStores();
    } catch (e) {
      console.warn('[Home] catalog sync failed', e);
      if (!mountedRef.current) return;
      setGoogleNote('Catálogo: error de sincronización');
    }
  };

  useEffect(() => {
    syncCatalog();
  }, [effectiveCity]);

  // Tapping the "Inicio" tab resets Home: clears the search and category and scrolls to the top
  // (the stack itself already pops back from a store's detail).
  useEffect(() => {
    const tabs = navigation.getParent?.();
    if (!tabs?.addListener) return undefined;
    return tabs.addListener('tabPress', () => {
      Keyboard.dismiss();
      setQuery('');
      setSelectedCategoryId('all');
      listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
    });
  }, [navigation]);

  // The catalog sync is throttled; favorites are cheap, so also reconcile them
  // every time the signed-in user changes/opens Home.
  useEffect(() => {
    syncFavorites(user?.id);
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await syncCatalog({ force: true });
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  };

  // "Notifications" is a tab: navigate through the tab navigator (the direct parent of
  // this stack). Going one level higher (the root stack) does not know that route.
  const goToNotifications = () => {
    const tabs = navigation.getParent?.();
    if (tabs?.navigate) {
      tabs.navigate('Notifications', { screen: 'NotificationsMain', params: { initialTab: 'news', user } });
      return;
    }
    navigation.navigate('Notifications');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>Descubrir</Text>
          <Text style={styles.headerTitle}>DataShopy</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon} onPress={goToNotifications}>
          <Ionicons name={newsCount > 0 ? 'notifications' : 'notifications-outline'} size={19} color={colors.primary} />
          {newsCount > 0 && <View style={styles.bellDot} />}
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={filteredStores}
        keyExtractor={(item) => String(item.id)}
        refreshing={refreshing}
        onRefresh={onRefresh}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            {!!nearbyPromo && (
              <View style={styles.nearbyWrap}>
                <View style={styles.nearbyCard}>
                  <View style={styles.nearbyIconWrap}>
                    <Ionicons name="flash" size={16} color={colors.white} />
                  </View>
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
            <View style={styles.searchBar}>
              <View style={styles.searchInput}>
                <View style={styles.searchIconWrap}>
                  <Ionicons name="search-outline" size={14} color={colors.primary} />
                </View>
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
              <View style={styles.countHeaderRow}>
                <View style={styles.countIconWrap}>
                  <Ionicons name="storefront" size={15} color={colors.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.countText}>
                    {filteredStores.length} {filteredStores.length === 1 ? 'local' : 'locales'}
                    {effectiveCity ? ` en ${effectiveCity}` : ' cerca de ti'}
                  </Text>
                  <Text style={styles.countSubtext}>Abre un local para ver promociones, llamada y mapa en un toque.</Text>
                </View>
              </View>
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
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name={query.trim() ? 'search' : 'storefront-outline'} size={26} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {query.trim()
                ? `No encontramos “${query.trim()}”`
                : selectedCategoryId !== 'all'
                  ? 'No hay locales en esta categoría'
                  : 'Aún no hay locales para mostrar'}
            </Text>
            <Text style={styles.emptyDesc}>
              {query.trim()
                ? 'Prueba con otra palabra, un producto (ej. “pan”, “casco”) o una categoría.'
                : 'Desliza hacia abajo para actualizar el catálogo.'}
            </Text>
            {!!query.trim() && (
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setQuery('')}>
                <Text style={styles.emptyBtnText}>Limpiar búsqueda</Text>
              </TouchableOpacity>
            )}
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
  emptyWrap: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyDesc: { marginTop: 6, fontSize: 13, lineHeight: 19, color: colors.textSecondary, textAlign: 'center' },
  emptyBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  emptyBtnText: { fontSize: 13, fontWeight: '600', color: colors.primary },
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
  bellDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  headerIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
  },
  nearbyWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  nearbyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.secondary,
    backgroundColor: colors.secondaryLight,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 8,
  },
  nearbyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  nearbyTitle: { fontSize: 13, fontWeight: '800', color: colors.brandInk },
  nearbyDesc: { marginTop: 4, fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  nearbyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.secondary,
    marginRight: 8,
  },
  nearbyBtnText: { fontSize: 12, fontWeight: '800', color: colors.white },
  nearbyClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
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
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  searchIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  countRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  countHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  countIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  countText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  countSubtext: { marginTop: 4, fontSize: 12, color: colors.textTertiary },
  helperText: { marginTop: 4, fontSize: 12, color: colors.textTertiary },
  list: { paddingBottom: spacing.xxl },
  gridRow: { paddingHorizontal: spacing.lg, gap: 12 },
  gridItem: { flex: 1, marginBottom: 12 },
});
