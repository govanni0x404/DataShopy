import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import LoadingOverlay from '../../components/LoadingOverlay';
import { colors, radius, spacing } from '../../constants/theme';
import { supabase } from '../../supabase/client';
import { MAX_PRODUCTS, discountPercent, fetchStoreProducts, formatPrice, parsePrice } from '../../supabase/products';
import { uploadStoreImage } from '../../supabase/storage';

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  compareAtPrice: '',
  imageUrl: '',
  isPack: false,
  packItems: '',
};

export default function ManageProductsScreen({ navigation, route }) {
  const owner = route.params?.owner;
  const storeIdFromRoute = route.params?.storeId;

  const [storeId, setStoreId] = useState(storeIdFromRoute || null);
  const [products, setProducts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Guardando...');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const setField = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const load = async () => {
    let id = storeIdFromRoute;
    try {
      if (!id && owner?.id) {
        const { data: s } = await supabase.from('stores').select('id').eq('owner_id', owner.id).limit(1).maybeSingle();
        id = s?.id || null;
      }
      setStoreId(id || null);
      setProducts(id ? await fetchStoreProducts(id, { includeHidden: true }) : []);
    } catch (e) {
      console.warn('[ManageProducts] load failed', e);
      setProducts([]);
    }
  };

  useEffect(() => {
    load();
  }, [owner?.id, storeIdFromRoute]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(false);
  };

  const openNew = () => {
    if (products.length >= MAX_PRODUCTS) {
      Alert.alert('Límite alcanzado', `Puedes tener hasta ${MAX_PRODUCTS} productos. Elimina alguno para agregar otro.`);
      return;
    }
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price != null ? String(Number(product.price)) : '',
      compareAtPrice: product.compare_at_price != null ? String(Number(product.compare_at_price)) : '',
      imageUrl: product.image_url || '',
      isPack: Boolean(product.is_pack),
      packItems: product.pack_items || '',
    });
    setFormOpen(true);
  };

  const pickImage = async () => {
    if (!storeId || !owner?.id) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para subir la imagen del producto.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (result.canceled || !result.assets?.[0]) return;
      setBusyLabel('Subiendo imagen...');
      setBusy(true);
      const url = await uploadStoreImage({ ownerId: owner.id, storeId, asset: result.assets[0], kind: 'product' });
      setField('imageUrl')(url || '');
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo subir la imagen.');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!storeId) return;
    const name = form.name.trim();
    const price = parsePrice(form.price);
    const compareAt = parsePrice(form.compareAtPrice);
    if (!name) {
      Alert.alert('Campo obligatorio', 'Ingresa el nombre del producto.');
      return;
    }
    if (price == null) {
      Alert.alert('Precio inválido', 'Ingresa un precio válido, por ejemplo 12990.');
      return;
    }
    if (form.compareAtPrice.trim() && compareAt == null) {
      Alert.alert('Precio anterior inválido', 'Déjalo vacío o ingresa un número válido.');
      return;
    }

    const payload = {
      name,
      description: form.description.trim() || null,
      price,
      compare_at_price: compareAt,
      image_url: form.imageUrl || null,
      is_pack: form.isPack,
      pack_items: form.isPack ? form.packItems.trim() || null : null,
    };

    setBusyLabel('Guardando...');
    setBusy(true);
    try {
      const { error } = editingId
        ? await supabase.from('products').update(payload).eq('id', editingId)
        : await supabase.from('products').insert({ ...payload, store_id: storeId });
      if (error) throw error;
      resetForm();
      await load();
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo guardar el producto.');
    } finally {
      setBusy(false);
    }
  };

  const toggleVisible = async (product) => {
    setBusyLabel('Guardando...');
    setBusy(true);
    try {
      const { error } = await supabase.from('products').update({ is_active: !product.is_active }).eq('id', product.id);
      if (error) throw error;
      await load();
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo actualizar.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (product) => {
    Alert.alert('Eliminar producto', `¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setBusyLabel('Eliminando...');
          setBusy(true);
          try {
            const { error } = await supabase.from('products').delete().eq('id', product.id);
            if (error) throw error;
            if (editingId === product.id) resetForm();
            await load();
          } catch (e) {
            Alert.alert('Error', e?.message || 'No se pudo eliminar.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const visibleCount = products.filter((p) => p.is_active).length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis productos</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {!storeId ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Aún no tienes tienda</Text>
              <Text style={styles.emptyDesc}>Reclama tu negocio para empezar a mostrar tus productos.</Text>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('ClaimStore', { owner })}>
                <Text style={styles.btnText}>Reclamar negocio</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.statsText}>
                {visibleCount} visibles · {products.length}/{MAX_PRODUCTS} productos
              </Text>

              {formOpen && (
                <View style={styles.formCard}>
                  <Text style={styles.formTitle}>{editingId ? 'Editar producto' : 'Nuevo producto'}</Text>

                  <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.85}>
                    {form.imageUrl ? (
                      <Image source={{ uri: form.imageUrl }} style={styles.imagePreview} resizeMode="cover" />
                    ) : (
                      <>
                        <Ionicons name="camera-outline" size={26} color={colors.primary} />
                        <Text style={styles.imagePickerText}>Agregar foto</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  {!!form.imageUrl && (
                    <TouchableOpacity onPress={() => setField('imageUrl')('')}>
                      <Text style={styles.removeImage}>Quitar foto</Text>
                    </TouchableOpacity>
                  )}

                  <Text style={styles.label}>Nombre</Text>
                  <TextInput
                    style={styles.input}
                    value={form.name}
                    onChangeText={setField('name')}
                    placeholder="Pizza familiar napolitana"
                    placeholderTextColor={colors.textTertiary}
                    maxLength={80}
                  />

                  <View style={styles.priceRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Precio</Text>
                      <TextInput
                        style={styles.input}
                        value={form.price}
                        onChangeText={setField('price')}
                        placeholder="12990"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Precio anterior (opcional)</Text>
                      <TextInput
                        style={styles.input}
                        value={form.compareAtPrice}
                        onChangeText={setField('compareAtPrice')}
                        placeholder="15990"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  <Text style={styles.label}>Descripción</Text>
                  <TextInput
                    style={[styles.input, styles.multiline]}
                    value={form.description}
                    onChangeText={setField('description')}
                    placeholder="Detalles del producto..."
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    maxLength={300}
                  />

                  <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchLabel}>Es un pack</Text>
                      <Text style={styles.switchHint}>Combina varios productos en una oferta</Text>
                    </View>
                    <Switch
                      value={form.isPack}
                      onValueChange={setField('isPack')}
                      trackColor={{ true: colors.primary }}
                      thumbColor={colors.white}
                    />
                  </View>

                  {form.isPack && (
                    <>
                      <Text style={styles.label}>¿Qué incluye el pack?</Text>
                      <TextInput
                        style={[styles.input, styles.multiline]}
                        value={form.packItems}
                        onChangeText={setField('packItems')}
                        placeholder="1 pizza familiar, 1 bebida 1.5L, 1 postre"
                        placeholderTextColor={colors.textTertiary}
                        multiline
                        maxLength={300}
                      />
                    </>
                  )}

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

              {!products.length && !formOpen && (
                <Text style={styles.emptyDesc}>
                  Aún no tienes productos. Muestra tus productos o packs con foto y precio para que los clientes los vean en tu
                  perfil.
                </Text>
              )}

              {products.map((p) => {
                const discount = discountPercent(p.price, p.compare_at_price);
                return (
                  <View key={String(p.id)} style={[styles.productCard, !p.is_active && styles.productHidden]}>
                    <View style={styles.thumb}>
                      {p.image_url ? (
                        <Image source={{ uri: p.image_url }} style={styles.thumbImage} resizeMode="cover" />
                      ) : (
                        <Ionicons name={p.is_pack ? 'gift-outline' : 'cube-outline'} size={22} color={colors.primary} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <View style={styles.productPriceRow}>
                        <Text style={styles.productPrice}>{formatPrice(p.price)}</Text>
                        {discount != null && <Text style={styles.productOldPrice}>{formatPrice(p.compare_at_price)}</Text>}
                      </View>
                      <View style={styles.pillRow}>
                        {p.is_pack && (
                          <View style={[styles.pill, { backgroundColor: colors.primaryLight }]}>
                            <Text style={[styles.pillText, { color: colors.primary }]}>Pack</Text>
                          </View>
                        )}
                        <View style={[styles.pill, { backgroundColor: p.is_active ? colors.successLight : colors.bgSecondary }]}>
                          <Text style={[styles.pillText, { color: p.is_active ? colors.success : colors.textTertiary }]}>
                            {p.is_active ? 'Visible' : 'Oculto'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.actions}>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => toggleVisible(p)}>
                        <Ionicons name={p.is_active ? 'eye-outline' : 'eye-off-outline'} size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(p)}>
                        <Ionicons name="pencil-outline" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(p)}>
                        <Ionicons name="trash-outline" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              <TouchableOpacity style={styles.addBtn} onPress={openNew}>
                <Ionicons name="add" size={18} color={colors.white} />
                <Text style={styles.addBtnText}>Nuevo producto</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <LoadingOverlay visible={busy} label={busyLabel} />
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
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
    padding: 10,
    marginBottom: 10,
  },
  productHidden: { opacity: 0.6 },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%' },
  productName: { fontSize: 14, fontWeight: '500', color: colors.text },
  productPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  productPrice: { fontSize: 14, fontWeight: '700', color: colors.primary },
  productOldPrice: { fontSize: 11, color: colors.textTertiary, textDecorationLine: 'line-through' },
  pillRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  pill: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: '600' },
  actions: { gap: 6 },
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
  formTitle: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 10 },
  imagePicker: {
    height: 150,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: '100%' },
  imagePickerText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  removeImage: { fontSize: 12, color: colors.danger, marginTop: 6, alignSelf: 'flex-end' },
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
  priceRow: { flexDirection: 'row', gap: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  switchLabel: { fontSize: 14, color: colors.text, fontWeight: '500' },
  switchHint: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  btnGhost: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.md },
  btnGhostText: { color: colors.textSecondary, fontSize: 14 },
});
