import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius, spacing } from '../../constants/theme';
import { importCatalogStores } from '../../database/db';
import { supabase } from '../../supabase/client';
import { uploadStoreImage } from '../../supabase/storage';

const COLOR_PRESETS = ['#EEEDFE', '#E1F5EE', '#FAEEDA', '#FAECE7', '#E6F1FB', '#FBEAF0', '#EAF3DE', '#FFF3E0'];
const EMOJI_PRESETS = ['🏪', '🍕', '☕', '👗', '💊', '📱', '🌿', '🛒'];
// #region debug-point D:image-picker
const __dbgBranding = (hypothesisId, msg, data = {}) =>
  fetch('http://192.168.100.168:7777/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'image-upload-network',
      runId: 'pre-fix',
      hypothesisId,
      location: 'src/screens/owner/OwnerBrandingScreen.js',
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {});
// #endregion

export default function OwnerBrandingScreen({ navigation, route }) {
  const owner = route.params?.owner;
  const [store, setStore] = useState(null);
  const [emoji, setEmoji] = useState('🏪');
  const [bannerColor, setBannerColor] = useState('#EEEDFE');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [galleryUrls, setGalleryUrls] = useState([]);
  const [uploading, setUploading] = useState(false);

  const hasStore = Boolean(store?.id);

  const load = async () => {
    if (!owner?.id) return;
    try {
      const { data, error } = await supabase.from('stores').select('*').eq('owner_id', owner.id).limit(1).maybeSingle();
      if (error) throw error;
      setStore(data || null);
      setEmoji(data?.emoji || '🏪');
      setBannerColor(data?.banner_color || '#EEEDFE');
      setDescription(data?.description || '');
      setLogoUrl(data?.logo_url || '');
      setCoverImageUrl(data?.cover_image_url || '');
      let nextGallery = [];
      if (Array.isArray(data?.gallery_urls)) {
        nextGallery = data.gallery_urls.filter(Boolean);
      } else if (typeof data?.gallery_urls === 'string') {
        try {
          const parsed = JSON.parse(data.gallery_urls || '[]');
          nextGallery = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
        } catch {
          nextGallery = [];
        }
      }
      setGalleryUrls(nextGallery);
    } catch {
      setStore(null);
    }
  };

  useEffect(() => {
    load();
  }, [owner?.id]);

  const previewName = useMemo(() => store?.name || 'Tu tienda', [store?.name]);

  const syncLocalStore = (next = {}) => {
    if (!store?.id) return;
    importCatalogStores({
      stores: [
        {
          ...store,
          emoji: String(next.emoji ?? emoji ?? '🏪').trim(),
          banner_color: String(next.banner_color ?? bannerColor ?? '#EEEDFE').trim(),
          description: next.description ?? description.trim(),
          logo_url: next.logo_url ?? logoUrl ?? null,
          cover_image_url: next.cover_image_url ?? coverImageUrl ?? null,
          gallery_urls: next.gallery_urls ?? galleryUrls,
          external_id: `sb:store/${store.id}`,
          claimed: 1,
        },
      ],
      source: 'supabase',
    });
  };

  const pickAndUpload = async (kind) => {
    if (!store?.id || !owner?.id) {
      Alert.alert('Primero crea tu tienda', 'Necesitas una tienda antes de subir imágenes.');
      return;
    }
    try {
      // #region debug-point D:picker-open
      __dbgBranding('D', 'pickAndUpload invoked', {
        kind,
        ownerId: owner?.id || null,
        storeId: store?.id || null,
      });
      // #endregion
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      // #region debug-point D:picker-permission
      __dbgBranding('D', 'media permission result', {
        kind,
        status: perm?.status || null,
        granted: !!perm?.granted,
      });
      // #endregion
      if (perm.status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para subir imágenes del negocio.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: kind !== 'gallery',
        aspect: kind === 'logo' ? [1, 1] : [4, 3],
      });
      // #region debug-point D:picker-result
      __dbgBranding('D', 'image picker result', {
        kind,
        canceled: !!result?.canceled,
        assetCount: Array.isArray(result?.assets) ? result.assets.length : 0,
        firstUri: result?.assets?.[0]?.uri || null,
        firstMimeType: result?.assets?.[0]?.mimeType || null,
        firstFileName: result?.assets?.[0]?.fileName || null,
      });
      // #endregion
      if (result.canceled || !result.assets?.[0]) return;

      setUploading(true);
      const publicUrl = await uploadStoreImage({
        ownerId: owner.id,
        storeId: store.id,
        asset: result.assets[0],
        kind,
      });

      let updatePayload = {};
      if (kind === 'logo') {
        updatePayload = { logo_url: publicUrl };
        setLogoUrl(publicUrl || '');
      } else if (kind === 'cover') {
        updatePayload = { cover_image_url: publicUrl };
        setCoverImageUrl(publicUrl || '');
      } else {
        const nextGallery = [...galleryUrls, publicUrl].filter(Boolean).slice(0, 6);
        updatePayload = { gallery_urls: nextGallery };
        setGalleryUrls(nextGallery);
      }

      const { error } = await supabase.from('stores').update(updatePayload).eq('id', store.id);
      if (error) throw error;
      syncLocalStore(updatePayload);
    } catch (e) {
      // #region debug-point D:picker-catch
      __dbgBranding('D', 'pickAndUpload catch', {
        kind,
        error: e?.message || String(e),
      });
      // #endregion
      Alert.alert('Error', e?.message || 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const removeGalleryImage = async (url) => {
    if (!store?.id) return;
    const nextGallery = galleryUrls.filter((item) => item !== url);
    try {
      const { error } = await supabase.from('stores').update({ gallery_urls: nextGallery }).eq('id', store.id);
      if (error) throw error;
      setGalleryUrls(nextGallery);
      syncLocalStore({ gallery_urls: nextGallery });
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo quitar la imagen.');
    }
  };

  const saveBranding = async () => {
    if (!store?.id) {
      Alert.alert('Primero crea tu tienda', 'Necesitas una tienda antes de personalizar galería y logo.', [
        { text: 'Ir a crear', onPress: () => navigation.navigate('EditStore', { owner }) },
        { text: 'Cancelar', style: 'cancel' },
      ]);
      return;
    }

    try {
      const { error } = await supabase
        .from('stores')
        .update({
          emoji: (emoji || '🏪').trim(),
          banner_color: (bannerColor || '#EEEDFE').trim(),
          description: description.trim(),
        })
        .eq('id', store.id);
      if (error) throw error;

      syncLocalStore();

      Alert.alert('Listo', 'La identidad visual de tu negocio fue actualizada.');
      load();
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo guardar la identidad visual.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Galería y logo</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={[styles.previewCard, { backgroundColor: bannerColor || '#EEEDFE' }]}>
          {!!coverImageUrl && <Image source={{ uri: coverImageUrl }} style={styles.previewCover} resizeMode="cover" />}
          {!!logoUrl ? <Image source={{ uri: logoUrl }} style={styles.previewLogo} resizeMode="cover" /> : <Text style={styles.previewEmoji}>{emoji || '🏪'}</Text>}
          <Text style={styles.previewName}>{previewName}</Text>
          <Text style={styles.previewHint}>Así se verá el encabezado principal del local.</Text>
        </View>

        {!hasStore ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Aún no tienes tienda</Text>
            <Text style={styles.emptyDesc}>Primero crea tu negocio y luego vuelve aquí para personalizar su identidad.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('EditStore', { owner })}>
              <Text style={styles.primaryBtnText}>Crear mi tienda</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Imágenes reales</Text>
            <Text style={styles.sectionDesc}>Sube logo, portada y hasta 6 fotos del local. Estas imágenes se guardan en Supabase Storage.</Text>
            <View style={styles.uploadActions}>
              <TouchableOpacity style={styles.mediaBtn} onPress={() => pickAndUpload('logo')} disabled={uploading}>
                <Ionicons name="image-outline" size={18} color={colors.brandInk} />
                <Text style={styles.mediaBtnText}>{logoUrl ? 'Cambiar logo' : 'Subir logo'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaBtn} onPress={() => pickAndUpload('cover')} disabled={uploading}>
                <Ionicons name="images-outline" size={18} color={colors.brandInk} />
                <Text style={styles.mediaBtnText}>{coverImageUrl ? 'Cambiar portada' : 'Subir portada'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.galleryBtn} onPress={() => pickAndUpload('gallery')} disabled={uploading || galleryUrls.length >= 6}>
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.galleryBtnText}>
                {uploading ? 'Subiendo...' : galleryUrls.length >= 6 ? 'Galería completa' : 'Agregar foto a galería'}
              </Text>
            </TouchableOpacity>

            {!!galleryUrls.length && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
                {galleryUrls.map((url) => (
                  <View key={url} style={styles.galleryItem}>
                    <Image source={{ uri: url }} style={styles.galleryImage} resizeMode="cover" />
                    <TouchableOpacity style={styles.galleryRemove} onPress={() => removeGalleryImage(url)}>
                      <Ionicons name="close" size={14} color={colors.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <Text style={styles.sectionTitle}>Logo rápido</Text>
            <Text style={styles.sectionDesc}>Elige un emoji representativo para tu negocio.</Text>
            <View style={styles.emojiGrid}>
              {EMOJI_PRESETS.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.emojiChip, emoji === item && styles.emojiChipActive]}
                  onPress={() => setEmoji(item)}
                >
                  <Text style={styles.emojiChipText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Emoji personalizado</Text>
            <TextInput
              style={styles.input}
              value={emoji}
              onChangeText={setEmoji}
              placeholder="🍕"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={styles.sectionTitle}>Color de portada</Text>
            <View style={styles.colorRow}>
              {COLOR_PRESETS.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.colorChip, { backgroundColor: item }, bannerColor === item && styles.colorChipActive]}
                  onPress={() => setBannerColor(item)}
                />
              ))}
            </View>

            <Text style={styles.label}>Color en formato hex</Text>
            <TextInput
              style={styles.input}
              value={bannerColor}
              onChangeText={setBannerColor}
              placeholder="#EEEDFE"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Descripción destacada</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Cuéntales a tus clientes qué hace especial a tu local."
              placeholderTextColor={colors.textTertiary}
              multiline
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={saveBranding}>
              <Text style={styles.primaryBtnText}>Guardar cambios</Text>
            </TouchableOpacity>
          </View>
        )}
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
  body: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: 16 },
  previewCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  previewCover: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  previewLogo: {
    width: 74,
    height: 74,
    borderRadius: 22,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  previewEmoji: { fontSize: 52 },
  previewName: { marginTop: 10, fontSize: 22, fontWeight: '700', color: colors.brandInk },
  previewHint: { marginTop: 6, fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
    padding: spacing.lg,
  },
  emptyBox: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyDesc: { marginTop: 8, fontSize: 13, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  sectionDesc: { fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginBottom: 10 },
  uploadActions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  mediaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.brandPaper,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  mediaBtnText: { color: colors.brandInk, fontSize: 13, fontWeight: '600' },
  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.primary,
    paddingVertical: 12,
    marginBottom: 10,
  },
  galleryBtnText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  galleryRow: { gap: 10, paddingBottom: 10 },
  galleryItem: { width: 110, height: 90, borderRadius: radius.md, overflow: 'hidden', position: 'relative' },
  galleryImage: { width: '100%', height: '100%' },
  galleryRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiChip: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiChipActive: { borderWidth: 1, borderColor: colors.brandInk },
  emojiChipText: { fontSize: 24 },
  label: { marginTop: 16, marginBottom: 8, fontSize: 12, color: colors.textSecondary },
  input: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  colorChip: { width: 34, height: 34, borderRadius: radius.full },
  colorChipActive: { borderWidth: 2, borderColor: colors.brandInk },
  primaryBtn: {
    marginTop: 20,
    borderRadius: radius.md,
    backgroundColor: colors.brandInk,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryBtnText: { color: colors.white, fontSize: 14, fontWeight: '600' },
});
