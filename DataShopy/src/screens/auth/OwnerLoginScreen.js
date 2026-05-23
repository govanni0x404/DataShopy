import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../constants/theme';
import { supabase } from '../../supabase/client';
import { getProfile, upsertProfile } from '../../supabase/profile';

export default function OwnerLoginScreen({ navigation }) {
  const [mode, setMode] = useState('login'); // login | register
  const isRegister = mode === 'register';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => (isRegister ? 'Registrar tienda' : 'Panel de tienda'), [isRegister]);
  const subtitle = useMemo(
    () => (isRegister ? 'Crea tu acceso para administrar tu local en DataShopy.' : 'Administra tu local en DataShopy'),
    [isRegister]
  );

  const goOwnerApp = (owner) => {
    navigation.replace('OwnerApp', { owner });
  };

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
      const profile = await getProfile(u.id);
      if (!profile || profile.role !== 'owner') {
        await supabase.auth.signOut();
        Alert.alert('No autorizado', 'Esta cuenta no tiene acceso como dueño.');
        return;
      }
      goOwnerApp({ id: u.id, name: profile.name || u.user_metadata?.name || 'Dueño', email: u.email || '' });
    } catch (e) {
      Alert.alert('Error', e?.message || 'Correo o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !confirm) {
      Alert.alert('Campos vacíos', 'Completa todos los campos.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { name: name.trim() } },
      });
      if (error) throw error;
      const u = data?.user;
      if (!u?.id) throw new Error('No se pudo crear la cuenta.');
      await upsertProfile({ id: u.id, role: 'owner', name: name.trim() });
      if (!data?.session) {
        Alert.alert(
          'Cuenta creada',
          'Revisa tu correo para confirmar la cuenta y luego inicia sesión. Si desactivas la confirmación por email en Supabase, podrás entrar al instante.',
          [{ text: 'OK', onPress: () => setMode('login') }]
        );
        return;
      }
      goOwnerApp({ id: u.id, name: name.trim(), email: u.email || '' });
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo crear la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Ionicons name={isRegister ? 'storefront' : 'shield-checkmark'} size={36} color={colors.primary} />
            </View>
            <Text style={styles.appName}>{title}</Text>
            <Text style={styles.appSub}>{subtitle}</Text>
          </View>

          <View style={styles.form}>
            {isRegister && (
              <>
                <Text style={styles.fieldLabel}>Nombre del responsable</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Tu nombre"
                  placeholderTextColor={colors.textTertiary}
                />
              </>
            )}

            <Text style={styles.fieldLabel}>Correo del negocio</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="tienda@correo.com"
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

            {isRegister && (
              <>
                <Text style={styles.fieldLabel}>Confirmar contraseña</Text>
                <TextInput
                  style={styles.input}
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Repite tu contraseña"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showPass}
                />
              </>
            )}

            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={isRegister ? handleRegister : handleLogin}
              disabled={loading}
            >
              <Text style={styles.btnPrimaryText}>
                {loading ? 'Cargando...' : isRegister ? 'Crear cuenta y entrar' : 'Entrar al panel'}
              </Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.line} />
            </View>

            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => setMode(isRegister ? 'login' : 'register')}
              disabled={loading}
            >
              <Text style={styles.btnSecondaryText}>{isRegister ? 'Ya tengo cuenta' : 'Registrar mi tienda'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.replace('Login')} disabled={loading}>
              <Text style={styles.linkText}>
                ¿Eres cliente? <Text style={styles.linkAccent}>Ingresar aquí</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('AdminLogin')} disabled={loading}>
              <Text style={styles.linkText}>
                ¿Eres admin? <Text style={styles.linkAccent}>Entrar aquí</Text>
              </Text>
            </TouchableOpacity>

            {/*<View style={styles.demoBox}>
              <Text style={styles.demoTitle}>Demo rápido</Text>
              <Text style={styles.demoText}>Email: carlos@pizzeria.com</Text>
              <Text style={styles.demoText}>Password: demo1234</Text>
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
  logoArea: { alignItems: 'center', paddingTop: 48, paddingBottom: 24 },
  logoCircle: {
    width: 72,
    height: 72,
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: { fontSize: 22, fontWeight: '500', color: colors.text },
  appSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },
  form: { paddingHorizontal: 24, paddingBottom: 32 },
  fieldLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.bg,
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
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: 13,
    alignItems: 'center',
    marginBottom: 16,
  },
  btnSecondaryText: { color: colors.primary, fontSize: 14 },
  linkText: { textAlign: 'center', fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
  linkAccent: { color: colors.primary },
  demoBox: {
    marginTop: 12,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    padding: 12,
  },
  demoTitle: { fontSize: 11, fontWeight: '500', color: colors.textSecondary, marginBottom: 4 },
  demoText: { fontSize: 12, color: colors.textTertiary },
});
