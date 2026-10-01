import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../constants/theme';
import { discountPercent, formatPrice } from '../supabase/products';

export default function ProductCard({ product, onPress }) {
  const discount = discountPercent(product.price, product.compare_at_price);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85} disabled={!onPress}>
      <View style={styles.imageWrap}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.image} resizeMode="cover" />
        ) : (
          <Ionicons name={product.is_pack ? 'gift-outline' : 'cube-outline'} size={32} color={colors.primary} />
        )}
        {product.is_pack && (
          <View style={[styles.badge, styles.packBadge]}>
            <Text style={styles.badgeText}>PACK</Text>
          </View>
        )}
        {discount != null && (
          <View style={[styles.badge, styles.discountBadge]}>
            <Text style={styles.badgeText}>-{discount}%</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
          {discount != null && <Text style={styles.oldPrice}>{formatPrice(product.compare_at_price)}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 150,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  imageWrap: {
    height: 110,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 8, borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  packBadge: { left: 8, backgroundColor: colors.primary },
  discountBadge: { right: 8, backgroundColor: colors.secondary },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.white, letterSpacing: 0.3 },
  info: { padding: 10 },
  name: { fontSize: 13, fontWeight: '500', color: colors.text, minHeight: 34 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  price: { fontSize: 15, fontWeight: '700', color: colors.primary },
  oldPrice: { fontSize: 11, color: colors.textTertiary, textDecorationLine: 'line-through' },
});
