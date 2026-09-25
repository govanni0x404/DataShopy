import { supabase } from './client';
import { getAppMeta, getFavoriteStores, getSupabaseStoreId, setAppMeta } from '../database/db';
import { activePromoFilter } from './promos';
import { isRemoteUser } from './favorites';

// In-app "you have news" indicator (tab badge + bell dot): counts active promos of the
// user's favorite stores published after the last time they opened Alertas. It works
// without push notifications, which need Firebase on Android.

const seenKey = (userId) => `news_seen_at:${userId}`;

let lastCount = 0;
const listeners = new Set();

export const getNewsCount = () => lastCount;

export const subscribeNewsCount = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const publish = (count) => {
  lastCount = count;
  listeners.forEach((listener) => listener(count));
};

// Recomputes the counter. The first time (no "seen" mark yet) it starts from now, so a
// fresh install doesn't show every old promo as news.
export const refreshNewsCount = async (userId) => {
  if (!isRemoteUser(userId)) {
    publish(0);
    return 0;
  }
  try {
    let seenAt = getAppMeta(seenKey(userId));
    if (!seenAt) {
      seenAt = new Date().toISOString();
      setAppMeta(seenKey(userId), seenAt);
    }

    const ids = getFavoriteStores(userId)
      .map((store) => getSupabaseStoreId(store.id))
      .filter(Boolean);
    if (!ids.length) {
      publish(0);
      return 0;
    }

    const { count, error } = await supabase
      .from('promotions')
      .select('id', { count: 'exact', head: true })
      .in('store_id', ids)
      .eq('is_active', true)
      .or(activePromoFilter())
      .gt('created_at', seenAt);
    if (error) throw error;
    publish(count || 0);
    return count || 0;
  } catch (e) {
    console.warn('[newsBadge] refresh failed', e);
    return lastCount;
  }
};

// Called when the user opens Alertas: everything up to now counts as seen.
export const markNewsSeen = (userId) => {
  if (!isRemoteUser(userId)) return;
  setAppMeta(seenKey(userId), new Date().toISOString());
  publish(0);
};
