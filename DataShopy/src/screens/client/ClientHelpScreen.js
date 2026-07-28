import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';

function FaqItem({ icon, title, desc }) {
  return (
    <View style={styles.faqItem}>
      <View style={styles.faqIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.faqTitle}>{title}</Text>
        <Text style={styles.faqDesc}>{desc}</Text>
      </View>
    </View>
  );
}

export default function ClientHelpScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ayuda</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Centro de ayuda</Text>
          <Text style={styles.heroDesc}>Aquí tienes las respuestas rápidas para usar DataShopy mejor como cliente o como dueño.</Text>
        </View>

        <View style={styles.card}>
          <FaqItem
            icon="heart-outline"
            title="¿Cómo guardo locales favoritos?"
            desc="Abre el detalle de un local y toca el corazón. Aparecerá en Alertas > Mis favoritos y desde tu perfil."
          />
          <FaqItem
            icon="location-outline"
            title="¿Cómo cambio la ciudad?"
            desc="En tu perfil entra en Mi ciudad y guarda una ciudad preferida o vuelve al modo automático."
          />
          <FaqItem
            icon="pricetag-outline"
            title="¿Cómo veo promociones?"
            desc="Entra a un local reclamado para ver sus promociones activas. Si aún no está reclamado, la ficha lo indica."
          />
          <FaqItem
            icon="storefront-outline"
            title="¿Quiero publicar mi negocio?"
            desc="Desde la pantalla de dueño puedes registrar tu negocio o reclamar un local existente con código."
          />
        </View>

        <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL('https://www.google.com/maps')}>
          <Ionicons name="map-outline" size={18} color={colors.primary} />
          <Text style={styles.linkBtnText}>Abrir Google Maps</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  body: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hero: { marginBottom: spacing.lg },
  heroTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  heroDesc: { marginTop: 8, fontSize: 13, lineHeight: 20, color: colors.textSecondary },
  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
    padding: spacing.lg,
  },
  faqItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  faqIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  faqTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 },
  faqDesc: { fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  linkBtn: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 13,
  },
  linkBtnText: { color: colors.brandInk, fontSize: 14, fontWeight: '600' },
});
