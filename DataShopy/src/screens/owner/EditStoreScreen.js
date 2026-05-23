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
import * as Location from 'expo-location';
import { colors, radius, spacing } from '../../constants/theme';
import { importCatalogStores } from '../../database/db';
import { supabase } from '../../supabase/client';

export default function EditStoreScreen({ navigation, route }) {
  const owner = route.params?.owner;
  const [storeId, setStoreId] = useState(null);

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
  const [locLoading, setLocLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!owner?.id) return;
      try {
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
      } catch {}
    };
    load();
    return () => {
      mounted = false;
    };
  }, [owner?.id]);

  const title = useMemo(() => (storeId ? 'Info de mi tienda' : 'Crear mi tienda'), [storeId]);

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
    if (!name.trim() || !category.trim()) {
      Alert.alert('Campos obligatorios', 'Ingresa el nombre y la categoría.');
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
    };

    if (data.lat != null && Number.isNaN(data.lat)) data.lat = null;
    if (data.lng != null && Number.isNaN(data.lng)) data.lng = null;

    try {
      if (storeId) {
        const { error } = await supabase.from('stores').update({ ...data }).eq('id', storeId);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase
          .from('stores')
          .insert({ ...data, owner_id: owner.id, claimed: true, claimed_at: new Date().toISOString(), source: 'owner' })
          .select('*')
          .single();
        if (error) throw error;
        setStoreId(created?.id || null);
      }
      const id = storeId || null;
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
            },
          ],
          source: 'supabase',
        });
      } else if (id) {
        importCatalogStores({ stores: [{ ...data, external_id: `sb:store/${id}`, claimed: 1 }], source: 'supabase' });
      }
      Alert.alert('Listo', 'Tu tienda fue guardada.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch {
      Alert.alert('Error', 'No se pudo guardar. Intenta nuevamente.');
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
            <Text style={styles.btnSecondaryText}>{locLoading ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+56 2 2345 6789"
            placeholderTextColor={colors.textTertiary}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Horario (Lun–Sáb)</Text>
          <TextInput
            style={styles.input}
            value={scheduleWeekday}
            onChangeText={setScheduleWeekday}
            placeholder="Lun–Sáb: 12:00–23:00"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={styles.label}>Horario (Dom / fin de semana)</Text>
          <TextInput
            style={styles.input}
            value={scheduleWeekend}
            onChangeText={setScheduleWeekend}
            placeholder="Dom: 13:00–21:00"
            placeholderTextColor={colors.textTertiary}
          />

          <TouchableOpacity style={styles.btnPrimary} onPress={handleSave}>
            <Text style={styles.btnText}>Guardar cambios</Text>
          </TouchableOpacity>
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '500', color: colors.text, paddingHorizontal: 8 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxl },
  storeHeader: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16 },
  logoBox: { width: 60, height: 60, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 28 },
  storeTitle: { fontSize: 16, fontWeight: '500', color: colors.text },
  storeHint: { fontSize: 12, color: colors.primary, marginTop: 4 },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: 6, marginTop: 14 },
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
  coordRow: { flexDirection: 'row', gap: 12 },
  btnSecondary: {
    marginTop: 12,
    borderWidth: 0.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: 13,
    alignItems: 'center',
  },
  btnSecondaryText: { color: colors.primary, fontSize: 14 },
  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  btnText: { color: colors.white, fontSize: 15, fontWeight: '500' },
});
