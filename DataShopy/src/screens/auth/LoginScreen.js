import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView,
  Platform, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import { supabase } from '../../supabase/client';
import { getProfile, upsertProfile } from '../../supabase/profile';
import BrandMark from '../../components/BrandMark';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
 
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Campos vacíos', 'Ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      const u = data?.user;
      if (!u?.id) throw new Error('No se pudo iniciar sesión.');
      let profile = null;
      try {
        profile = await getProfile(u.id);
      } catch {}
      if (!profile) {
        try {
          profile = await upsertProfile({
            id: u.id,
            role: 'customer',
            name: u.user_metadata?.name || null,
          });
        } catch {}
      }
      const nextUser = {
        id: u.id,
        name: profile?.name || u.user_metadata?.name || 'Usuario',
        email: u.email || '',
      };
      navigation.replace('ClientApp', { user: nextUser });
    } catch (e) {
      Alert.alert('Error', e?.message || 'Correo o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    navigation.replace('ClientApp', { user: { name: 'Invitado', email: '' } });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.heroCard}>
            <BrandMark
              size={82}
              dark
              title="DataShopy"
              subtitle="Descubre, compara y encuentra negocios cercanos con promociones reales."
            />
            <View style={styles.heroTags}>
              <View style={styles.heroTag}>
                <Ionicons name="location-outline" size={14} color={colors.brandAccent} />
                <Text style={styles.heroTagText}>Locales cercanos</Text>
              </View>
              <View style={styles.heroTag}>
                <Ionicons name="pricetags-outline" size={14} color={colors.brandAccent} />
                <Text style={styles.heroTagText}>Promos activas</Text>
              </View>
            </View>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>Ingresa a tu cuenta</Text>
            <Text style={styles.formSub}>Tu catálogo y favoritos quedan listos al instante.</Text>
            <Text style={styles.fieldLabel}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Contraseña</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loading}>
              <Text style={styles.btnPrimaryText}>{loading ? 'Ingresando...' : 'Ingresar'}</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.line} />
            </View>

            <TouchableOpacity style={styles.btnSecondary} onPress={handleGuest}>
              <Text style={styles.btnSecondaryText}>Continuar como invitado</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.linkText}>¿No tienes cuenta? <Text style={styles.linkAccent}>Regístrate aquí</Text></Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('OwnerLogin')}>
              <Text style={styles.linkText}>¿Tienes un local? <Text style={styles.linkAccent}>Inicia sesión aquí</Text></Text>
            </TouchableOpacity>

            {/* Acceso rápido demo 
            <View style={styles.demoBox}>
              <Text style={styles.demoTitle}>Demo rápido</Text>
              <Text style={styles.demoText}>Las credenciales demo locales ya no aplican.</Text>
              <Text style={styles.demoText}>Crea tu cuenta en “Regístrate aquí”.</Text>
            </View>
            */}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingBottom: 28 },
  heroCard: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 18,
    borderRadius: 28,
    backgroundColor: colors.brandInk,
    paddingHorizontal: 22,
    paddingVertical: 26,
  },
  heroTags: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 16,
    flexWrap: 'wrap',
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: 'rgba(245,242,236,0.08)',
  },
  heroTagText: { color: colors.brandPaper, fontSize: 12, fontWeight: '500' },
  form: {
    marginHorizontal: 20,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 24,
    backgroundColor: colors.bg,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
  },
  formTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  formSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  fieldLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.bgSecondary,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 10 },
  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  btnPrimaryText: { color: colors.white, fontSize: 15, fontWeight: '500' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 },
  line: { flex: 1, height: 0.5, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.textTertiary },
  btnSecondary: {
    borderWidth: 0.5,
    borderColor: colors.brandInk,
    borderRadius: radius.md,
    padding: 13,
    alignItems: 'center',
    marginBottom: 16,
  },
  btnSecondaryText: { color: colors.brandInk, fontSize: 14, fontWeight: '500' },
  linkText: { textAlign: 'center', fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
  linkAccent: { color: colors.primary },
  demoBox: {
    marginTop: 20,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 32,
  },
  demoTitle: { fontSize: 11, fontWeight: '500', color: colors.textSecondary, marginBottom: 4 },
  demoText: { fontSize: 12, color: colors.textTertiary },
});
