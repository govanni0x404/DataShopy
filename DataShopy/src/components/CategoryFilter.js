import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';
import { categories } from '../constants/theme';

export default function CategoryFilter({ selected, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {categories.map((cat) => {
        const isActive = selected === cat.id;
        return (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.chip,
              { backgroundColor: cat.bg, borderColor: cat.bg },
              isActive && { backgroundColor: cat.color, borderColor: cat.color },
            ]}
            onPress={() => onSelect(cat.id)}
            activeOpacity={0.8}
          >
            {cat.emoji && <Text style={styles.emoji}>{cat.emoji} </Text>}
            <Text
              style={[
                styles.label,
                { color: cat.color },
                isActive && styles.labelActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  emoji: { fontSize: 13 },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.white,
    fontWeight: '700',
  },
});