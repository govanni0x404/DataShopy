import { supabase } from './client';

const guessExtension = (asset) => {
  const name = String(asset?.fileName || asset?.uri || '');
  const match = name.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return (match?.[1] || 'jpg').toLowerCase();
};

export const uploadStoreImage = async ({ ownerId, storeId, asset, kind = 'gallery' }) => {
  if (!ownerId || !storeId || !asset?.uri) throw new Error('Faltan datos para subir la imagen.');

  const ext = guessExtension(asset);
  const filePath = `${ownerId}/${storeId}/${kind}-${Date.now()}.${ext}`;
  const bucket = 'store-media';

  const response = await fetch(asset.uri);
  const blob = await response.blob();

  const contentType = asset.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, blob, {
    contentType,
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data?.publicUrl || null;
};
