import React, { useState } from 'react';
import { Alert } from 'react-native';
import AuthLayout, { AuthButton, AuthDivider, AuthInput, AuthLink, AuthLinks } from '../../components/AuthLayout';
import LoadingOverlay from '../../components/LoadingOverlay';
import { supabase } from '../../supabase/client';
import { getProfile, upsertProfile } from '../../supabase/profile';
import { registerForPushNotificationsAsync } from '../../notifications/push';

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
      } catch (e) {
        console.warn('[Login] getProfile failed', e);
      }
      if (!profile) {
        try {
          profile = await upsertProfile({
            id: u.id,
            role: 'customer',
            name: u.user_metadata?.name || null,
          });
        } catch (e) {
          console.warn('[Login] upsertProfile fallback failed', e);
        }
      }
      const nextUser = {
        id: u.id,
        name: profile?.name || u.user_metadata?.name || 'Usuario',
        email: u.email || '',
      };
      registerForPushNotificationsAsync(u.id);
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
    <>
      <AuthLayout title="Ingresa a tu cuenta" subtitle="Tu catálogo y favoritos quedan listos al instante.">
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
          placeholder="••••••••"
          password
          showPassword={showPass}
          onTogglePassword={() => setShowPass(!showPass)}
        />

        <AuthButton label={loading ? 'Ingresando...' : 'Ingresar'} onPress={handleLogin} disabled={loading} />
        <AuthDivider />
        <AuthButton variant="secondary" icon="compass-outline" label="Explorar como invitado" onPress={handleGuest} disabled={loading} />

        <AuthLinks>
          <AuthLink prefix="¿No tienes cuenta?" action="Regístrate aquí" onPress={() => navigation.navigate('Register')} />
          <AuthLink prefix="¿Tienes un local?" action="Inicia sesión aquí" alt onPress={() => navigation.navigate('OwnerLogin')} />
        </AuthLinks>
      </AuthLayout>
      <LoadingOverlay visible={loading} label="Ingresando..." />
    </>
  );
}
