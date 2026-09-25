import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LoadingOverlay from '../../components/LoadingOverlay';
import { Stars } from '../../components/StarRating';
import { colors, radius, spacing } from '../../constants/theme';
import { supabase } from '../../supabase/client';

const MAX_REPLY = 500;

const formatDate = (iso) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Owner view of the reviews of their store, with the ability to publish, edit or remove one public
// reply per review. The database (RLS + trigger) only lets the store's owner touch the reply column.
export default function OwnerReviewsScreen({ navigation, route }) {
  const owner = route.params?.owner;
  const [reviews, setReviews] = useState([]);
  const [hasStore, setHasStore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onlyPending, setOnlyPending] = useState(false);

  const [target, setTarget] = useState(null); // review being answered
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!owner?.id) return;
    try {
      const { data: store, error: storeErr } = await supabase.from('stores').select('id').eq('owner_id', owner.id).limit(1).maybeSingle();
      if (storeErr) throw storeErr;
      if (!store?.id) {
        setHasStore(false);
        setReviews([]);
        return;
      }
      setHasStore(true);
      const { data, error } = await supabase
        .from('reviews')
        .select('id,rating,comment,author_name,created_at,owner_reply,owner_reply_at')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setReviews(data || []);
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudieron cargar las reseñas.');
    }
  }, [owner?.id]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const pendingCount = useMemo(() => reviews.filter((r) => !r.owner_reply).length, [reviews]);
  const visible = useMemo(() => (onlyPending ? reviews.filter((r) => !r.owner_reply) : reviews), [reviews, onlyPending]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openReply = (review) => {
    setTarget(review);
    setText(review.owner_reply || '');
  };

  // review: the row to update; value: reply text, or null to remove the reply.
  const saveReply = async (review, value) => {
    if (!review) return;
    setSaving(true);
    try {
      const reply = value === null ? null : value.trim();
      if (value !== null && !reply) {
        Alert.alert('Escribe una respuesta', 'La respuesta no puede estar vacía.');
        return;
      }
      const { data, error } = await supabase.from('reviews').update({ owner_reply: reply }).eq('id', review.id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('No tienes permiso para responder esta reseña.');
      setTarget(null);
      await load();
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo guardar la respuesta.');
    } finally {
      setSaving(false);
    }
  };

  const removeReply = (review) => {
    Alert.alert('Eliminar respuesta', '¿Quieres eliminar tu respuesta a esta reseña?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => saveReply(review, null) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reseñas</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.filters}>
        <TouchableOpacity style={[styles.chip, !onlyPending && styles.chipActive]} onPress={() => setOnlyPending(false)}>
          <Text style={[styles.chipText, !onlyPending && styles.chipTextActive]}>Todas ({reviews.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.chip, onlyPending && styles.chipActive]} onPress={() => setOnlyPending(true)}>
          <Text style={[styles.chipText, onlyPending && styles.chipTextActive]}>Sin responder ({pendingCount})</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={onRefresh}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.top}>
              <View style={{ flex: 1 }}>
                <Text style={styles.author} numberOfLines={1}>
                  {item.author_name}
                </Text>
                <Text style={styles.date}>{formatDate(item.created_at)}</Text>
              </View>
              <Stars value={item.rating} size={14} />
            </View>
            {!!item.comment && <Text style={styles.comment}>{item.comment}</Text>}

            {item.owner_reply ? (
              <View style={styles.reply}>
                <Text style={styles.replyLabel}>Tu respuesta</Text>
                <Text style={styles.replyText}>{item.owner_reply}</Text>
                <View style={styles.replyActions}>
                  <TouchableOpacity onPress={() => openReply(item)}>
                    <Text style={styles.link}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeReply(item)}>
                    <Text style={[styles.link, { color: colors.danger }]}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.replyBtn} onPress={() => openReply(item)} activeOpacity={0.85}>
                <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.white} />
                <Text style={styles.replyBtnText}>Responder</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {!hasStore ? 'Aún no tienes un local' : onlyPending ? 'No tienes reseñas sin responder' : 'Aún no hay reseñas'}
              </Text>
              <Text style={styles.emptyDesc}>
                {!hasStore
                  ? 'Reclama tu negocio para recibir reseñas.'
                  : 'Cuando un cliente califique tu local, podrás responderle desde aquí.'}
              </Text>
            </View>
          )
        }
      />

      <Modal visible={!!target} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => !saving && setTarget(null)}>
        <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
          <ScrollView contentContainerStyle={styles.backdropContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Responder a {target?.author_name}</Text>
              {!!target?.comment && (
                <Text style={styles.quote} numberOfLines={3}>
                  “{target.comment}”
                </Text>
              )}
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder="Agradece o aclara con respeto. Tu respuesta es pública."
                placeholderTextColor={colors.textTertiary}
                multiline
                maxLength={MAX_REPLY}
              />
              <Text style={styles.counter}>
                {text.length}/{MAX_REPLY}
              </Text>
              <View style={styles.sheetActions}>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => setTarget(null)} disabled={saving} style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => saveReply(target, text)} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
                  <Text style={styles.saveText}>{saving ? 'Guardando...' : 'Publicar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <LoadingOverlay visible={loading || (saving && !target)} label={saving ? 'Guardando...' : 'Cargando reseñas...'} />
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
  author: { fontSize: 14, fontWeight: '600', color: colors.text },
  date: { fontSize: 11, color: colors.textTertiary, marginTop: 1 },
  comment: { marginTop: 8, fontSize: 13, lineHeight: 19, color: colors.text },
  reply: { marginTop: 10, padding: 10, borderRadius: radius.md, backgroundColor: colors.primaryLight },
  replyLabel: { fontSize: 11, fontWeight: '700', color: colors.primary },
  replyText: { marginTop: 4, fontSize: 13, lineHeight: 19, color: colors.text },
  replyActions: { flexDirection: 'row', gap: 18, marginTop: 8 },
  link: { fontSize: 13, fontWeight: '600', color: colors.primary },
  replyBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  replyBtnText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: 15, fontWeight: '500', color: colors.text },
  emptyDesc: { fontSize: 12, color: colors.textTertiary, marginTop: 6, textAlign: 'center', lineHeight: 18 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  backdropContent: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  sheet: { backgroundColor: colors.bg, borderRadius: radius.xl, padding: spacing.lg },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  quote: { marginTop: 8, fontSize: 12, lineHeight: 18, color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center' },
  input: {
    marginTop: spacing.md,
    minHeight: 100,
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
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 12 },
  cancelText: { color: colors.textSecondary, fontSize: 14 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 22 },
  saveText: { color: colors.white, fontSize: 14, fontWeight: '600' },
});
