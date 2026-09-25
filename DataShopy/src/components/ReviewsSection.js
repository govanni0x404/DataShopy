import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stars, StarInput } from './StarRating';
import { colors, radius, spacing } from '../constants/theme';
import { getSupabaseStoreId, setStoreRatingLocal } from '../database/db';
import { supabase } from '../supabase/client';
import { isRemoteUser } from '../supabase/favorites';

const MAX_COMMENT = 500;

const formatDate = (iso) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
};

const isPermissionError = (error) => error?.code === '42501' || /row-level security/i.test(error?.message || '');

// Ratings summary + list of reviews for a store, and the form to write, edit
// or delete your own review. Reviews live only in Supabase (no offline copy),
// so it quietly renders nothing for stores that are not on the server.
export default function ReviewsSection({ storeId, userId, onStatsChange }) {
  const supaStoreId = getSupabaseStoreId(storeId);
  const canReview = isRemoteUser(userId);

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ avg: 0, count: 0 });
  const [mine, setMine] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!supaStoreId) return;
    try {
      const [listRes, statsRes] = await Promise.all([
        supabase
          .from('reviews')
          .select('id,user_id,rating,comment,author_name,created_at')
          .eq('store_id', supaStoreId)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase.from('store_rating_stats').select('rating_avg,rating_count').eq('store_id', supaStoreId).maybeSingle(),
      ]);
      if (listRes.error) throw listRes.error;

      const list = listRes.data || [];
      const nextStats = { avg: Number(statsRes.data?.rating_avg) || 0, count: Number(statsRes.data?.rating_count) || 0 };
      setReviews(list);
      setStats(nextStats);
      setLoadFailed(false);

      let own = canReview ? list.find((r) => r.user_id === userId) || null : null;
      if (canReview && !own) {
        const ownRes = await supabase
          .from('reviews')
          .select('id,user_id,rating,comment,author_name,created_at')
          .eq('store_id', supaStoreId)
          .eq('user_id', userId)
          .maybeSingle();
        own = ownRes.data || null;
      }
      setMine(own);

      setStoreRatingLocal(storeId, nextStats.avg, nextStats.count);
      onStatsChange?.();
    } catch (e) {
      console.warn('[Reviews] load failed', e);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [supaStoreId, storeId, userId, canReview, onStatsChange]);

  useEffect(() => {
    load();
  }, [supaStoreId, userId]);

  if (!supaStoreId) return null;

  const openForm = () => {
    setRating(mine?.rating || 0);
    setComment(mine?.comment || '');
    setFormOpen(true);
  };

  const save = async () => {
    if (!rating) {
      Alert.alert('Elige una calificación', 'Toca las estrellas para calificar de 1 a 5.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .upsert({ store_id: supaStoreId, user_id: userId, rating, comment: comment.trim() || null }, { onConflict: 'store_id,user_id' });
      if (error) throw error;
      setFormOpen(false);
      await load();
    } catch (e) {
      if (isPermissionError(e)) Alert.alert('No se pudo publicar', 'No puedes reseñar tu propio local.');
      else Alert.alert('Error', e?.message || 'No se pudo guardar tu reseña.');
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!mine?.id) return;
    Alert.alert('Eliminar reseña', '¿Quieres eliminar tu reseña de este local?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            const { error } = await supabase.from('reviews').delete().eq('id', mine.id);
            if (error) throw error;
            setFormOpen(false);
            await load();
          } catch (e) {
            Alert.alert('Error', e?.message || 'No se pudo eliminar tu reseña.');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Reseñas</Text>

      {loading ? (
        <ActivityIndicator style={{ marginVertical: spacing.lg }} color={colors.primary} />
      ) : loadFailed ? (
        <Text style={styles.muted}>No pudimos cargar las reseñas. Revisa tu conexión.</Text>
      ) : (
        <>
          <View style={styles.summary}>
            <Text style={styles.avg}>{stats.count > 0 ? stats.avg.toFixed(1) : '–'}</Text>
            <View style={{ flex: 1 }}>
              <Stars value={stats.avg} size={18} />
              <Text style={styles.muted}>
                {stats.count === 0 ? 'Aún sin reseñas' : `${stats.count} ${stats.count === 1 ? 'reseña' : 'reseñas'}`}
              </Text>
            </View>
          </View>

          {canReview ? (
            <TouchableOpacity style={styles.writeBtn} onPress={openForm} activeOpacity={0.85}>
              <Ionicons name={mine ? 'create-outline' : 'star-outline'} size={16} color={colors.white} />
              <Text style={styles.writeBtnText}>{mine ? 'Editar mi reseña' : 'Escribir una reseña'}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.muted}>Inicia sesión con tu cuenta para dejar una reseña.</Text>
          )}

          {reviews.length === 0 ? (
            <Text style={[styles.muted, { marginTop: spacing.md }]}>Sé el primero en opinar sobre este local.</Text>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={styles.review}>
                <View style={styles.reviewTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{String(review.author_name || 'U').trim().charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.author} numberOfLines={1}>
                      {review.user_id === userId ? 'Tú' : review.author_name}
                    </Text>
                    <Text style={styles.date}>{formatDate(review.created_at)}</Text>
                  </View>
                  <Stars value={review.rating} size={13} />
                </View>
                {!!review.comment && <Text style={styles.comment}>{review.comment}</Text>}
              </View>
            ))
          )}
        </>
      )}

      <Modal
        visible={formOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => !saving && setFormOpen(false)}
      >
        {/* Centered card that lifts with the keyboard, so the text and the buttons are never covered
            (Android edge-to-edge does not resize the window for us). */}
        <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
          <ScrollView
            contentContainerStyle={styles.backdropContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{mine ? 'Editar mi reseña' : 'Tu reseña'}</Text>
            <View style={{ alignItems: 'center', marginVertical: spacing.md }}>
              <StarInput value={rating} onChange={setRating} />
            </View>
            <TextInput
              style={styles.input}
              value={comment}
              onChangeText={setComment}
              placeholder="Cuéntanos tu experiencia (opcional)"
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={MAX_COMMENT}
            />
            <Text style={styles.counter}>
              {comment.length}/{MAX_COMMENT}
            </Text>
            <View style={styles.sheetActions}>
              {!!mine && (
                <TouchableOpacity onPress={remove} disabled={saving} style={styles.deleteBtn}>
                  <Text style={styles.deleteText}>Eliminar</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => setFormOpen(false)} disabled={saving} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={save} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
                <Text style={styles.saveText}>{saving ? 'Guardando...' : 'Publicar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.lg },
  title: { fontSize: 15, fontWeight: '500', color: colors.text, marginBottom: spacing.md },
  muted: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  avg: { fontSize: 34, fontWeight: '700', color: colors.text, minWidth: 48 },
  writeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  writeBtnText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  review: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bgSecondary,
  },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  author: { fontSize: 13, fontWeight: '600', color: colors.text },
  date: { fontSize: 11, color: colors.textTertiary, marginTop: 1 },
  comment: { marginTop: 8, fontSize: 13, lineHeight: 19, color: colors.text },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  backdropContent: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  sheet: {
    backgroundColor: colors.bg,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  input: {
    minHeight: 90,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgSecondary,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
  },
  counter: { alignSelf: 'flex-end', marginTop: 4, fontSize: 11, color: colors.textTertiary },
  sheetActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.md },
  deleteBtn: { paddingVertical: 12, paddingHorizontal: 6 },
  deleteText: { color: colors.danger, fontSize: 14, fontWeight: '500' },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 12 },
  cancelText: { color: colors.textSecondary, fontSize: 14 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 22 },
  saveText: { color: colors.white, fontSize: 14, fontWeight: '600' },
});
