import React, { useState } from 'react';
import { Alert, Text } from 'react-native';
import { colors } from '../../constants/theme';
import AuthLayout, { AuthButton, AuthDivider, AuthInput, AuthLink, AuthLinks } from '../../components/AuthLayout';
import LoadingOverlay from '../../components/LoadingOverlay';
import { supabase } from '../../supabase/client';
import { upsertProfile } from '../../supabase/profile';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

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
      if (u?.id) {
        try {
          await upsertProfile({ id: u.id, role: 'customer', name: name.trim() });
        } catch (e) {
          console.warn('[Register] upsertProfile failed', e);
        }
      }
      if (!data?.session) {
        Alert.alert(
          'Cuenta creada',
          'Revisa tu correo para confirmar la cuenta y luego inicia sesión. Si desactivas la confirmación por email en Supabase, podrás entrar al instante.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }
      Alert.alert('¡Listo!', 'Tu cuenta fue creada. Ya puedes ingresar.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo crear la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthLayout
        title="Crear cuenta"
        subtitle="Únete a DataShopy y descubre los mejores locales de tu ciudad."
        onBack={() => navigation.goBack()}
      >
        <AuthInput icon="person-outline" label="Nombre completo" value={name} onChangeText={setName} placeholder="Tu nombre" />
        <AuthInput
          icon="mail-outline"
          label="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          placeholder="tu@correo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <AuthInput
          icon="lock-closed-outline"
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          placeholder="Mínimo 6 caracteres"
          password
          showPassword={showPass}
          onTogglePassword={() => setShowPass(!showPass)}
        />
        <AuthInput
          icon="shield-checkmark-outline"
          label="Confirmar contraseña"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Repite tu contraseña"
          password
          showPassword={showPass}
          onTogglePassword={() => setShowPass(!showPass)}
        />

        <AuthButton label={loading ? 'Creando cuenta...' : 'Crear cuenta'} onPress={handleRegister} disabled={loading} />

        <Text style={{ fontSize: 12, color: colors.textTertiary, textAlign: 'center', lineHeight: 18, marginTop: 14 }}>
          Al crear tu cuenta aceptas los{' '}
          <Text style={{ color: colors.primary, fontWeight: '700' }} onPress={() => navigation.navigate('Legal', { doc: 'terms' })}>
            Términos
          </Text>{' '}
          y la{' '}
          <Text style={{ color: colors.primary, fontWeight: '700' }} onPress={() => navigation.navigate('Legal', { doc: 'privacy' })}>
            Política de privacidad
          </Text>
          .
        </Text>

        <AuthLinks>
          <AuthLink prefix="¿Ya tienes cuenta?" action="Inicia sesión" onPress={() => navigation.goBack()} />
        </AuthLinks>
      </AuthLayout>
      <LoadingOverlay visible={loading} label="Creando tu cuenta..." />
    </>
  );
}
