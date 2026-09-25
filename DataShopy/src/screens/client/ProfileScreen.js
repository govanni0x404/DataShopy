import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LoadingOverlay from '../../components/LoadingOverlay';
import { colors, radius, spacing, categories } from '../../constants/theme';

const helpTint = categories.find((c) => c.id === 'tech') || { color: colors.primary, bg: colors.primaryLight };
import { supabase } from '../../supabase/client';
import { goToAuth, isGuestUser } from '../../utils/guest';
import { confirmAndDeleteAccount } from '../../supabase/account';
import { isRemoteUser } from '../../supabase/favorites';

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
  const [signingOut, setSigningOut] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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

        {isGuestUser(user) && (
          <View style={styles.guestCard}>
            <Text style={styles.guestTitle}>Estás como invitado</Text>
            <Text style={styles.guestDesc}>
              Crea tu cuenta gratis para guardar favoritos, recibir avisos de sus promociones y dejar reseñas.
            </Text>
            <View style={styles.guestActions}>
              <TouchableOpacity style={styles.guestBtnGhost} onPress={() => goToAuth(navigation, 'Login')}>
                <Text style={styles.guestBtnGhostText}>Iniciar sesión</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.guestBtn} onPress={() => goToAuth(navigation, 'Register')}>
                <Text style={styles.guestBtnText}>Crear cuenta</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.sectionLabel}>Mi cuenta</Text>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => tabNav?.navigate('Notifications', { screen: 'NotificationsMain', params: { initialTab: 'fav', user } })}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.secondaryLight }]}>
            <Ionicons name="heart-outline" size={18} color={colors.secondary} />
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
          <View style={[styles.menuIcon, { backgroundColor: colors.successLight }]}>
            <Ionicons name="location-outline" size={18} color={colors.success} />
          </View>
          <Text style={styles.menuLabel}>Mi ciudad</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>App</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ClientSettings', { user })}>
          <View style={[styles.menuIcon, { backgroundColor: colors.warningLight }]}>
            <Ionicons name="settings-outline" size={18} color={colors.warning} />
          </View>
          <Text style={styles.menuLabel}>Configuración</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ClientHelp', { user })}>
          <View style={[styles.menuIcon, { backgroundColor: helpTint.bg }]}>
            <Ionicons name="help-circle-outline" size={18} color={helpTint.color} />
          </View>
          <Text style={styles.menuLabel}>Ayuda</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Legal', { doc: 'privacy' })}>
          <View style={[styles.menuIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.menuLabel}>Política de privacidad</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Legal', { doc: 'terms' })}>
          <View style={[styles.menuIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.menuLabel}>Términos y condiciones</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
        {isRemoteUser(user?.id) && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => confirmAndDeleteAccount({ navigation, loginRoute: 'Login', setBusy: setSigningOut })}
          >
            <View style={[styles.menuIcon, styles.logoutIcon]}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </View>
            <Text style={styles.logoutText}>Eliminar mi cuenta</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.menuItem, styles.logoutItem]}
          onPress={async () => {
            setSigningOut(true);
            try {
              await supabase.auth.signOut();
            } catch (e) {
              console.warn('[Profile] signOut failed', e);
            }
            const root = navigation.getParent?.()?.getParent?.() || navigation.getParent?.();
            if (root?.replace) root.replace('Login');
            else navigation.navigate('Login');
            setSigningOut(false);
          }}
        >
          <View style={[styles.menuIcon, styles.logoutIcon]}>
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          </View>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
      <LoadingOverlay visible={signingOut} label="Procesando..." />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  guestCard: {
    margin: spacing.lg,
    marginBottom: 0,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
  },
  guestTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  guestDesc: { marginTop: 4, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  guestActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  guestBtn: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radius.md, backgroundColor: colors.primary },
  guestBtnText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  guestBtnGhost: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  guestBtnGhostText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: colors.white },
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
