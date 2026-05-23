import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

const extra = Constants?.expoConfig?.extra || Constants?.manifest?.extra || {};
const supabaseUrl = extra.supabaseUrl;
const supabaseAnonKey = extra.supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

