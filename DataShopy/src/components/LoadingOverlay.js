import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';

export default function LoadingOverlay({ visible, label = 'Procesando...' }) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.spinnerRing}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <Text style={styles.label}>{label}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    minWidth: 150,
    borderTopWidth: 3,
    borderTopColor: colors.primary,
  },
  spinnerRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  label: { fontSize: 13, color: colors.textSecondary, marginTop: 14, textAlign: 'center' },
});
