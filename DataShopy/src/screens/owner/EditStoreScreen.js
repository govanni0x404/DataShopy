import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import LoadingOverlay from '../../components/LoadingOverlay';
import { colors, radius, spacing } from '../../constants/theme';
import { importCatalogStores } from '../../database/db';
import { supabase } from '../../supabase/client';
import { isReadableSchedule } from '../../utils/openingHours';

const placeKey = (address, city) => `${String(address || '').trim().toLowerCase()}|${String(city || '').trim().toLowerCase()}`;

export default function EditStoreScreen({ navigation, route }) {
  const owner = route.params?.owner;
  const [storeId, setStoreId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [emoji, setEmoji] = useState('🏪');
  const [bannerColor, setBannerColor] = useState('#EEEDFE');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [scheduleWeekday, setScheduleWeekday] = useState('');
  const [scheduleWeekend, setScheduleWeekend] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const originalPlaceRef = useRef('');
  const [keywords, setKeywords] = useState('');
  const [locLoading, setLocLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const title = 'Info de mi tienda';

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!owner?.id) return;
      try {
        if (mounted) setLoaded(false);
        const { data: existing, error } = await supabase
          .from('stores')
          .select('*')
          .eq('owner_id', owner.id)
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (!mounted) return;
        if (!existing) return;
        setStoreId(existing.id);
        setEmoji(existing.emoji || '🏪');
        setBannerColor(existing.banner_color || '#EEEDFE');
        setName(existing.name || '');
        setCategory(existing.category || '');
        setDescription(existing.description || '');
        setAddress(existing.address || '');
        setPhone(existing.phone || '');
        setScheduleWeekday(existing.schedule_weekday || '');
        setScheduleWeekend(existing.schedule_weekend || '');
        setCity(existing.city || '');
        setCountry(existing.country || '');
        setLat(existing.lat != null ? String(existing.lat) : '');
        setLng(existing.lng != null ? String(existing.lng) : '');
        setKeywords(existing.keywords || '');
        originalPlaceRef.current = placeKey(existing.address, existing.city);
      } catch {
      } finally {
        if (mounted) setLoaded(true);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [owner?.id]);

  const saveLocationNow = async (payload = {}) => {
    if (!owner?.id || !storeId) return false;
    try {
      const { error } = await supabase.from('stores').update(payload).eq('id', storeId);
      if (error) throw error;
      const { data: latest } = await supabase.from('stores').select('*').eq('owner_id', owner.id).limit(1).maybeSingle();
      if (latest?.id) {
        importCatalogStores({
          stores: [
            {
              name: latest.name,
              category: latest.category,
              description: latest.description,
              address: latest.address,
              phone: latest.phone,
              schedule_weekday: latest.schedule_weekday,
              schedule_weekend: latest.schedule_weekend,
              emoji: latest.emoji,
              banner_color: latest.banner_color,
              city: latest.city,
              country: latest.country,
              lat: latest.lat,
              lng: latest.lng,
              source: latest.source || 'supabase',
              external_id: `sb:store/${latest.id}`,
              claimed: latest.claimed ? 1 : 0,
              claimed_at: latest.claimed_at,
              keywords: latest.keywords,
            },
          ],
          source: 'supabase',
        });
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleUseMyLocation = async () => {
    try {
      setLocLoading(true);
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setLocLoading(false);
        Alert.alert('Permiso requerido', 'Activa la ubicación para guardar las coordenadas de tu tienda.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setLat(String(coords.latitude));
      setLng(String(coords.longitude));
      const geo = await Location.reverseGeocodeAsync(coords);
      const g = geo?.[0];
      const newCity = g?.city || g?.subregion || g?.region || '';
      const newCountry = g?.isoCountryCode || g?.country || '';
      if (newCity) setCity(newCity);
      if (newCountry) setCountry(newCountry);
      if (!address.trim()) {
        const addr = [g?.street, g?.name, newCity].filter(Boolean).join(' ');
        if (addr.trim()) setAddress(addr.trim());
      }
      setLocLoading(false);
      if (storeId) {
        const payload = {
          lat: coords.latitude,
          lng: coords.longitude,
          city: newCity ? newCity : city.trim() || null,
          country: newCountry ? newCountry : country.trim() || null,
        };
        Alert.alert('Ubicación detectada', '¿Quieres guardar esta ubicación ahora?', [
          {
            text: 'Guardar',
            onPress: async () => {
              setLocLoading(true);
              const ok = await saveLocationNow(payload);
              setLocLoading(false);
              if (ok) Alert.alert('Listo', 'Ubicación actualizada en tu tienda.');
              else Alert.alert('Error', 'No se pudo guardar la ubicación.');
            },
          },
          { text: 'Después', style: 'cancel' },
        ]);
      }
    } catch {
      setLocLoading(false);
      Alert.alert('Error', 'No se pudo obtener tu ubicación.');
    }
  };

  const handleSave = async () => {
    if (!owner?.id) {
      Alert.alert('Error', 'No se encontró el dueño.');
      return;
    }
    if (!storeId) {
      Alert.alert('Reclama tu negocio primero', 'Debes reclamar un local existente o solicitar su aprobación antes de poder editarlo.');
      return;
    }
    if (!name.trim() || !category.trim()) {
      Alert.alert('Campos obligatorios', 'Ingresa el nombre y la categoría.');
      return;
    }

    if (!isReadableSchedule(scheduleWeekday) || !isReadableSchedule(scheduleWeekend)) {
      Alert.alert(
        'No entendimos el horario',
        'Escríbelo así: 09:00 - 18:00. Si algún día no abres, escribe Cerrado. Puedes indicar días: Lun–Sáb: 12:00–23:00.'
      );
      return;
    }

    const data = {
      name: name.trim(),
      category: category.trim(),
      description: description.trim(),
      address: address.trim(),
      phone: phone.trim(),
      schedule_weekday: scheduleWeekday.trim(),
      schedule_weekend: scheduleWeekend.trim(),
      emoji: (emoji || '🏪').trim(),
      banner_color: (bannerColor || '#EEEDFE').trim(),
      city: city.trim() || null,
      country: country.trim() || null,
      lat: lat.trim() ? Number(lat.trim()) : null,
      lng: lng.trim() ? Number(lng.trim()) : null,
      keywords: keywords.trim() || null,
    };

    if (data.lat != null && Number.isNaN(data.lat)) data.lat = null;
    if (data.lng != null && Number.isNaN(data.lng)) data.lng = null;

    // Coordinates can't be edited anymore (the location is the written address), so if the
    // address or city changed the old coordinates would point to the wrong place: clear them.
    if (originalPlaceRef.current && placeKey(data.address, data.city) !== originalPlaceRef.current) {
      data.lat = null;
      data.lng = null;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('stores').update({ ...data }).eq('id', storeId);
      if (error) throw error;
      const { data: latest } = await supabase.from('stores').select('*').eq('owner_id', owner.id).limit(1).maybeSingle();
      if (latest?.id) {
        importCatalogStores({
          stores: [
            {
              name: latest.name,
              category: latest.category,
              description: latest.description,
              address: latest.address,
              phone: latest.phone,
              schedule_weekday: latest.schedule_weekday,
              schedule_weekend: latest.schedule_weekend,
              emoji: latest.emoji,
              banner_color: latest.banner_color,
              city: latest.city,
              country: latest.country,
              lat: latest.lat,
              lng: latest.lng,
              source: latest.source || 'supabase',
              external_id: `sb:store/${latest.id}`,
              claimed: latest.claimed ? 1 : 0,
              claimed_at: latest.claimed_at,
              keywords: latest.keywords,
            },
          ],
          source: 'supabase',
        });
      }
      Alert.alert('Listo', 'Tu tienda fue guardada.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch {
      Alert.alert('Error', 'No se pudo guardar. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {loaded && !storeId ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Aún no tienes un negocio reclamado</Text>
          <Text style={styles.emptyDesc}>
            Para editar la información de un local, primero debes reclamarlo con un código o solicitar su aprobación a un admin.
          </Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('ClaimStore', { owner })}>
            <Text style={styles.btnText}>Reclamar negocio</Text>
          </TouchableOpacity>
        </View>
      ) : (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.storeHeader}>
            <View style={[styles.logoBox, { backgroundColor: bannerColor || '#EEEDFE' }]}>
              <Text style={styles.logoEmoji}>{emoji || '🏪'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.storeTitle} numberOfLines={1}>
                {name.trim() ? name.trim() : 'Tu tienda'}
              </Text>
              <Text style={styles.storeHint}>Personaliza el logo, color y datos del local.</Text>
            </View>
          </View>

          <Text style={styles.label}>Emoji (logo)</Text>
          <TextInput
            style={styles.input}
            value={emoji}
            onChangeText={setEmoji}
            placeholder="🍕"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={styles.label}>Color de banner (hex)</Text>
          <TextInput
            style={styles.input}
            value={bannerColor}
            onChangeText={setBannerColor}
            placeholder="#EEEDFE"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Nombre del local</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="La Pizzería"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={styles.label}>Categoría</Text>
          <TextInput
            style={styles.input}
            value={category}
            onChangeText={setCategory}
            placeholder="Comida italiana"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe tu local..."
            placeholderTextColor={colors.textTertiary}
            multiline
          />

          <Text style={styles.label}>Palabras clave (qué vendes)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={keywords}
            onChangeText={setKeywords}
            placeholder="Ej: rueda, manubrio, sillín, casco, reparación"
            placeholderTextColor={colors.textTertiary}
            multiline
          />
          <Text style={styles.hint}>
            Escribe, separados por coma, los productos y servicios de tu local. Los clientes te encontrarán al buscar
            cualquiera de estas palabras.
          </Text>

          <Text style={styles.label}>Dirección</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Av. Providencia 1520, Santiago"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={styles.label}>Ciudad</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="Santiago"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={styles.label}>País (código)</Text>
          <TextInput
            style={styles.input}
            value={country}
            onChangeText={setCountry}
            placeholder="CL"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="characters"
          />

          {/* Ubicación exacta (latitud/longitud y "Usar mi ubicación actual") desactivada: la ubicación es solo la dirección escrita.
          <View style={styles.coordRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Latitud</Text>
              <TextInput
                style={styles.input}
                value={lat}
                onChangeText={setLat}
                placeholder="-33.45"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Longitud</Text>
              <TextInput
                style={styles.input}
                value={lng}
                onChangeText={setLng}
                placeholder="-70.66"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.btnSecondary} onPress={handleUseMyLocation} disabled={locLoading}>
            <Ionicons name="locate-outline" size={16} color={colors.secondary} />
            <Text style={styles.btnSecondaryText}>{locLoading ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}</Text>
          </TouchableOpacity>
          */}

          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+56 2 2345 6789"
            placeholderTextColor={colors.textTertiary}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Horario entre semana</Text>
          <TextInput
            style={styles.input}
            value={scheduleWeekday}
            onChangeText={setScheduleWeekday}
            placeholder="09:00 - 18:00"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Horario fin de semana</Text>
          <TextInput
            style={styles.input}
            value={scheduleWeekend}
            onChangeText={setScheduleWeekend}
            placeholder="10:00 - 14:00 (o escribe Cerrado)"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
          />
          <Text style={styles.hint}>
            Usa el formato HH:MM - HH:MM. Así los clientes ven si estás abierto ahora. Si tus días son distintos, indícalos:
            "Lun–Sáb: 12:00–23:00" y "Dom: 13:00–21:00".
          </Text>

          <TouchableOpacity style={styles.btnPrimary} onPress={handleSave} disabled={saving}>
            <Text style={styles.btnText}>Guardar cambios</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      )}
      <LoadingOverlay visible={saving} label="Guardando..." />
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '500', color: colors.text, paddingHorizontal: 8 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxl },
  emptyBox: { flex: 1, padding: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '500', color: colors.text, textAlign: 'center' },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 20, lineHeight: 18 },
  storeHeader: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16 },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },
  logoEmoji: { fontSize: 28 },
  storeTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  storeHint: { fontSize: 12, color: colors.primary, marginTop: 4, fontWeight: '500' },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: 6, marginTop: 14, fontWeight: '600' },
  input: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  multiline: { minHeight: 86, textAlignVertical: 'top' },
  hint: { fontSize: 11, color: colors.textTertiary, marginTop: 6, lineHeight: 16 },
  coordRow: { flexDirection: 'row', gap: 12 },
  btnSecondary: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.secondary,
    backgroundColor: colors.secondaryLight,
    borderRadius: radius.md,
    padding: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: { color: colors.secondary, fontSize: 14, fontWeight: '600' },
  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  btnText: { color: colors.white, fontSize: 15, fontWeight: '600' },
});
