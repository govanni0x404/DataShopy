import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';

export default function PromoCard({ promo }) {
  const expiresDate = promo.expires_at
    ? new Date(promo.expires_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
    : null;

  return (
    <View style={styles.card}>
      {promo.tag && <Text style={styles.tag}>{promo.tag}</Text>}
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
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  tag: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
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
    color: colors.textTertiary,
    marginTop: 6,
  },
});