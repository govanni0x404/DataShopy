import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stars } from '../../components/StarRating';
import LoadingOverlay from '../../components/LoadingOverlay';
import { colors, radius, spacing } from '../../constants/theme';
import { supabase } from '../../supabase/client';

const PAGE = 50;

const formatDate = (iso) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Moderation list: newest reviews across all stores. Admins can delete any
// review (the `reviews_delete_own_or_admin` RLS policy enforces that server-side,
// so this screen does not need the admin-panel edge function).
export default function AdminReviewsPanel() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lowOnly, setLowOnly] = useState(false);

  const load = useCallback(async () => {
    try {
      let query = supabase
        .from('reviews')
        .select('id,rating,comment,author_name,created_at,stores(name,city)')
        .order('created_at', { ascending: false })
        .limit(PAGE);
      if (lowOnly) query = query.lte('rating', 2);
      const { data, error } = await query;
      if (error) throw error;
      setReviews(data || []);
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudieron cargar las reseñas.');
    }
  }, [lowOnly]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onDelete = (review) => {
    Alert.alert('Eliminar reseña', `¿Eliminar la reseña de ${review.author_name || 'este usuario'}? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            const { data, error } = await supabase.from('reviews').delete().eq('id', review.id).select('id');
            if (error) throw error;
            if (!data?.length) throw new Error('No tienes permiso para eliminar esta reseña.');
            setReviews((prev) => prev.filter((r) => r.id !== review.id));
          } catch (e) {
            Alert.alert('Error', e?.message || 'No se pudo eliminar la reseña.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <>
      <View style={styles.filters}>
        <TouchableOpacity style={[styles.chip, !lowOnly && styles.chipActive]} onPress={() => setLowOnly(false)}>
          <Text style={[styles.chipText, !lowOnly && styles.chipTextActive]}>Recientes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.chip, lowOnly && styles.chipActive]} onPress={() => setLowOnly(true)}>
          <Text style={[styles.chipText, lowOnly && styles.chipTextActive]}>1-2 estrellas</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={onRefresh}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.top}>
              <View style={{ flex: 1 }}>
                <Text style={styles.store} numberOfLines={1}>
                  {item.stores?.name || 'Local eliminado'}
                </Text>
                <Text style={styles.meta}>
                  {item.author_name} · {formatDate(item.created_at)}
                </Text>
              </View>
              <Stars value={item.rating} size={13} />
            </View>
            {!!item.comment && <Text style={styles.comment}>{item.comment}</Text>}
            <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item)}>
              <Ionicons name="trash-outline" size={15} color={colors.danger} />
              <Text style={styles.deleteText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Sin reseñas</Text>
              <Text style={styles.emptyDesc}>
                {lowOnly ? 'No hay reseñas con 1 o 2 estrellas.' : 'Las reseñas de los clientes aparecerán aquí para moderarlas.'}
              </Text>
            </View>
          )
        }
      />
      <LoadingOverlay visible={loading || busy} label="Procesando..." />
    </>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 0.5, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontWeight: '700' },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.bg,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 12,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  store: { fontSize: 15, fontWeight: '500', color: colors.text },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  comment: { fontSize: 13, lineHeight: 19, color: colors.text, marginTop: 8 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', marginTop: 10, padding: 6 },
  deleteText: { color: colors.danger, fontSize: 13, fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: 15, fontWeight: '500', color: colors.text },
  emptyDesc: { fontSize: 12, color: colors.textTertiary, marginTop: 6, textAlign: 'center', lineHeight: 18 },
});
