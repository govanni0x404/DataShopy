import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';

export default function StoreCard({ store, promoCount, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.banner, { backgroundColor: store.banner_color || '#EEEDFE' }]}>
        <Text style={styles.emoji}>{store.emoji || '🏪'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{store.name}</Text>
        <Text style={styles.category} numberOfLines={1}>{store.category}</Text>
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