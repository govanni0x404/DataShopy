import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

export default function BrandMark({ size = 72, title = 'DataShopy', subtitle, dark = false, centered = true }) {
  const textColor = dark ? colors.brandPaper : colors.brandInk;
  const secondaryColor = dark ? 'rgba(245,242,236,0.78)' : colors.textSecondary;

  return (
    <View style={[styles.container, centered && styles.centered]}>
      <View
        style={[
          styles.logoWrap,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.28),
            backgroundColor: dark ? 'rgba(245,242,236,0.12)' : colors.brandPaper,
          },
        ]}
      >
        <Image
          source={require('../../assets/icon.png')}
          style={{ width: size * 0.78, height: size * 0.78, borderRadius: Math.round(size * 0.2) }}
          resizeMode="contain"
        />
      </View>
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      {!!subtitle && <Text style={[styles.subtitle, { color: secondaryColor }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  centered: {
    alignItems: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
