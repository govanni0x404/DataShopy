// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });

const safeText = (value: unknown) => {
  const text = String(value ?? '').trim();
  return text || null;
};

// Best-effort push notification via Expo's push service. Never throws —
// a notification failing to send should never fail the underlying action
// (approving/rejecting a claim still has to succeed either way).
const sendExpoPush = async (pushToken: string | null | undefined, title: string, bodyText: string) => {
  if (!pushToken) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: pushToken, title, body: bodyText, sound: 'default' }),
    });
  } catch (error) {
    console.warn('sendExpoPush failed', error);
  }
};

const normalizeStorePayload = (raw: Record<string, unknown> = {}) => ({
  name: safeText(raw.name),
  category: safeText(raw.category) || 'Local',
  description: safeText(raw.description),
  address: safeText(raw.address),
  phone: safeText(raw.phone),
  schedule_weekday: safeText(raw.schedule_weekday),
  schedule_weekend: safeText(raw.schedule_weekend),
  emoji: safeText(raw.emoji) || '🏪',
  banner_color: safeText(raw.banner_color) || '#EEEDFE',
  city: safeText(raw.city),
  country: safeText(raw.country),
  lat: raw.lat == null || raw.lat === '' ? null : Number(raw.lat),
  lng: raw.lng == null || raw.lng === '' ? null : Number(raw.lng),
  claim_code: safeText(raw.claim_code)?.toUpperCase() || null,
  ...(raw.keywords !== undefined ? { keywords: safeText(raw.keywords) } : {}),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') return json(200, { ok: true });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json(500, { success: false, error: 'Configuración faltante.' });
    }

    const authHeader = req.headers.get('Authorization') || '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user?.id) {
      return json(401, { success: false, error: 'No autenticado.' });
    }

    const service = createClient(supabaseUrl, serviceRoleKey);

    const adminProfile = await service.from('profiles').select('role').eq('id', authData.user.id).maybeSingle();
    if (adminProfile.error) throw adminProfile.error;
    if (adminProfile.data?.role !== 'admin') {
      return json(403, { success: false, error: 'No autorizado.' });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '').trim();

    if (action === 'listStores') {
      const q = safeText(body?.query)?.toLowerCase() || '';
      const { data, error } = await service
        .from('stores')
        .select('id,name,category,address,city,country,emoji,schedule_weekday,schedule_weekend,phone,claim_code,claimed,owner_id,source,keywords')
        .order('name', { ascending: true })
        .limit(300);
      if (error) throw error;
      const stores = (data || []).filter((item) => {
        if (!q) return true;
        return `${item.name || ''} ${item.city || ''} ${item.address || ''}`.toLowerCase().includes(q);
      });
      return json(200, { success: true, stores });
    }

    if (action === 'upsertStore') {
      const storeId = body?.storeId ? Number(body.storeId) : null;
      const payload = normalizeStorePayload(body?.store || {});
      if (!payload.name) return json(400, { success: false, error: 'El nombre es obligatorio.' });

      if (storeId) {
        const { data, error } = await service
          .from('stores')
          .update(payload)
          .eq('id', storeId)
          .select('id,name,claim_code,claimed')
          .single();
        if (error) throw error;
        return json(200, { success: true, store: data });
      }

      const { data, error } = await service
        .from('stores')
        .insert({
          ...payload,
          source: 'admin',
          claimed: false,
          owner_id: null,
        })
        .select('id,name,claim_code,claimed')
        .single();
      if (error) throw error;
      return json(200, { success: true, store: data });
    }

    if (action === 'assignClaimCode') {
      const storeId = Number(body?.storeId);
      const claimCode = safeText(body?.claimCode)?.toUpperCase() || null;
      if (!storeId || !claimCode) {
        return json(400, { success: false, error: 'Datos inválidos para asignar código.' });
      }
      const { data, error } = await service
        .from('stores')
        .update({ claim_code: claimCode })
        .eq('id', storeId)
        .select('id,name,claim_code')
        .single();
      if (error) throw error;
      return json(200, { success: true, store: data });
    }

    if (action === 'deleteStore') {
      const storeId = Number(body?.storeId);
      if (!storeId) return json(400, { success: false, error: 'Local inválido.' });

      const store = await service.from('stores').select('id,claimed,owner_id').eq('id', storeId).maybeSingle();
      if (store.error) throw store.error;
      if (!store.data?.id) return json(404, { success: false, error: 'Local no encontrado.' });
      if (store.data.claimed || store.data.owner_id) {
        return json(409, { success: false, error: 'No se puede eliminar un local reclamado.' });
      }

      const deleted = await service.from('stores').delete().eq('id', storeId).select('id').single();
      if (deleted.error) throw deleted.error;
      return json(200, { success: true });
    }

    if (action === 'importStores') {
      const stores = Array.isArray(body?.stores) ? body.stores : [];
      let inserted = 0;
      let updated = 0;
      let skipped = 0;

      for (const raw of stores) {
        const payload = normalizeStorePayload(raw || {});
        if (!payload.name) {
          skipped += 1;
          continue;
        }

        const existing = await service
          .from('stores')
          .select('id')
          .eq('name', payload.name)
          .eq('address', payload.address)
          .eq('city', payload.city)
          .limit(1)
          .maybeSingle();
        if (existing.error) throw existing.error;

        if (existing.data?.id) {
          const up = await service.from('stores').update(payload).eq('id', existing.data.id);
          if (up.error) throw up.error;
          updated += 1;
        } else {
          const ins = await service.from('stores').insert({
            ...payload,
            source: 'admin',
            claimed: false,
            owner_id: null,
          });
          if (ins.error) throw ins.error;
          inserted += 1;
        }
      }

      return json(200, { success: true, inserted, updated, skipped });
    }

    if (action === 'listUsers') {
      const q = safeText(body?.query)?.toLowerCase() || '';
      const { data, error } = await service
        .from('profiles')
        .select('id,name,email,role,created_at')
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      const users = (data || []).filter((u) => {
        if (!q) return true;
        return `${u.name || ''} ${u.email || ''}`.toLowerCase().includes(q);
      });
      return json(200, { success: true, users });
    }

    if (action === 'setUserRole') {
      const userId = safeText(body?.userId);
      const role = safeText(body?.role);
      if (!userId || !['customer', 'owner'].includes(role || '')) {
        return json(400, { success: false, error: 'Datos inválidos.' });
      }

      if (role === 'customer') {
        const owned = await service.from('stores').select('id').eq('owner_id', userId).limit(1).maybeSingle();
        if (owned.error) throw owned.error;
        if (owned.data?.id) {
          return json(409, {
            success: false,
            error: 'Este usuario tiene una tienda asociada. Reasígnala o elimínala antes de quitarle el rol de dueño.',
          });
        }
      }

      const { data, error } = await service
        .from('profiles')
        .update({ role })
        .eq('id', userId)
        .select('id,name,email,role')
        .single();
      if (error) throw error;
      return json(200, { success: true, profile: data });
    }

    if (action === 'listClaims') {
      const { data, error } = await service
        .from('claims')
        .select('id,store_id,owner_id,status,message,created_at,stores(id,name,address,city,country)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      const ownerIds = [...new Set((data || []).map((item) => item.owner_id).filter(Boolean))];
      const profileMap = new Map();
      if (ownerIds.length) {
        const profiles = await service.from('profiles').select('id,name,email').in('id', ownerIds);
        if (profiles.error) throw profiles.error;
        for (const profile of profiles.data || []) profileMap.set(profile.id, profile);
      }

      const claims = (data || []).map((claim) => ({
        claim_id: claim.id,
        store_id: claim.store_id,
        store_name: claim.stores?.name || 'Local',
        store_address: claim.stores?.address || '',
        store_city: claim.stores?.city || '',
        store_country: claim.stores?.country || '',
        owner_id: claim.owner_id,
        owner_name: profileMap.get(claim.owner_id)?.name || 'Dueño',
        owner_email: profileMap.get(claim.owner_id)?.email || '',
        message: claim.message,
        created_at: claim.created_at,
      }));

      return json(200, { success: true, claims });
    }

    if (action === 'reviewClaim') {
      const claimId = Number(body?.claimId);
      const decision = String(body?.decision || '').trim();
      if (!claimId || !['approve', 'reject'].includes(decision)) {
        return json(400, { success: false, error: 'Solicitud inválida.' });
      }

      const claim = await service.from('claims').select('id,store_id,owner_id,status').eq('id', claimId).maybeSingle();
      if (claim.error) throw claim.error;
      if (!claim.data?.id) return json(404, { success: false, error: 'Reclamo no encontrado.' });
      if (claim.data.status !== 'pending') return json(409, { success: false, error: 'El reclamo ya fue resuelto.' });

      const ownerProfile = await service.from('profiles').select('push_token').eq('id', claim.data.owner_id).maybeSingle();
      const ownerPushToken = ownerProfile.data?.push_token || null;

      const now = new Date().toISOString();

      if (decision === 'reject') {
        const rejected = await service
          .from('claims')
          .update({ status: 'rejected', decided_at: now })
          .eq('id', claimId)
          .select('id')
          .single();
        if (rejected.error) throw rejected.error;
        await sendExpoPush(ownerPushToken, 'Reclamo rechazado', 'Tu solicitud para reclamar un negocio fue rechazada.');
        return json(200, { success: true });
      }

      const owned = await service.from('stores').select('id').eq('owner_id', claim.data.owner_id).limit(1).maybeSingle();
      if (owned.error) throw owned.error;
      if (owned.data?.id) return json(409, { success: false, error: 'Ese dueño ya tiene una tienda.' });

      const store = await service.from('stores').select('id,owner_id,claimed').eq('id', claim.data.store_id).maybeSingle();
      if (store.error) throw store.error;
      if (!store.data?.id) return json(404, { success: false, error: 'Local no encontrado.' });
      if (store.data.owner_id || store.data.claimed) {
        return json(409, { success: false, error: 'Ese local ya fue reclamado.' });
      }

      const approvedStore = await service
        .from('stores')
        .update({ owner_id: claim.data.owner_id, claimed: true, claimed_at: now, claim_code: null })
        .eq('id', claim.data.store_id)
        .select('id')
        .single();
      if (approvedStore.error) throw approvedStore.error;

      const approvedClaim = await service
        .from('claims')
        .update({ status: 'approved', decided_at: now })
        .eq('id', claimId)
        .select('id')
        .single();
      if (approvedClaim.error) throw approvedClaim.error;

      await service
        .from('claims')
        .update({ status: 'rejected', decided_at: now })
        .eq('store_id', claim.data.store_id)
        .eq('status', 'pending')
        .neq('id', claimId);

      const approvedStoreName = await service.from('stores').select('name').eq('id', claim.data.store_id).maybeSingle();
      await sendExpoPush(
        ownerPushToken,
        '¡Reclamo aprobado!',
        `Ya eres dueño verificado de "${approvedStoreName.data?.name || 'tu negocio'}". Entra a administrarlo.`
      );

      return json(200, { success: true });
    }

    return json(400, { success: false, error: 'Acción no soportada.' });
  } catch (error) {
    return json(500, { success: false, error: error instanceof Error ? error.message : 'Error interno.' });
  }
});
