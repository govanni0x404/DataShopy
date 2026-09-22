import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { supabase } from './client';

// Resize/compress before upload so a raw 4000px phone photo doesn't turn
// into a multi-MB Storage object and a slow load on every store card/detail
// screen. Logos are small and square; covers/gallery photos are wider.
const MAX_WIDTH_BY_KIND = { logo: 600, cover: 1600, gallery: 1600 };

const guessExtension = (asset) => {
  const name = String(asset?.fileName || asset?.uri || '');
  const match = name.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return (match?.[1] || 'jpg').toLowerCase();
};

export const uploadStoreImage = async ({ ownerId, storeId, asset, kind = 'gallery' }) => {
  if (!ownerId || !storeId || !asset?.uri) throw new Error('Faltan datos para subir la imagen.');

  const maxWidth = MAX_WIDTH_BY_KIND[kind] || MAX_WIDTH_BY_KIND.gallery;
  const originalWidth = Number(asset?.width) || null;
  const resizeAction = originalWidth && originalWidth > maxWidth ? [{ resize: { width: maxWidth } }] : [];

  let uploadUri = asset.uri;
  let contentType = asset.mimeType || `image/${guessExtension(asset) === 'jpg' ? 'jpeg' : guessExtension(asset)}`;
  let ext = guessExtension(asset);
  try {
    const manipulated = await manipulateAsync(asset.uri, resizeAction, {
      compress: 0.75,
      format: SaveFormat.JPEG,
    });
    uploadUri = manipulated.uri;
    contentType = 'image/jpeg';
    ext = 'jpg';
  } catch (e) {
    console.warn('[storage] image resize/compress failed, uploading original', e);
  }

  const filePath = `${ownerId}/${storeId}/${kind}-${Date.now()}.${ext}`;
  const bucket = 'store-media';

  const response = await fetch(uploadUri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, blob, {
    contentType,
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data?.publicUrl || null;
};
