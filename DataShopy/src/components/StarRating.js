import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

const iconFor = (value, position) => {
  if (value >= position) return 'star';
  if (value >= position - 0.5) return 'star-half';
  return 'star-outline';
};

// Read-only row of 5 stars (supports halves for averages like 4.5).
export function Stars({ value = 0, size = 14 }) {
  const safe = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <View style={styles.row} accessibilityLabel={`${safe.toFixed(1)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((position) => (
        <Ionicons key={position} name={iconFor(safe, position)} size={size} color={colors.warning} />
      ))}
    </View>
  );
}

// Compact "★ 4.5 (12)" for store cards. Renders nothing without reviews.
export function RatingBadge({ avg, count }) {
  const total = Number(count) || 0;
  if (total <= 0) return null;
  return (
    <View style={styles.badge}>
      <Ionicons name="star" size={11} color={colors.warning} />
      <Text style={styles.badgeText}>
        {Number(avg).toFixed(1)} <Text style={styles.badgeCount}>({total})</Text>
      </Text>
    </View>
  );
}

// Tappable 1-5 star selector for the review form.
export function StarInput({ value = 0, onChange, size = 34 }) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((position) => (
        <TouchableOpacity
          key={position}
          onPress={() => onChange?.(position)}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel={`${position} ${position === 1 ? 'estrella' : 'estrellas'}`}
        >
          <Ionicons name={value >= position ? 'star' : 'star-outline'} size={size} color={colors.warning} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.text },
  badgeCount: { fontWeight: '400', color: colors.textTertiary },
});
