import { supabase } from './client';

export const getProfile = async (userId) => {
  if (!userId) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data || null;
};

export const upsertProfile = async ({ id, role, name } = {}) => {
  if (!id) return null;
  const payload = { id };
  if (role) payload.role = role;
  if (name) payload.name = name;
  const { data, error } = await supabase.from('profiles').upsert(payload).select('*').single();
  if (error) throw error;
  return data;
};

