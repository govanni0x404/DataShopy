// Store deep links. The app scheme opens the app directly; the https page (docs/store.html,
// served by GitHub Pages) is what gets shared, since chat apps don't make custom schemes clickable.
export const APP_SCHEME = 'datashopy';
export const SHARE_BASE_URL = 'https://govanni0x404.github.io/DataShopy';

export const buildStoreShareUrl = (supabaseStoreId) => {
  const id = Number(supabaseStoreId);
  return Number.isInteger(id) && id > 0 ? `${SHARE_BASE_URL}/store.html?id=${id}` : null;
};

export const buildStoreAppUrl = (supabaseStoreId) => `${APP_SCHEME}://store/${Number(supabaseStoreId)}`;

// datashopy://store/12  |  https://.../store.html?id=12  ->  12 (Supabase store id), else null
export const parseStoreLink = (url) => {
  const raw = String(url || '').trim();
  if (!raw) return null;
  const app = raw.match(new RegExp(`^${APP_SCHEME}://store/(\\d+)(?:[/?#].*)?$`, 'i'));
  const web = raw.match(/^https?:\/\/[^/]+\/(?:[^?#]*\/)?store\.html\?(?:[^#]*&)?id=(\d+)(?:[&#].*)?$/i);
  const id = Number((app || web)?.[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
};
