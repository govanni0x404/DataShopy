import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Image } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';

export default function StoreCard({ store, promoCount, onPress }) {
  const isClaimed = Number(store?.claimed || 0) === 1;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.banner, { backgroundColor: store.banner_color || '#EEEDFE' }]}>
        {!!store.cover_image_url && <Image source={{ uri: store.cover_image_url }} style={styles.bannerImage} resizeMode="cover" />}
        <View style={styles.bannerBadge}>
          <Text style={styles.bannerBadgeText}>{isClaimed ? 'Activo' : 'Nuevo'}</Text>
        </View>
        {!!store.logo_url ? <Image source={{ uri: store.logo_url }} style={styles.logoImage} resizeMode="cover" /> : <Text style={styles.emoji}>{store.emoji || '🏪'}</Text>}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{store.name}</Text>
        <Text style={styles.category} numberOfLines={1}>{store.category}</Text>
        {!!store.city && <Text style={styles.city} numberOfLines={1}>{store.city}</Text>}
        {promoCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {promoCount === 1 ? '1 promo hoy' : `${promoCount} promos hoy`}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  banner: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  bannerImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  bannerBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15,14,12,0.75)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bannerBadgeText: { fontSize: 10, color: colors.white, fontWeight: '600' },
  logoImage: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.75)',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  emoji: { fontSize: 32 },
  info: { padding: spacing.md },
  name: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  category: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  city: {
    marginTop: 4,
    fontSize: 11,
    color: colors.textSecondary,
  },
  badge: {
    marginTop: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '500',
  },
});
