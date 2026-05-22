import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { registerUser } from '../../database/db';
import { colors, radius } from '../../constants/theme';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleRegister = () => {
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
    const result = registerUser(name.trim(), email.trim().toLowerCase(), password);
    if (result.success) {
      Alert.alert('¡Listo!', 'Tu cuenta fue creada. Ya puedes ingresar.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Error', result.error);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Crear cuenta</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.form}>
            <Text style={styles.subtitle}>Únete a DataShopy y descubre los mejores locales de tu ciudad.</Text>

            <Text style={styles.label}>Nombre completo</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Tu nombre" placeholderTextColor={colors.textTertiary} />

            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="tu@correo.com" placeholderTextColor={colors.textTertiary} keyboardType="email-address" autoCapitalize="none" />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Mínimo 6 caracteres" placeholderTextColor={colors.textTertiary} secureTextEntry />

            <Text style={styles.label}>Confirmar contraseña</Text>
            <TextInput style={styles.input} value={confirm} onChangeText={setConfirm} placeholder="Repite tu contraseña" placeholderTextColor={colors.textTertiary} secureTextEntry />

            <TouchableOpacity style={styles.btnPrimary} onPress={handleRegister}>
              <Text style={styles.btnText}>Crear cuenta</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.linkText}>¿Ya tienes cuenta? <Text style={styles.linkAccent}>Inicia sesión</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 20 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '500', color: colors.text },
  form: { paddingHorizontal: 24 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 24, lineHeight: 20 },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 0.5, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 14, color: colors.text },
  btnPrimary: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 24, marginBottom: 16 },
  btnText: { color: colors.white, fontSize: 15, fontWeight: '500' },
  linkText: { textAlign: 'center', fontSize: 13, color: colors.textSecondary },
  linkAccent: { color: colors.primary },
});