import React, { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';

export default function AdminLoginScreen({ navigation }) {
  const [pin, setPin] = useState('');

  const handleEnter = () => {
    if (pin.trim() !== '1234') {
      Alert.alert('Pin incorrecto', 'Intenta nuevamente.');
      return;
    }
    navigation.replace('AdminClaims', { adminPin: pin.trim() });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>Acceso admin</Text>
        <Text style={styles.sub}>Ingresa tu pin para revisar solicitudes de reclamo.</Text>

        <Text style={styles.label}>Pin</Text>
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={setPin}
          placeholder="1234"
          placeholderTextColor={colors.textTertiary}
          keyboardType="number-pad"
        />

        <TouchableOpacity style={styles.btnPrimary} onPress={handleEnter}>
          <Text style={styles.btnText}>Entrar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    height: 56,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '500', color: colors.text },
  body: { padding: spacing.lg },
  title: { fontSize: 18, fontWeight: '500', color: colors.text },
  sub: { fontSize: 13, color: colors.textSecondary, marginTop: 6, lineHeight: 18 },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: 6, marginTop: 18 },
  input: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  btnPrimary: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
  },
  btnText: { color: colors.white, fontSize: 15, fontWeight: '500' },
});
