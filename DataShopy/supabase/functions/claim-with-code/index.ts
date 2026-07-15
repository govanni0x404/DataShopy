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

serve(async (req) => {
  if (req.method === 'OPTIONS') return json(200, { ok: true });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json(500, { success: false, error: 'Configuración faltante en Supabase.' });
    }

    const authHeader = req.headers.get('Authorization') || '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user?.id) {
      return json(401, { success: false, error: 'No autenticado.' });
    }

    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || '')
      .trim()
      .toUpperCase();
    if (!code) return json(400, { success: false, error: 'Código requerido.' });

    const service = createClient(supabaseUrl, serviceRoleKey);

    const profile = await service.from('profiles').select('role').eq('id', authData.user.id).maybeSingle();
    if (profile.error) throw profile.error;
    if (profile.data?.role !== 'owner') {
      return json(403, { success: false, error: 'No autorizado.' });
    }

    const existing = await service.from('stores').select('id').eq('owner_id', authData.user.id).limit(1).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data?.id) {
      return json(409, { success: false, error: 'Ya tienes una tienda asociada.' });
    }

    const store = await service
      .from('stores')
      .select('id, claimed, owner_id')
      .eq('claim_code', code)
      .limit(1)
      .maybeSingle();
    if (store.error) throw store.error;
    if (!store.data?.id) {
      return json(404, { success: false, error: 'Código inválido.' });
    }
    if (store.data.claimed || store.data.owner_id) {
      return json(409, { success: false, error: 'Este local ya fue reclamado.' });
    }

    const now = new Date().toISOString();
    const updated = await service
      .from('stores')
      .update({
        owner_id: authData.user.id,
        claimed: true,
        claimed_at: now,
        claim_code: null,
      })
      .eq('id', store.data.id)
      .eq('claimed', false)
      .is('owner_id', null)
      .select('id,name')
      .maybeSingle();

    if (updated.error) throw updated.error;
    if (!updated.data?.id) {
      return json(409, { success: false, error: 'No se pudo completar el reclamo.' });
    }

    await service
      .from('claims')
      .update({ status: 'approved', decided_at: now })
      .eq('store_id', updated.data.id)
      .eq('owner_id', authData.user.id)
      .eq('status', 'pending');

    return json(200, { success: true, storeId: updated.data.id, storeName: updated.data.name });
  } catch (error) {
    return json(500, { success: false, error: error instanceof Error ? error.message : 'Error interno.' });
  }
});
