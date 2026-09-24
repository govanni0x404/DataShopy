import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/theme';
import { LEGAL_DOCS } from '../constants/legal';

// route.params.doc: 'privacy' | 'terms'
export default function LegalScreen({ navigation, route }) {
  const doc = LEGAL_DOCS[route?.params?.doc] || LEGAL_DOCS.privacy;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{doc.title}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.updated}>Última actualización: {doc.updated}</Text>
        <Text style={styles.intro}>{doc.intro}</Text>
        {doc.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            {section.items.map((item) => (
              <View key={item} style={styles.itemRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.item}>{item}</Text>
              </View>
            ))}
          </View>
        ))}
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
  updated: { fontSize: 12, color: colors.textTertiary },
  intro: { fontSize: 14, lineHeight: 21, color: colors.text, marginTop: spacing.md },
  section: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.bgSecondary,
  },
  heading: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 8 },
  itemRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  bullet: { fontSize: 13, color: colors.primary, lineHeight: 20 },
  item: { flex: 1, fontSize: 13, lineHeight: 20, color: colors.textSecondary },
});
