import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import {
  countActivePromos,
  getClientPreferences,
  getFavoriteStores,
  getStoreByExternalId,
  importCatalogStores,
} from '../../database/db';
import { supabase } from '../../supabase/client';

const relativeTime = (iso) => {
  if (!iso) return 'Hace un momento';
  const diffMs = Math.max(0, Date.now() - Date.parse(iso));
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Hace un momento';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Ayer' : `Hace ${days} días`;
};

export default function NotificationsScreen({ navigation, route }) {
  const user = route.params?.user;
  const [tab, setTab] = useState(route.params?.initialTab || 'news'); // news | fav
  const [news, setNews] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [prefs, setPrefs] = useState(() => getClientPreferences(user?.id));

  const items = useMemo(() => (tab === 'fav' ? favorites : news), [tab, favorites, news]);

  const loadFavorites = () => {
    const favStores = getFavoriteStores(user?.id).map((store) => ({
      id: `fav:${store.id}`,
      storeId: store.id,
      title: store.name,
      desc: store.address || store.category || 'Local guardado',
      time: store.city || 'Favorito',
      unread: false,
      emoji: store.emoji || '🏪',
      promoCount: countActivePromos(store.id),
    }));
    setFavorites(favStores);
  };

  const loadNews = async () => {
    const nextPrefs = getClientPreferences(user?.id);
    setPrefs(nextPrefs);
    if (!nextPrefs.notifications_enabled || !nextPrefs.promo_alerts) {
      setNews([]);
      return;
    }

    try {
      const { data: promos, error } = await supabase
        .from('promotions')
        .select('id,title,description,tag,expires_at,created_at,store_id')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(24);
      if (error) throw error;

      const storeIds = [...new Set((promos || []).map((promo) => promo.store_id).filter(Boolean))];
      let storeMap = new Map();
      if (storeIds.length) {
        const { data: storesData, error: storeErr } = await supabase
          .from('stores')
          .select('id,name,address,city,country,emoji,banner_color,category,description,phone,schedule_weekday,schedule_weekend,lat,lng,source,claimed,claimed_at')
          .in('id', storeIds);
        if (storeErr) throw storeErr;
        const localMapped = (storesData || []).map((store) => ({
          ...store,
          external_id: `sb:store/${store.id}`,
          claimed: store.claimed ? 1 : 0,
        }));
        importCatalogStores({ stores: localMapped, source: 'supabase' });
        storeMap = new Map((storesData || []).map((store) => [store.id, store]));
      }

      const preferredCity = (nextPrefs.preferred_city || '').trim().toLowerCase();
      const nextNews = (promos || [])
        .map((promo) => {
          const store = storeMap.get(promo.store_id);
          if (!store) return null;
          if (nextPrefs.nearby_alerts && preferredCity && String(store.city || '').trim().toLowerCase() !== preferredCity) {
            return null;
          }
          const localStore = getStoreByExternalId(`sb:store/${store.id}`);
          return {
            id: `promo:${promo.id}`,
            storeId: localStore?.id || null,
            title: promo.title,
            desc: `${store.name}${promo.description ? ` · ${promo.description}` : ''}`,
            time: relativeTime(promo.created_at),
            unread: true,
            emoji: store.emoji || '🏪',
            meta: promo.tag || (promo.expires_at ? `Vence: ${promo.expires_at}` : store.city || ''),
          };
        })
        .filter(Boolean);
      setNews(nextNews);
    } catch {
      setNews([]);
    }
  };

  useEffect(() => {
    if (route.params?.initialTab) setTab(route.params.initialTab);
  }, [route.params?.initialTab]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadFavorites();
      loadNews();
    });
    return unsubscribe;
  }, [navigation, user?.id]);

  useEffect(() => {
    loadFavorites();
    loadNews();
  }, [user?.id]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alertas</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'news' && styles.tabActive]} onPress={() => setTab('news')}>
          <Text style={[styles.tabText, tab === 'news' && styles.tabTextActive]}>Novedades</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'fav' && styles.tabActive]} onPress={() => setTab('fav')}>
          <Text style={[styles.tabText, tab === 'fav' && styles.tabTextActive]}>Mis favoritos</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons
              name={tab === 'fav' ? 'heart-outline' : prefs.notifications_enabled ? 'notifications-off-outline' : 'notifications-outline'}
              size={34}
              color={colors.textTertiary}
            />
            <Text style={styles.emptyTitle}>{tab === 'fav' ? 'Sin favoritos' : 'Sin notificaciones'}</Text>
            <Text style={styles.emptyDesc}>
              {tab === 'fav'
                ? 'Cuando guardes locales como favoritos, aparecerán aquí.'
                : prefs.notifications_enabled
                  ? 'Vuelve más tarde para ver novedades de tus locales.'
                  : 'Activa las notificaciones desde Configuración para recibir novedades aquí.'}
            </Text>
          </View>
        ) : (
          items.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={styles.item}
              activeOpacity={0.85}
              onPress={() => {
                if (n.storeId) navigation.navigate('StoreDetail', { storeId: n.storeId, userId: user?.id || null });
              }}
            >
              <View style={[styles.dot, !n.unread && styles.dotRead]} />
              <View style={styles.badgeIcon}>
                <Text style={styles.badgeEmoji}>{n.emoji || '🏪'}</Text>
              </View>
              <View style={styles.body}>
                <Text style={styles.title}>{n.title}</Text>
                <Text style={styles.desc}>{n.desc}</Text>
                <Text style={styles.time}>{n.meta ? `${n.time} · ${n.meta}` : n.time}</Text>
                {typeof n.promoCount === 'number' && (
                  <Text style={styles.favoriteMeta}>
                    {n.promoCount > 0 ? `${n.promoCount} promos activas` : 'Sin promociones activas'}
                  </Text>
                )}
              </View>
              {n.storeId ? <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} /> : null}
            </TouchableOpacity>
          ))
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
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: { fontSize: 17, fontWeight: '500', color: colors.text },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 13, color: colors.textSecondary },
  tabTextActive: { color: colors.primary, fontWeight: '500' },
  list: { paddingBottom: spacing.xxl },
  item: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  dot: { width: 10, height: 10, borderRadius: radius.full, backgroundColor: colors.primary, marginTop: 4 },
  dotRead: { backgroundColor: colors.border },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  badgeEmoji: { fontSize: 20 },
  body: { flex: 1 },
  title: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 2 },
  desc: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  time: { fontSize: 11, color: colors.textTertiary, marginTop: 3 },
  favoriteMeta: { fontSize: 11, color: colors.primary, marginTop: 4, fontWeight: '500' },
  empty: { paddingHorizontal: spacing.lg, paddingTop: 60, alignItems: 'center' },
  emptyTitle: { fontSize: 14, color: colors.textTertiary, marginTop: 10, marginBottom: 6 },
  emptyDesc: { fontSize: 12, color: colors.textTertiary, textAlign: 'center', lineHeight: 18, maxWidth: 260 },
});
