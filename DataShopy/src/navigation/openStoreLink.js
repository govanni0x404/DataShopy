import { supabase } from '../supabase/client';
import { getStoreByExternalId, importCatalogStores } from '../database/db';

const COLUMNS =
  'id,name,category,description,address,phone,schedule_weekday,schedule_weekend,emoji,banner_color,city,country,lat,lng,source,claimed,claimed_at,keywords';

// Opens a store (by Supabase id) inside the client app. Caches the store locally first, because
// the screens read from SQLite. Returns true when the screen was opened.
export const openStoreFromLink = async (navigationRef, supabaseStoreId, userId) => {
  const { data, error } = await supabase.from('stores').select(COLUMNS).eq('id', supabaseStoreId).maybeSingle();
  if (error) throw error;
  if (!data?.id) return false;

  importCatalogStores({
    stores: [{ ...data, external_id: `sb:store/${data.id}`, claimed: data.claimed ? 1 : 0 }],
    source: 'supabase',
  });
  const local = getStoreByExternalId(`sb:store/${data.id}`);
  if (!local?.id) return false;

  navigationRef.navigate('ClientApp', {
    screen: 'Home',
    params: { screen: 'StoreDetail', params: { storeId: local.id, userId: userId || null } },
  });
  return true;
};
