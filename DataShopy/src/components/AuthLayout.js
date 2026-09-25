import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../constants/theme';
import AppVersion from './AppVersion';

const HERO = '#7C4DEB';

const PILLS = {
  client: ['🏷️ Promos', '📍 Cerca de ti', '⭐ Reseñas'],
  owner: ['📣 Publica promos', '📊 Estadísticas', '💬 Responde reseñas'],
};

// Shared shell for the auth screens: purple hero with the logo and the value of the app,
// and a form card that overlaps it.
export default function AuthLayout({ variant = 'client', title, subtitle, onBack, children, footer }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 16 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.hero, { paddingTop: insets.top + 18 }]}>
            <View style={[styles.circle, styles.circleA]} />
            <View style={[styles.circle, styles.circleB]} />
            <View style={[styles.circle, styles.circleC]} />

            {!!onBack && (
              <TouchableOpacity style={[styles.back, { top: insets.top + 10 }]} onPress={onBack} accessibilityLabel="Volver">
                <Ionicons name="arrow-back" size={20} color={colors.white} />
              </TouchableOpacity>
            )}

            <View style={styles.logoTile}>
              <Image source={require('../../assets/icon.png')} style={styles.logo} />
            </View>
            {variant === 'owner' && (
              <View style={styles.ownerTag}>
                <Text style={styles.ownerTagText}>PANEL DE DUEÑOS</Text>
              </View>
            )}
            <Text style={styles.brand}>DataShopy</Text>
            <Text style={styles.tagline}>
              {variant === 'owner' ? 'Haz crecer tu negocio con tu barrio' : 'Locales y promociones cerca de ti'}
            </Text>
            <View style={styles.pills}>
              {PILLS[variant].map((p) => (
                <View key={p} style={styles.pill}>
                  <Text style={styles.pillText}>{p}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            {!!title && <Text style={styles.cardTitle}>{title}</Text>}
            {!!subtitle && <Text style={styles.cardSub}>{subtitle}</Text>}
            {children}
          </View>

          {footer}
          <AppVersion />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Text field with a leading icon, focus highlight and optional show/hide for passwords.
export function AuthInput({ icon, label, password = false, showPassword, onTogglePassword, ...inputProps }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
        {!!icon && <Ionicons name={icon} size={18} color={focused ? colors.primary : colors.textTertiary} />}
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textTertiary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={password && !showPassword}
          {...inputProps}
        />
        {password && (
          <TouchableOpacity onPress={onTogglePassword} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Mostrar u ocultar contraseña">
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={showPassword ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export function AuthButton({ label, onPress, disabled, variant = 'primary', icon }) {
  const primary = variant === 'primary';
  return (
    <TouchableOpacity
      style={[styles.btn, primary ? styles.btnPrimary : styles.btnSecondary, disabled && { opacity: 0.7 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      {!!icon && <Ionicons name={icon} size={18} color={primary ? colors.white : colors.secondary} />}
      <Text style={primary ? styles.btnPrimaryText : styles.btnSecondaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function AuthDivider({ text = 'o' }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.line} />
      <Text style={styles.dividerText}>{text}</Text>
      <View style={styles.line} />
    </View>
  );
}

export function AuthLinks({ children }) {
  return <View style={styles.links}>{children}</View>;
}

export function AuthLink({ prefix, action, onPress, disabled, alt = false }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={styles.linkBtn}>
      <Text style={styles.linkText}>
        {prefix} <Text style={alt ? styles.linkAccentAlt : styles.linkAccent}>{action}</Text>
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1 },
  hero: {
    backgroundColor: HERO,
    alignItems: 'center',
    paddingBottom: 64,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  circle: { position: 'absolute', borderRadius: 999 },
  circleA: { width: 220, height: 220, top: -70, right: -60, backgroundColor: 'rgba(255,255,255,0.10)' },
  circleB: { width: 150, height: 150, bottom: -50, left: -40, backgroundColor: 'rgba(255,138,76,0.28)' },
  circleC: { width: 70, height: 70, top: 90, left: 28, backgroundColor: 'rgba(255,255,255,0.08)' },
  back: {
    position: 'absolute',
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  logoTile: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: colors.white,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  logo: { width: '100%', height: '100%', borderRadius: 22 },
  ownerTag: { marginTop: 14, backgroundColor: '#FF8A4C', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  ownerTagText: { color: colors.white, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  brand: { marginTop: 12, fontSize: 30, fontWeight: '800', color: colors.white, letterSpacing: 0.3 },
  tagline: { marginTop: 4, fontSize: 14, color: 'rgba(255,255,255,0.88)', textAlign: 'center' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 },
  pill: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  pillText: { fontSize: 12, fontWeight: '600', color: colors.white },

  card: {
    marginHorizontal: 20,
    marginTop: -40,
    padding: 20,
    borderRadius: 26,
    backgroundColor: colors.bg,
    shadowColor: HERO,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 6,
  },
  cardTitle: { fontSize: 21, fontWeight: '800', color: colors.text },
  cardSub: { fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginTop: 4 },

  field: { marginTop: 16 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.bgSecondary,
  },
  inputWrapFocused: { borderColor: colors.primary, backgroundColor: colors.white },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: colors.text },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    marginTop: 22,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  btnPrimaryText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  btnSecondary: { borderWidth: 1.5, borderColor: colors.secondary, backgroundColor: colors.secondaryLight },
  btnSecondaryText: { color: colors.secondary, fontSize: 15, fontWeight: '700' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 },
  line: { flex: 1, height: 0.5, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.textTertiary },

  links: { marginTop: 14, gap: 2 },
  linkBtn: { paddingVertical: 8 },
  linkText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  linkAccent: { color: colors.primary, fontWeight: '700' },
  linkAccentAlt: { color: colors.secondary, fontWeight: '700' },
});
