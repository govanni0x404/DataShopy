import { supabase } from './client';

// #region debug-point A-E:image-upload-network
const __dbgUpload = (hypothesisId, msg, data = {}) =>
  fetch('http://192.168.100.168:7777/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'image-upload-network',
      runId: 'pre-fix',
      hypothesisId,
      location: 'src/supabase/storage.js',
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {});
// #endregion

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
  // #region debug-point A:local-read-start
  __dbgUpload('A', 'uploadStoreImage start', {
    ownerId: String(ownerId),
    storeId: String(storeId),
    kind,
    uri: String(asset?.uri || ''),
    mimeType: asset?.mimeType || null,
    fileName: asset?.fileName || null,
    filePath,
    bucket,
  });
  // #endregion

  let response;
  try {
    response = await fetch(asset.uri);
    // #region debug-point A:local-read-response
    __dbgUpload('A', 'local fetch response received', {
      ok: !!response?.ok,
      status: response?.status ?? null,
      uri: String(asset?.uri || ''),
    });
    // #endregion
  } catch (error) {
    // #region debug-point A:local-read-error
    __dbgUpload('A', 'local fetch failed', {
      uri: String(asset?.uri || ''),
      error: error?.message || String(error),
    });
    // #endregion
    throw error;
  }

  let blob;
  try {
    blob = await response.blob();
    // #region debug-point A:blob-created
    __dbgUpload('A', 'blob created from local asset', {
      type: blob?.type || null,
      size: typeof blob?.size === 'number' ? blob.size : null,
    });
    // #endregion
  } catch (error) {
    // #region debug-point A:blob-error
    __dbgUpload('A', 'blob creation failed', {
      uri: String(asset?.uri || ''),
      error: error?.message || String(error),
    });
    // #endregion
    throw error;
  }

  const contentType = asset.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  // #region debug-point B-E:storage-upload-start
  __dbgUpload('B', 'storage upload start', {
    filePath,
    bucket,
    contentType,
    blobSize: typeof blob?.size === 'number' ? blob.size : null,
  });
  // #endregion
  const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, blob, {
    contentType,
    upsert: true,
  });
  // #region debug-point B-E:storage-upload-result
  __dbgUpload(uploadError ? 'B' : 'E', 'storage upload result', {
    ok: !uploadError,
    error: uploadError?.message || null,
    name: uploadError?.name || null,
    statusCode: uploadError?.statusCode || null,
    bucket,
    filePath,
  });
  // #endregion
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  // #region debug-point B:public-url
  __dbgUpload('B', 'public url generated', {
    filePath,
    hasUrl: !!data?.publicUrl,
  });
  // #endregion
  return data?.publicUrl || null;
};
