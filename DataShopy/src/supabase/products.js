import { supabase } from './client';

export const PRODUCT_COLUMNS = 'id,store_id,name,description,price,compare_at_price,image_url,is_pack,pack_items,is_active,created_at';
export const MAX_PRODUCTS = 30;

// "$12.990" (punto como separador de miles); los decimales sólo si existen.
// Se hace a mano para no depender del soporte de Intl en el dispositivo.
export const formatPrice = (value) => {
  const n = Number(value);
  if (value == null || value === '' || !Number.isFinite(n)) return '';
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0 ? '-' : ''}$${grouped}${dec !== '00' ? `,${dec}` : ''}`;
};

// Acepta lo que escribe un dueño: "12990", "12.990", "$12.990", "12990,50".
// Devuelve null si está vacío o no es un número válido.
export const parsePrice = (text) => {
  const raw = String(text ?? '').replace(/[$\s]/g, '');
  if (!raw) return null;
  let normalized = raw;
  if (raw.includes(',')) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
    normalized = raw.replace(/\./g, '');
  }
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

// Porcentaje de descuento entero si el precio anterior es mayor, si no null.
export const discountPercent = (price, compareAt) => {
  const p = Number(price);
  const c = Number(compareAt);
  if (!Number.isFinite(p) || !Number.isFinite(c) || c <= 0 || p >= c) return null;
  return Math.round(((c - p) / c) * 100);
};

export const fetchStoreProducts = async (storeId, { includeHidden = false } = {}) => {
  let query = supabase.from('products').select(PRODUCT_COLUMNS).eq('store_id', storeId);
  if (!includeHidden) query = query.eq('is_active', true);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(MAX_PRODUCTS);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};
