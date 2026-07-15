import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import { supabase } from '../../supabase/client';

function initialsFromName(name) {
  const n = (name || '').trim();
  if (!n) return 'U';
  const parts = n.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
  return `${first}${last}`.toUpperCase() || 'U';
}

export default function ProfileScreen({ navigation, user }) {
  const displayName = user?.name || 'Invitado';
  const displayEmail = user?.email || '';
  const initials = useMemo(() => initialsFromName(displayName), [displayName]);
  const tabNav = navigation.getParent?.();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi perfil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName}
              </Text>
              {!!displayEmail && (
                <Text style={styles.email} numberOfLines={1}>
                  {displayEmail}
                </Text>
              )}
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Mi cuenta</Text>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => tabNav?.navigate('Notifications', { screen: 'NotificationsMain', params: { initialTab: 'fav', user } })}
        >
          <View style={styles.menuIcon}>
            <Ionicons name="heart-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.menuLabel}>Locales favoritos</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => tabNav?.navigate('Notifications', { screen: 'NotificationsMain', params: { initialTab: 'news', user } })}
        >
          <View style={styles.menuIcon}>
            <Ionicons name="notifications-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.menuLabel}>Notificaciones</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ClientCity', { user })}>
          <View style={styles.menuIcon}>
            <Ionicons name="location-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.menuLabel}>Mi ciudad</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>App</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ClientSettings', { user })}>
          <View style={styles.menuIcon}>
            <Ionicons name="settings-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.menuLabel}>Configuración</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ClientHelp', { user })}>
          <View style={styles.menuIcon}>
            <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.menuLabel}>Ayuda</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.logoutItem]}
          onPress={async () => {
            try {
              await supabase.auth.signOut();
            } catch {}
            const root = navigation.getParent?.()?.getParent?.() || navigation.getParent?.();
            if (root?.replace) root.replace('Login');
            else navigation.navigate('Login');
          }}
        >
          <View style={[styles.menuIcon, styles.logoutIcon]}>
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          </View>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    height: 56,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: { fontSize: 17, fontWeight: '500', color: colors.text },
  list: { paddingBottom: spacing.xxl },
  profileSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  profileHeader: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '500', color: colors.primary },
  name: { fontSize: 17, fontWeight: '500', color: colors.text },
  email: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  sectionLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
    paddingBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  menuIcon: {
    width: 36,
    height: 36,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 14, color: colors.text },
  logoutItem: { marginTop: 6, borderBottomWidth: 0 },
  logoutIcon: { backgroundColor: colors.dangerLight },
  logoutText: { flex: 1, fontSize: 14, color: colors.danger, fontWeight: '500' },
});
