import React, { useEffect, useMemo, useState } from 'react';
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
import { colors, radius, spacing } from '../../constants/theme';
import { importCatalogPromos, importCatalogStores } from '../../database/db';
import { supabase } from '../../supabase/client';

export default function ManagePromosScreen({ navigation, route }) {
  const owner = route.params?.owner;
  const storeIdFromRoute = route.params?.storeId;

  const [storeId, setStoreId] = useState(storeIdFromRoute || null);
  const [promos, setPromos] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const load = async () => {
    let id = storeIdFromRoute;
    try {
      if (!id && owner?.id) {
        const { data: s } = await supabase.from('stores').select('*').eq('owner_id', owner.id).limit(1).maybeSingle();
        id = s?.id || null;
        if (s?.id) {
          importCatalogStores({
            stores: [
              {
                name: s.name,
                category: s.category,
                description: s.description,
                address: s.address,
                phone: s.phone,
                schedule_weekday: s.schedule_weekday,
                schedule_weekend: s.schedule_weekend,
                emoji: s.emoji,
                banner_color: s.banner_color,
                city: s.city,
                country: s.country,
                lat: s.lat,
                lng: s.lng,
                source: s.source || 'supabase',
                external_id: `sb:store/${s.id}`,
                claimed: s.claimed ? 1 : 0,
                claimed_at: s.claimed_at,
              },
            ],
            source: 'supabase',
          });
        }
      }
      setStoreId(id);
      if (!id) {
        setPromos([]);
        return;
      }
      const { data: ps, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('store_id', id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPromos(Array.isArray(ps) ? ps : []);
      importCatalogPromos({ promos: Array.isArray(ps) ? ps : [], source: 'supabase' });
    } catch {
      setStoreId(id || null);
      setPromos([]);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, owner?.id, storeIdFromRoute]);

  useEffect(() => {
    load();
  }, [owner?.id, storeIdFromRoute]);

  const statsText = useMemo(() => {
    const max = 5;
    const active = promos.length;
    const available = Math.max(0, max - active);
    return `${active} activas · ${available} disponibles`;
  }, [promos.length]);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setTag('');
    setExpiresAt('');
    setFormOpen(false);
  };

  const openNew = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setTag('');
    setExpiresAt('');
    setFormOpen(true);
  };

  const openEdit = (promo) => {
    setEditingId(promo.id);
    setTitle(promo.title || '');
    setDescription(promo.description || '');
    setTag(promo.tag || '');
    setExpiresAt(promo.expires_at || '');
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!storeId) {
      Alert.alert('Primero crea tu tienda', 'Necesitas crear tu tienda antes de publicar promociones.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Campo obligatorio', 'Ingresa un título para la promoción.');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      tag: tag.trim(),
      expires_at: expiresAt.trim(),
    };

    const run = async () => {
      try {
        if (editingId) {
          const { error } = await supabase.from('promotions').update(payload).eq('id', editingId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('promotions').insert({ ...payload, store_id: storeId, is_active: true });
          if (error) throw error;
        }
        resetForm();
        load();
      } catch (e) {
        Alert.alert('Error', e?.message || 'No se pudo guardar la promoción.');
      }
    };
    run();
  };

  const handleDelete = (promo) => {
    Alert.alert('Eliminar promoción', '¿Quieres desactivar esta promoción?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          const run = async () => {
            try {
              const { error } = await supabase.from('promotions').update({ is_active: false }).eq('id', promo.id);
              if (error) throw error;
              load();
            } catch (e) {
              Alert.alert('Error', e?.message || 'No se pudo eliminar.');
            }
          };
          run();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis promociones</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {!storeId ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Aún no tienes tienda</Text>
              <Text style={styles.emptyDesc}>Crea tu tienda para empezar a publicar promociones.</Text>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('EditStore', { owner })}>
                <Text style={styles.btnText}>Crear mi tienda</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.statsText}>{statsText}</Text>

              {formOpen && (
                <View style={styles.formCard}>
                  <Text style={styles.formTitle}>{editingId ? 'Editar promoción' : 'Nueva promoción'}</Text>

                  <Text style={styles.label}>Título</Text>
                  <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="2x1 pizza familiar"
                    placeholderTextColor={colors.textTertiary}
                  />

                  <Text style={styles.label}>Etiqueta</Text>
                  <TextInput
                    style={styles.input}
                    value={tag}
                    onChangeText={setTag}
                    placeholder="🔥 Solo hoy"
                    placeholderTextColor={colors.textTertiary}
                  />

                  <Text style={styles.label}>Descripción</Text>
                  <TextInput
                    style={[styles.input, styles.multiline]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Detalles de la promo..."
                    placeholderTextColor={colors.textTertiary}
                    multiline
                  />

                  <Text style={styles.label}>Vence (texto o fecha)</Text>
                  <TextInput
                    style={styles.input}
                    value={expiresAt}
                    onChangeText={setExpiresAt}
                    placeholder="2026-05-22"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                  />

                  <View style={styles.formActions}>
                    <TouchableOpacity style={styles.btnGhost} onPress={resetForm}>
                      <Text style={styles.btnGhostText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnPrimarySmall} onPress={handleSave}>
                      <Text style={styles.btnText}>Guardar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {promos.map((p) => (
                <View key={String(p.id)} style={styles.promoCard}>
                  <View style={styles.promoTop}>
                    <Text style={styles.promoTitle} numberOfLines={1}>
                      {p.title}
                    </Text>
                    <View style={styles.actions}>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(p)}>
                        <Ionicons name="pencil-outline" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(p)}>
                        <Ionicons name="trash-outline" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.promoDesc} numberOfLines={2}>
                    {p.tag ? `${p.tag} · ` : ''}
                    {p.expires_at ? `Vence: ${p.expires_at}` : 'Sin fecha de vencimiento'}
                  </Text>
                  <View style={styles.statusRow}>
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>Activa</Text>
                    </View>
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.addBtn} onPress={openNew}>
                <Ionicons name="add" size={18} color={colors.white} />
                <Text style={styles.addBtnText}>Nueva promoción</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  body: { padding: spacing.lg, paddingBottom: spacing.xxl },
  statsText: { fontSize: 13, color: colors.textSecondary, marginBottom: 14 },
  promoCard: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
    padding: 12,
    marginBottom: 10,
  },
  promoTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 },
  promoTitle: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  promoDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  statusRow: { marginTop: 8 },
  activePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.successLight,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activePillText: { fontSize: 11, color: colors.success, fontWeight: '500' },
  addBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 13,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    marginTop: 8,
  },
  addBtnText: { color: colors.white, fontSize: 14, fontWeight: '500' },
  emptyBox: { paddingTop: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '500', color: colors.text, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 14 },
  btnPrimary: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 14, alignItems: 'center' },
  btnPrimarySmall: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  btnText: { color: colors.white, fontSize: 14, fontWeight: '500' },
  formCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  formTitle: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 6 },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  btnGhost: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.md },
  btnGhostText: { color: colors.textSecondary, fontSize: 14 },
});
