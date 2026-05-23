import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import CategoryFilter from '../../components/CategoryFilter';
import StoreCard from '../../components/StoreCard';
import { colors, spacing, categories } from '../../constants/theme';
import { countActivePromos, getAllStores, getAppMeta, importCatalogStores, setAppMeta } from '../../database/db';
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
  const [cityFallback, setCityFallback] = useState(false);
  const [googleNote, setGoogleNote] = useState('');

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

    const city = (userCity || '').trim().toLowerCase();
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
    const unsubscribe = navigation.addListener('focus', loadStores);
    return unsubscribe;
  }, [navigation, selectedCategoryLabel]);

  useEffect(() => {
    loadStores();
  }, [selectedCategoryLabel, userCity, userCoords]);

  useEffect(() => {
    let mounted = true;
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
      } catch {
        if (mounted) setLocationStatus('denied');
      }
    };
    loadLocation();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const syncCatalog = async () => {
      const city = (userCity || '').trim();
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
            'id,name,category,description,address,phone,schedule_weekday,schedule_weekend,emoji,banner_color,city,country,lat,lng,source,claimed,claimed_at'
          )
          .limit(250);
        if (city) q = q.eq('city', city);
        let { data, error } = await q;
        if (error) throw error;
        if (city && Array.isArray(data) && data.length === 0) {
          const fallback = await supabase
            .from('stores')
            .select(
              'id,name,category,description,address,phone,schedule_weekday,schedule_weekend,emoji,banner_color,city,country,lat,lng,source,claimed,claimed_at'
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
  }, [userCity]);

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
        <Text style={styles.headerTitle}>DataShopy</Text>
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
                {userCity ? ` en ${userCity}` : ' cerca de ti'}
              </Text>
              {!!googleNote && (
                <Text style={styles.helperText}>{googleNote}</Text>
              )}
              {cityFallback && (
                <Text style={styles.helperText}>
                  No hay locales en {userCity}. Mostrando todos.
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
  headerTitle: { fontSize: 17, fontWeight: '500', color: colors.text },
  headerIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
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
  helperText: { marginTop: 4, fontSize: 12, color: colors.textTertiary },
  list: { paddingBottom: spacing.xxl },
  gridRow: { paddingHorizontal: spacing.lg, gap: 12 },
  gridItem: { flex: 1, marginBottom: 12 },
});
