import { supabase } from './client';
import {
  getAppMeta,
  getFavoriteStoreIds,
  getStoreByExternalId,
  getSupabaseStoreId,
  setAppMeta,
  setFavoriteStore,
} from '../database/db';

// Favorites are cached in the phone's SQLite (instant, works offline) and
// mirrored to the `favorites` table in Supabase so they survive a reinstall /
// new device and so the server knows who to notify about a store's new promos.
// Guests (no Supabase account) stay local-only.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isRemoteUser = (userId) => UUID_RE.test(String(userId || ''));

// Write-through after the user (un)favorites a store. Best effort: on failure
// the local state stays and the next syncFavorites() reconciles.
export const pushFavoriteChange = async (userId, localStoreId, isFavorite) => {
  if (!isRemoteUser(userId)) return;
  const storeId = getSupabaseStoreId(localStoreId);
  if (!storeId) return;
  try {
    if (isFavorite) {
      const { error } = await supabase
        .from('favorites')
        .upsert({ user_id: userId, store_id: storeId }, { onConflict: 'user_id,store_id', ignoreDuplicates: true });
      if (error) throw error;
    } else {
      const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('store_id', storeId);
      if (error) throw error;
    }
  } catch (e) {
    console.warn('[favorites] remote update failed', e);
  }
};

// Reconciles the local cache with the server.
//  - First sync for this user on this device: union of both (migrates the
//    favorites that only existed in this phone's SQLite up to the server).
//  - Later syncs: the server is the source of truth, so a favorite removed
//    from another device disappears here too.
export const syncFavorites = async (userId) => {
  if (!isRemoteUser(userId)) return { ok: false, reason: 'not-remote-user' };
  try {
    const { data, error } = await supabase.from('favorites').select('store_id').eq('user_id', userId).limit(1000);
    if (error) throw error;
    const remoteIds = new Set((data || []).map((row) => Number(row.store_id)));

    const syncedKey = `favorites_synced:${userId}`;
    const firstSync = !getAppMeta(syncedKey);

    const local = getFavoriteStoreIds(userId).map((localId) => ({ localId, supaId: getSupabaseStoreId(localId) }));
    const localSupaIds = new Set(local.filter((f) => f.supaId).map((f) => f.supaId));

    // Server -> phone: favorites we don't have locally (if the store is cached).
    for (const supaId of remoteIds) {
      if (localSupaIds.has(supaId)) continue;
      const store = getStoreByExternalId(`sb:store/${supaId}`);
      if (store?.id) setFavoriteStore(userId, store.id, true);
    }

    // Phone -> server (first sync) or removed elsewhere (later syncs).
    const localOnly = local.filter((f) => f.supaId && !remoteIds.has(f.supaId));
    if (firstSync) {
      if (localOnly.length) {
        const rows = localOnly.map((f) => ({ user_id: userId, store_id: f.supaId }));
        const { error: upsertError } = await supabase
          .from('favorites')
          .upsert(rows, { onConflict: 'user_id,store_id', ignoreDuplicates: true });
        if (upsertError) throw upsertError;
      }
    } else {
      for (const f of localOnly) setFavoriteStore(userId, f.localId, false);
    }

    setAppMeta(syncedKey, new Date().toISOString());
    return { ok: true };
  } catch (e) {
    console.warn('[favorites] sync failed', e);
    return { ok: false, reason: 'error' };
  }
};
