import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import { supabase } from '../../supabase/client';

const emptyForm = {
  name: '',
  category: '',
  address: '',
  city: '',
  country: '',
  emoji: '🏪',
  schedule_weekday: '',
  schedule_weekend: '',
  phone: '',
  claim_code: '',
};

const generateClaimCode = () => `DS-${Math.floor(100000 + Math.random() * 900000)}`;

export default function AdminClaimsScreen({ navigation, route }) {
  const adminPin = route.params?.adminPin || '';
  const [tab, setTab] = useState('claims');
  const [claims, setClaims] = useState([]);
  const [stores, setStores] = useState([]);
  const [storeQuery, setStoreQuery] = useState('');
  const [importText, setImportText] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingStoreId, setEditingStoreId] = useState(null);
  const [loading, setLoading] = useState(false);

  const callAdmin = async (action, payload = {}) => {
    const { data, error } = await supabase.functions.invoke('admin-panel', {
      body: {
        pin: adminPin,
        action,
        ...payload,
      },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'No se pudo completar la operación.');
    return data;
  };

  const loadClaims = async () => {
    const res = await callAdmin('listClaims');
    setClaims(Array.isArray(res.claims) ? res.claims : []);
  };

  const loadStores = async (query = storeQuery) => {
    const res = await callAdmin('listStores', { query });
    setStores(Array.isArray(res.stores) ? res.stores : []);
  };

  const load = async () => {
    if (!adminPin) return;
    setLoading(true);
    try {
      await Promise.all([loadClaims(), loadStores(storeQuery)]);
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudieron cargar los datos del panel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!adminPin) {
      Alert.alert('Sesión expirada', 'Ingresa nuevamente tu PIN admin.', [
        { text: 'OK', onPress: () => navigation.replace('AdminLogin') },
      ]);
      return;
    }
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, adminPin, storeQuery]);

  useEffect(() => {
    if (adminPin) load();
  }, [adminPin]);

  const onApprove = (claimId) => {
    Alert.alert('Aprobar reclamo', '¿Quieres aprobar este reclamo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprobar',
        onPress: async () => {
          try {
            await callAdmin('reviewClaim', { claimId, decision: 'approve' });
            await load();
          } catch (e) {
            Alert.alert('Error', e?.message || 'No se pudo aprobar.');
          }
        },
      },
    ]);
  };

  const onReject = (claimId) => {
    Alert.alert('Rechazar reclamo', '¿Quieres rechazar este reclamo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rechazar',
        style: 'destructive',
        onPress: async () => {
          try {
            await callAdmin('reviewClaim', { claimId, decision: 'reject' });
            await loadClaims();
          } catch (e) {
            Alert.alert('Error', e?.message || 'No se pudo rechazar.');
          }
        },
      },
    ]);
  };

  const filteredStores = useMemo(() => {
    const q = (storeQuery || '').trim().toLowerCase();
    if (!q) return stores;
    return stores.filter((s) => `${s.name || ''} ${s.city || ''} ${s.address || ''}`.toLowerCase().includes(q));
  }, [stores, storeQuery]);

  const resetForm = () => {
    setEditingStoreId(null);
    setForm(emptyForm);
  };

  const onEditStore = (store) => {
    setEditingStoreId(store.id);
    setForm({
      name: store.name || '',
      category: store.category || '',
      address: store.address || '',
      city: store.city || '',
      country: store.country || '',
      emoji: store.emoji || '🏪',
      schedule_weekday: store.schedule_weekday || '',
      schedule_weekend: store.schedule_weekend || '',
      phone: store.phone || '',
      claim_code: store.claim_code || '',
    });
  };

  const saveStore = async () => {
    if (!form.name.trim() || !form.category.trim()) {
      Alert.alert('Campos obligatorios', 'Ingresa al menos nombre y categoría.');
      return;
    }
    setLoading(true);
    try {
      await callAdmin('upsertStore', {
        storeId: editingStoreId,
        store: {
          ...form,
          claim_code: (form.claim_code || '').trim().toUpperCase() || null,
        },
      });
      Alert.alert('Listo', editingStoreId ? 'Local actualizado.' : 'Local creado.');
      resetForm();
      await loadStores(storeQuery);
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo guardar el local.');
    } finally {
      setLoading(false);
    }
  };

  const importNow = async () => {
    const raw = (importText || '').trim();
    if (!raw) {
      Alert.alert('Falta JSON', 'Pega aquí el JSON exportado desde tu dashboard.');
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.stores) ? parsed.stores : null;
      if (!arr) {
        Alert.alert('Formato inválido', 'El JSON debe ser un arreglo de locales o tener la propiedad "stores".');
        return;
      }
      setLoading(true);
      const res = await callAdmin('importStores', { stores: arr });
      Alert.alert('Listo', `Importados: +${res.inserted} / actualizados: ~${res.updated} / omitidos: ${res.skipped}`);
      setImportText('');
      await loadStores(storeQuery);
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo importar el JSON.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.replace('AdminLogin')}>
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tab === 'claims' ? 'Reclamos' : 'Catálogo'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={load} disabled={loading}>
          <Ionicons name="refresh" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'claims' && styles.tabBtnActive]}
          onPress={() => setTab('claims')}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, tab === 'claims' && styles.tabTextActive]}>Reclamos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'catalog' && styles.tabBtnActive]}
          onPress={() => setTab('catalog')}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, tab === 'catalog' && styles.tabTextActive]}>Catálogo</Text>
        </TouchableOpacity>
      </View>

      {tab === 'claims' ? (
        <FlatList
          data={claims}
          keyExtractor={(item) => String(item.claim_id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.storeName}>{item.store_name}</Text>
              <Text style={styles.meta}>
                {[item.store_address, item.store_city, item.store_country].filter(Boolean).join(' · ')}
              </Text>
              <Text style={styles.owner}>
                Solicitante: {item.owner_name} ({item.owner_email})
              </Text>
              {!!item.message && <Text style={styles.msg}>{item.message}</Text>}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.btnGhost} onPress={() => onReject(item.claim_id)}>
                  <Text style={styles.btnGhostText}>Rechazar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPrimary} onPress={() => onApprove(item.claim_id)}>
                  <Text style={styles.btnPrimaryText}>Aprobar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Sin solicitudes</Text>
              <Text style={styles.emptyDesc}>Cuando un dueño solicite un reclamo, aparecerá aquí.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredStores}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              <Text style={styles.sectionTitle}>{editingStoreId ? 'Editar local' : 'Crear local'}</Text>
              <Text style={styles.sectionSub}>Este panel guarda los locales reales en Supabase y les puedes asignar código de reclamo.</Text>
              <View style={styles.formGrid}>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
                  placeholder="Nombre del local"
                  placeholderTextColor={colors.textTertiary}
                />
                <TextInput
                  style={styles.input}
                  value={form.category}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, category: value }))}
                  placeholder="Categoría"
                  placeholderTextColor={colors.textTertiary}
                />
                <TextInput
                  style={styles.input}
                  value={form.address}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, address: value }))}
                  placeholder="Dirección"
                  placeholderTextColor={colors.textTertiary}
                />
                <TextInput
                  style={styles.input}
                  value={form.city}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, city: value }))}
                  placeholder="Ciudad"
                  placeholderTextColor={colors.textTertiary}
                />
                <TextInput
                  style={styles.input}
                  value={form.country}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, country: value }))}
                  placeholder="País"
                  placeholderTextColor={colors.textTertiary}
                />
                <TextInput
                  style={styles.input}
                  value={form.emoji}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, emoji: value }))}
                  placeholder="Emoji"
                  placeholderTextColor={colors.textTertiary}
                />
                <TextInput
                  style={styles.input}
                  value={form.schedule_weekday}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, schedule_weekday: value }))}
                  placeholder="Horario semana"
                  placeholderTextColor={colors.textTertiary}
                />
                <TextInput
                  style={styles.input}
                  value={form.schedule_weekend}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, schedule_weekend: value }))}
                  placeholder="Horario finde"
                  placeholderTextColor={colors.textTertiary}
                />
                <TextInput
                  style={styles.input}
                  value={form.phone}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))}
                  placeholder="Teléfono"
                  placeholderTextColor={colors.textTertiary}
                />
                <TextInput
                  style={styles.input}
                  value={form.claim_code}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, claim_code: value.toUpperCase() }))}
                  placeholder="Código de reclamo"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="characters"
                />
              </View>
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.btnGhost}
                  onPress={() => setForm((prev) => ({ ...prev, claim_code: generateClaimCode() }))}
                >
                  <Text style={styles.btnGhostText}>Generar código</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnGhost} onPress={resetForm}>
                  <Text style={styles.btnGhostText}>{editingStoreId ? 'Cancelar edición' : 'Limpiar'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPrimaryFlex} onPress={saveStore} disabled={loading}>
                  <Text style={styles.btnPrimaryText}>{editingStoreId ? 'Guardar cambios' : 'Crear local'}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionTitle}>Importar catálogo (JSON)</Text>
              <Text style={styles.sectionSub}>
                Pega aquí el JSON exportado desde tu dashboard web. Se guardará en Supabase como locales sin reclamar.
              </Text>
              <TextInput
                style={styles.importBox}
                value={importText}
                onChangeText={setImportText}
                placeholder='[{"name":"La Pizzería","category":"Restaurante","city":"Santiago","address":"Av. ...","emoji":"🍕","schedule_weekday":"Lun–Sáb: 12:00–23:00"}]'
                placeholderTextColor={colors.textTertiary}
                multiline
              />
              <TouchableOpacity style={styles.btnPrimaryWide} onPress={importNow}>
                <Text style={styles.btnPrimaryText}>Importar</Text>
              </TouchableOpacity>

              <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Locales ({filteredStores.length})</Text>
              <View style={styles.searchWrap}>
                <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
                <TextInput
                  style={styles.searchInput}
                  value={storeQuery}
                  onChangeText={setStoreQuery}
                  placeholder="Buscar por nombre, ciudad o dirección..."
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const claimed = Number(item?.claimed || 0) === 1;
            return (
              <TouchableOpacity style={styles.storeRow} onPress={() => onEditStore(item)} activeOpacity={0.85}>
                <View style={styles.storeLeft}>
                  <Text style={styles.storeTitle} numberOfLines={1}>
                    {item.emoji || '🏪'} {item.name}
                  </Text>
                  <Text style={styles.storeMeta} numberOfLines={1}>
                    {[item.city, item.address].filter(Boolean).join(' · ') || '—'}
                  </Text>
                  {!!item.claim_code && (
                    <Text style={styles.storeCode} numberOfLines={1}>
                      Código: {item.claim_code}
                    </Text>
                  )}
                </View>
                <View style={[styles.badge, claimed ? styles.badgeClaimed : styles.badgeUnclaimed]}>
                  <Text style={[styles.badgeText, claimed ? styles.badgeTextClaimed : styles.badgeTextUnclaimed]}>
                    {claimed ? 'Reclamado' : 'Sin reclamar'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Sin locales</Text>
              <Text style={styles.emptyDesc}>Importa tu catálogo o crea tiendas desde el panel de dueños.</Text>
            </View>
          }
        />
      )}
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
  tabs: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  tabBtn: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  tabBtnActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  tabText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: colors.primary },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.bg,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 12,
  },
  storeName: { fontSize: 15, fontWeight: '500', color: colors.text },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  owner: { fontSize: 12, color: colors.textTertiary, marginTop: 6 },
  msg: { fontSize: 12, color: colors.textSecondary, marginTop: 8, lineHeight: 18 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  btnGhost: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 0.5, borderColor: colors.border },
  btnGhostText: { color: colors.textSecondary, fontSize: 14 },
  btnPrimary: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.primary },
  btnPrimaryText: { color: colors.white, fontSize: 14, fontWeight: '500' },
  btnPrimaryFlex: { flex: 1, paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' },
  btnPrimaryWide: { marginTop: 10, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' },
  empty: { paddingTop: 40, alignItems: 'center', paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: 14, color: colors.textTertiary, marginBottom: 6 },
  emptyDesc: { fontSize: 12, color: colors.textTertiary, textAlign: 'center', lineHeight: 18 },
  sectionTitle: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 6 },
  sectionSub: { fontSize: 12, color: colors.textTertiary, lineHeight: 18, marginBottom: 10 },
  formGrid: { gap: 10, marginBottom: 10 },
  input: {
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 13,
  },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  importBox: {
    minHeight: 120,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 12,
    textAlignVertical: 'top',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.text, padding: 0 },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 0.5,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 10,
    backgroundColor: colors.bg,
  },
  storeLeft: { flex: 1, paddingRight: 10 },
  storeTitle: { fontSize: 14, fontWeight: '500', color: colors.text },
  storeMeta: { marginTop: 4, fontSize: 12, color: colors.textSecondary },
  storeCode: { marginTop: 4, fontSize: 12, color: colors.primary },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full },
  badgeClaimed: { backgroundColor: colors.primaryLight },
  badgeUnclaimed: { backgroundColor: colors.bgSecondary, borderWidth: 0.5, borderColor: colors.border },
  badgeText: { fontSize: 11, fontWeight: '500' },
  badgeTextClaimed: { color: colors.primary },
  badgeTextUnclaimed: { color: colors.textTertiary },
});
