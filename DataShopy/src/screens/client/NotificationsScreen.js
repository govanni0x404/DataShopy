import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';

const demoNews = [
  {
    id: 'n1',
    title: 'La Pizzería tiene nueva promo',
    desc: '2x1 en pizza familiar solo por hoy. ¡No te la pierdas!',
    time: 'Hace 15 minutos',
    unread: true,
  },
  {
    id: 'n2',
    title: 'TechStore: iPhone reacondicionado',
    desc: 'Stock nuevo disponible con 20% de descuento.',
    time: 'Hace 1 hora',
    unread: true,
  },
  {
    id: 'n3',
    title: 'Café Central abre mañana',
    desc: 'Nuevo local en tu zona. Tienen café de especialidad.',
    time: 'Ayer',
    unread: false,
  },
];

export default function NotificationsScreen() {
  const [tab, setTab] = useState('news'); // news | fav

  const items = useMemo(() => {
    if (tab === 'fav') return [];
    return demoNews;
  }, [tab]);

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
            <Text style={styles.emptyTitle}>{tab === 'fav' ? 'Sin favoritos' : 'Sin notificaciones'}</Text>
            <Text style={styles.emptyDesc}>
              {tab === 'fav'
                ? 'Cuando guardes locales como favoritos, aparecerán aquí.'
                : 'Vuelve más tarde para ver novedades de tus locales.'}
            </Text>
          </View>
        ) : (
          items.map((n) => (
            <View key={n.id} style={styles.item}>
              <View style={[styles.dot, !n.unread && styles.dotRead]} />
              <View style={styles.body}>
                <Text style={styles.title}>{n.title}</Text>
                <Text style={styles.desc}>{n.desc}</Text>
                <Text style={styles.time}>{n.time}</Text>
              </View>
            </View>
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
  body: { flex: 1 },
  title: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 2 },
  desc: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  time: { fontSize: 11, color: colors.textTertiary, marginTop: 3 },
  empty: { paddingHorizontal: spacing.lg, paddingTop: 60, alignItems: 'center' },
  emptyTitle: { fontSize: 14, color: colors.textTertiary, marginBottom: 6 },
  emptyDesc: { fontSize: 12, color: colors.textTertiary, textAlign: 'center', lineHeight: 18, maxWidth: 260 },
});
