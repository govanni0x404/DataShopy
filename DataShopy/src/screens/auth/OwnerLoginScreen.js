import React, { useState } from 'react';
import { Alert } from 'react-native';
import AuthLayout, { AuthButton, AuthDivider, AuthInput, AuthLink, AuthLinks } from '../../components/AuthLayout';
import LoadingOverlay from '../../components/LoadingOverlay';
import { supabase } from '../../supabase/client';
import { getProfile, upsertProfile } from '../../supabase/profile';
import { registerForPushNotificationsAsync } from '../../notifications/push';

export default function OwnerLoginScreen({ navigation }) {
  const [mode, setMode] = useState('login'); // login | register
  const isRegister = mode === 'register';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const goOwnerApp = (owner) => {
    registerForPushNotificationsAsync(owner.id);
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
    <>
      <AuthLayout
        variant="owner"
        title={isRegister ? 'Activa tu negocio' : 'Entrar al panel de dueño'}
        subtitle={
          isRegister
            ? 'Crea tu acceso para reclamar o administrar tu local.'
            : 'Gestiona tu perfil, promociones y actividad del negocio.'
        }
      >
        {isRegister && (
          <AuthInput icon="person-outline" label="Nombre del responsable" value={name} onChangeText={setName} placeholder="Tu nombre" />
        )}
        <AuthInput
          icon="storefront-outline"
          label="Correo del negocio"
          value={email}
          onChangeText={setEmail}
          placeholder="tienda@correo.com"
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
        {isRegister && (
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
        )}

        <AuthButton
          label={loading ? 'Cargando...' : isRegister ? 'Crear cuenta y entrar' : 'Entrar al panel'}
          onPress={isRegister ? handleRegister : handleLogin}
          disabled={loading}
        />
        <AuthDivider />
        <AuthButton
          variant="secondary"
          icon={isRegister ? 'log-in-outline' : 'add-circle-outline'}
          label={isRegister ? 'Ya tengo cuenta' : 'Registrar mi tienda'}
          onPress={() => setMode(isRegister ? 'login' : 'register')}
          disabled={loading}
        />

        <AuthLinks>
          <AuthLink prefix="¿Eres cliente?" action="Ingresar aquí" onPress={() => navigation.replace('Login')} disabled={loading} />
          <AuthLink prefix="¿Eres admin?" action="Entrar aquí" alt onPress={() => navigation.navigate('AdminLogin')} disabled={loading} />
        </AuthLinks>
      </AuthLayout>
      <LoadingOverlay visible={loading} label={isRegister ? 'Creando tu cuenta...' : 'Ingresando...'} />
    </>
  );
}
