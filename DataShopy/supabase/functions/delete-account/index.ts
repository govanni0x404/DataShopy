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

// Deletes the CALLER's own account (Google Play requires in-app account
// deletion). favorites, reviews, claims and profile go away via ON DELETE
// CASCADE; tracking_events keep only anonymous counts (user_id -> null).
// Stores the user owned are released so they can be claimed again.
serve(async (req) => {
  if (req.method === 'OPTIONS') return json(200, { ok: true });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json(500, { success: false, error: 'Configuración faltante en Supabase.' });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user?.id) return json(401, { success: false, error: 'No autenticado.' });
    const userId = authData.user.id;

    const service = createClient(supabaseUrl, serviceRoleKey);

    const profile = await service.from('profiles').select('role').eq('id', userId).maybeSingle();
    if (profile.error) throw profile.error;
    if (profile.data?.role === 'admin') {
      return json(403, { success: false, error: 'Las cuentas admin no se pueden eliminar desde la app.' });
    }

    const released = await service
      .from('stores')
      .update({ owner_id: null, claimed: false, claimed_at: null })
      .eq('owner_id', userId);
    if (released.error) throw released.error;

    const removed = await service.auth.admin.deleteUser(userId);
    if (removed.error) throw removed.error;

    return json(200, { success: true });
  } catch (error) {
    return json(500, { success: false, error: error instanceof Error ? error.message : 'Error interno.' });
  }
});
