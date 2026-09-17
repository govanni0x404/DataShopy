import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';

export default function PromoCard({ promo }) {
  const expiresDate = promo.expires_at
    ? new Date(promo.expires_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
    : null;

  return (
    <View style={styles.card}>
      {promo.tag && (
        <View style={styles.tagPill}>
          <Text style={styles.tag}>{promo.tag}</Text>
        </View>
      )}
      <Text style={styles.title}>{promo.title}</Text>
      {promo.description && <Text style={styles.desc}>{promo.description}</Text>}
      {expiresDate && (
        <Text style={styles.expires}>Vence el {expiresDate}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.secondaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  tagPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.secondary,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  tag: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 3,
  },
  desc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  expires: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '600',
    marginTop: 6,
  },
});