import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import StoreCard from '../../components/StoreCard';
import { colors, radius, spacing } from '../../constants/theme';
import { supabase } from '../../supabase/client';

export default function ClaimStoreScreen({ navigation, route }) {
  const owner = route.params?.owner;
  const [code, setCode] = useState('');
  const [query, setQuery] = useState('');
  const [city, setCity] = useState(null);
  const [locNote, setLocNote] = useState('');
  const [stores, setStores] = useState([]);

  const [canClaim, setCanClaim] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadCanClaim = async () => {
      if (!owner?.id) {
        if (mounted) setCanClaim(false);
        return;
      }
      try {
        const { data: existing, error } = await supabase.from('stores').select('id').eq('owner_id', owner.id).limit(1).maybeSingle();
        if (error) throw error;
        if (!mounted) return;
        setCanClaim(!existing);
      } catch {
        if (mounted) setCanClaim(false);
      }
    };
    loadCanClaim();
    return () => {
      mounted = false;
    };
  }, [owner?.id]);

  useEffect(() => {
    let mounted = true;
    const loadStores = async () => {
      try {
        let q = supabase
          .from('stores')
          .select('*')
          .eq('claimed', false)
          .order('name', { ascending: true })
          .limit(200);
        if (city) q = q.eq('city', city);
        const needle = (query || '').trim();
        if (needle) q = q.ilike('name', `%${needle}%`);
        const { data, error } = await q;
        if (error) throw error;
        if (!mounted) return;
        setStores(Array.isArray(data) ? data : []);
      } catch {
        if (mounted) setStores([]);
      }
    };
    loadStores();
    return () => {
      mounted = false;
    };
  }, [query, city]);

  useEffect(() => {
    let mounted = true;
    const loadCity = async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!mounted) return;
        if (perm.status !== 'granted') {
          setLocNote('Activa ubicación para filtrar por ciudad.');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!mounted) return;
        const geo = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        if (!mounted) return;
        const g = geo?.[0];
        const c = g?.city || g?.subregion || g?.region || null;
        if (c) setCity(c);
      } catch {
        if (mounted) setLocNote('No se pudo obtener tu ciudad.');
      }
    };
    loadCity();
    return () => {
      mounted = false;
    };
  }, []);

  const requestClaim = (store) => {
    if (!owner?.id) {
      Alert.alert('Error', 'No se encontró el dueño.');
      return;
    }
    if (!canClaim) {
      Alert.alert('No disponible', 'Ya tienes una tienda asociada. Por ahora solo se permite 1 tienda por dueño.');
      return;
    }
    Alert.alert('Solicitar reclamo', `¿Quieres solicitar el reclamo de "${store.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Solicitar',
        onPress: () => {
          const run = async () => {
            try {
              const { error } = await supabase.from('claims').insert({
                store_id: store.id,
                owner_id: owner.id,
                status: 'pending',
                message: null,
              });
              if (error) throw error;
              Alert.alert('Listo', 'Tu solicitud fue enviada. Un admin debe aprobarla.');
              setQuery('');
            } catch (e) {
              Alert.alert('Error', e?.message || 'No se pudo solicitar.');
            }
          };
          run();
        },
      },
    ]);
  };

  const claimWithCode = async () => {
    const c = (code || '').trim();
    if (!c) {
      Alert.alert('Código requerido', 'Ingresa el código del local.');
      return;
    }
    if (!owner?.id) {
      Alert.alert('Error', 'No se encontró el dueño.');
      return;
    }
    if (!canClaim) {
      Alert.alert('No disponible', 'Ya tienes una tienda asociada. Por ahora solo se permite 1 tienda por dueño.');
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('claim-with-code', { body: { code: c } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'No se pudo reclamar.');
      Alert.alert('Listo', 'Local reclamado correctamente.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo reclamar.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reclamar negocio</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.searchBar}>
        <Text style={styles.sectionTitle}>Reclamar con código</Text>
        <View style={styles.codeRow}>
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={setCode}
            placeholder="DS-1234"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.codeBtn} onPress={claimWithCode} disabled={!canClaim}>
            <Text style={styles.codeBtnText}>Reclamar</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionTitle}>Buscar por lista</Text>
        <View style={styles.searchInput}>
          <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
          <TextInput
            style={styles.searchText}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar local..."
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        {!!city && <Text style={styles.helperText}>Filtrando por ciudad: {city}</Text>}
        {!!locNote && <Text style={styles.helperText}>{locNote}</Text>}
      </View>

      <FlatList
        data={stores}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <StoreCard store={item} promoCount={0} onPress={() => requestClaim(item)} />
            <TouchableOpacity style={styles.claimBtn} onPress={() => requestClaim(item)} disabled={!canClaim}>
              <Text style={styles.claimBtnText}>{canClaim ? 'Solicitar reclamo' : 'No disponible'}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Sin locales para reclamar</Text>
            <Text style={styles.emptyDesc}>Cuando carguemos locales de tu zona en el catálogo, aparecerán aquí.</Text>
          </View>
        }
      />
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
  searchBar: { padding: spacing.lg, paddingBottom: spacing.sm },
  sectionTitle: { fontSize: 12, color: colors.textTertiary, marginBottom: 8, marginTop: 8 },
  codeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  codeInput: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  codeBtn: {
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    opacity: 1,
  },
  codeBtnText: { color: colors.white, fontSize: 14, fontWeight: '500' },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchText: { flex: 1, fontSize: 14, color: colors.text, padding: 0 },
  helperText: { marginTop: 6, fontSize: 12, color: colors.textTertiary },
  list: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  item: { marginBottom: 12 },
  claimBtn: {
    marginTop: 8,
    borderWidth: 0.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  claimBtnText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
  empty: { paddingTop: 40, alignItems: 'center', paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: 14, color: colors.textTertiary, marginBottom: 6 },
  emptyDesc: { fontSize: 12, color: colors.textTertiary, textAlign: 'center', lineHeight: 18 },
});
