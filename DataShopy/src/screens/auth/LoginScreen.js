import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView,
  Platform, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loginUser } from '../../database/db';
import { colors, radius, spacing } from '../../constants/theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Campos vacíos', 'Ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    const user = loginUser(email.trim().toLowerCase(), password);
    setLoading(false);
    if (user) {
      navigation.replace('ClientApp', { user });
    } else {
      Alert.alert('Error', 'Correo o contraseña incorrectos.');
    }
  };

  const handleGuest = () => {
    navigation.replace('ClientApp', { user: { name: 'Invitado', email: '' } });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Ionicons name="storefront" size={36} color={colors.primary} />
            </View>
            <Text style={styles.appName}>DataShopy</Text>
            <Text style={styles.appSub}>Descubre los mejores locales</Text>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
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

            {/* Acceso rápido demo */}
            <View style={styles.demoBox}>
              <Text style={styles.demoTitle}>Demo rápido</Text>
              <Text style={styles.demoText}>Email: maria@mail.com</Text>
              <Text style={styles.demoText}>Password: demo1234</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1 },
  logoArea: { alignItems: 'center', paddingTop: 48, paddingBottom: 24 },
  logoCircle: {
    width: 72, height: 72,
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  appName: { fontSize: 28, fontWeight: '500', color: colors.text },
  appSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  form: { paddingHorizontal: 24 },
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
    marginTop: 20,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 32,
  },
  demoTitle: { fontSize: 11, fontWeight: '500', color: colors.textSecondary, marginBottom: 4 },
  demoText: { fontSize: 12, color: colors.textTertiary },
});