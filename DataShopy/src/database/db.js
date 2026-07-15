import * as SQLite from 'expo-sqlite';
import { supabase } from '../supabase/client';
 
let db;
 
const getTableColumns = (database, tableName) => {
  const rows = database.getAllSync(`PRAGMA table_info(${tableName})`);
  return new Set(rows.map((r) => r.name));
};

const ensureColumns = (database, tableName, columns) => {
  const existing = getTableColumns(database, tableName);
  for (const col of columns) {
    if (existing.has(col.name)) continue;
    database.execSync(`ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.type}`);
  }
};

const ensureIndexes = (database) => {
  try {
    database.execSync(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_external_id ON stores(external_id) WHERE external_id IS NOT NULL"
    );
  } catch {}
  try {
    database.execSync(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_pending_store ON claims(store_id) WHERE status = 'pending'"
    );
  } catch {}
  try {
    database.execSync(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_promotions_external_id ON promotions(external_id) WHERE external_id IS NOT NULL"
    );
  } catch {}
  try {
    database.execSync(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_favorite_stores_user_store ON favorite_stores(user_id, store_id)"
    );
  } catch {}
};

const ensureSystemOwner = (database) => {
  try {
    database.runSync(
      'INSERT OR IGNORE INTO owners (name, email, password) VALUES (?, ?, ?)',
      ['DataShopy', 'system@datashopy.local', 'system']
    );
  } catch {}
  const owner = database.getFirstSync('SELECT id FROM owners WHERE email = ?', ['system@datashopy.local']);
  return owner?.id || null;
};

// ─── Abrir / crear base de datos ─────────────────────────────────────────────
export const getDB = () => {
  if (!db) db = SQLite.openDatabaseSync('datashopy.db');
  return db;
};
 
// ─── Crear tablas al primer arranque ─────────────────────────────────────────
export const initDB = async () => {
  const database = getDB();
 
  database.execSync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
 
    CREATE TABLE IF NOT EXISTS owners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
 
    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      address TEXT,
      phone TEXT,
      schedule_weekday TEXT,
      schedule_weekend TEXT,
      emoji TEXT DEFAULT '🏪',
      banner_color TEXT DEFAULT '#EEEDFE',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES owners(id)
    );

    CREATE TABLE IF NOT EXISTS tracking_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_name TEXT NOT NULL,
      store_id INTEGER,
      user_id INTEGER,
      owner_id INTEGER,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (store_id) REFERENCES stores(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (owner_id) REFERENCES owners(id)
    );

    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL,
      owner_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      message TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      decided_at TEXT,
      FOREIGN KEY (store_id) REFERENCES stores(id),
      FOREIGN KEY (owner_id) REFERENCES owners(id)
    );
 
    CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      tag TEXT,
      expires_at TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (store_id) REFERENCES stores(id)
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS favorite_stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      store_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS client_preferences (
      user_id TEXT PRIMARY KEY,
      preferred_city TEXT,
      notifications_enabled INTEGER DEFAULT 1,
      promo_alerts INTEGER DEFAULT 1,
      nearby_alerts INTEGER DEFAULT 1,
      marketing_updates INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  ensureColumns(database, 'stores', [
    { name: 'city', type: 'TEXT' },
    { name: 'country', type: 'TEXT' },
    { name: 'lat', type: 'REAL' },
    { name: 'lng', type: 'REAL' },
    { name: 'source', type: 'TEXT' },
    { name: 'external_id', type: 'TEXT' },
    { name: 'claimed', type: 'INTEGER DEFAULT 0' },
    { name: 'claimed_at', type: 'TEXT' },
    { name: 'logo_url', type: 'TEXT' },
    { name: 'cover_image_url', type: 'TEXT' },
    { name: 'gallery_urls', type: 'TEXT' },
  ]);

  ensureColumns(database, 'promotions', [
    { name: 'external_id', type: 'TEXT' },
    { name: 'source', type: 'TEXT' },
  ]);

  const systemOwnerId = ensureSystemOwner(database);
  ensureIndexes(database);

  try {
    database.runSync(
      `UPDATE stores
       SET city='Santiago', country='CL', lat=-33.4256, lng=-70.6172
       WHERE name='La Pizzería' AND (lat IS NULL OR lng IS NULL)`
    );
    database.runSync(
      `UPDATE stores
       SET city='Santiago', country='CL', lat=-33.4172, lng=-70.6070
       WHERE name='StepUp Shoes' AND (lat IS NULL OR lng IS NULL)`
    );
    database.runSync(
      `UPDATE stores
       SET city='Santiago', country='CL', lat=-33.4372, lng=-70.6506
       WHERE name='Café Central' AND (lat IS NULL OR lng IS NULL)`
    );
  } catch {}
 
  // Datos de demo para ver la app funcionando desde el primer inicio
  await seedDemoData(database);

  if (systemOwnerId) {
    try {
      database.runSync(
        "UPDATE stores SET source='local', claimed=1 WHERE source IS NULL AND owner_id != ?",
        [systemOwnerId]
      );
    } catch {}
  }
};

export const getAppMeta = (key) => {
  const db = getDB();
  if (!key) return null;
  const row = db.getFirstSync('SELECT value FROM app_meta WHERE key = ? LIMIT 1', [key]);
  return row?.value ?? null;
};

export const setAppMeta = (key, value) => {
  const db = getDB();
  if (!key) return;
  db.runSync('INSERT OR REPLACE INTO app_meta (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))', [
    key,
    value == null ? null : String(value),
  ]);
};

const hashString = (input) => {
  const str = String(input || '');
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
};

const normalizeKey = (v) => String(v || '').trim().toLowerCase();

export const importCatalogStores = ({ stores = [], source = 'admin' } = {}) => {
  const db = getDB();
  const systemOwnerId = getSystemOwnerId();
  if (!systemOwnerId) return { inserted: 0, updated: 0, skipped: 0 };

  const safeText = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const safeNum = (v) => {
    const n = typeof v === 'number' ? v : v == null ? null : Number(String(v).trim());
    if (n == null) return null;
    if (Number.isNaN(n)) return null;
    return n;
  };

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const raw of Array.isArray(stores) ? stores : []) {
    const name = safeText(raw?.name);
    const category = safeText(raw?.category) || 'Local';
    if (!name) {
      skipped += 1;
      continue;
    }

    const address = safeText(raw?.address);
    const city = safeText(raw?.city);
    const country = safeText(raw?.country);
    const phone = safeText(raw?.phone);
    const scheduleWeekday = safeText(raw?.schedule_weekday);
    const scheduleWeekend = safeText(raw?.schedule_weekend);
    const description = safeText(raw?.description);
    const emoji = safeText(raw?.emoji) || '🏪';
    const bannerColor = safeText(raw?.banner_color) || safeText(raw?.color) || '#EEEDFE';
    const lat = safeNum(raw?.lat);
    const lng = safeNum(raw?.lng);
    const logoUrl = safeText(raw?.logo_url);
    const coverImageUrl = safeText(raw?.cover_image_url);
    const galleryUrls = Array.isArray(raw?.gallery_urls)
      ? JSON.stringify(raw.gallery_urls.filter(Boolean))
      : safeText(raw?.gallery_urls);
    const claimed = raw?.claimed === true || String(raw?.claimed) === '1' || raw?.claimed === 1 ? 1 : 0;
    const claimedAt = safeText(raw?.claimed_at);

    const providedExternalId = safeText(raw?.external_id);
    const key = `${normalizeKey(name)}|${normalizeKey(address)}|${normalizeKey(city)}|${normalizeKey(country)}`;
    const rawSource = safeText(raw?.source) || source;
    const externalId = providedExternalId || `${rawSource}:${hashString(key)}`;

    try {
      const existing = db.getFirstSync('SELECT id FROM stores WHERE external_id = ? LIMIT 1', [externalId]);
      if (!existing) {
        db.runSync(
          `INSERT INTO stores (owner_id, name, category, description, address, phone, schedule_weekday, schedule_weekend, emoji, banner_color, city, country, lat, lng, source, external_id, claimed, logo_url, cover_image_url, gallery_urls)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            systemOwnerId,
            name,
            category,
            description,
            address,
            phone,
            scheduleWeekday,
            scheduleWeekend,
            emoji,
            bannerColor,
            city,
            country,
            lat,
            lng,
            rawSource,
            externalId,
            claimed,
            logoUrl,
            coverImageUrl,
            galleryUrls,
          ]
        );
        inserted += 1;
      } else {
        db.runSync(
          `UPDATE stores
           SET name = COALESCE(?, name),
               category = COALESCE(?, category),
               description = COALESCE(?, description),
               address = COALESCE(?, address),
               phone = COALESCE(?, phone),
               schedule_weekday = COALESCE(?, schedule_weekday),
               schedule_weekend = COALESCE(?, schedule_weekend),
               emoji = COALESCE(?, emoji),
               banner_color = COALESCE(?, banner_color),
               city = COALESCE(?, city),
               country = COALESCE(?, country),
               lat = COALESCE(?, lat),
               lng = COALESCE(?, lng),
               logo_url = COALESCE(?, logo_url),
               cover_image_url = COALESCE(?, cover_image_url),
               gallery_urls = COALESCE(?, gallery_urls),
               claimed = COALESCE(?, claimed),
               claimed_at = COALESCE(?, claimed_at),
               source = COALESCE(source, ?),
               external_id = COALESCE(external_id, ?)
           WHERE id = ?`,
          [
            name,
            category,
            description,
            address,
            phone,
            scheduleWeekday,
            scheduleWeekend,
            emoji,
            bannerColor,
            city,
            country,
            lat,
            lng,
            logoUrl,
            coverImageUrl,
            galleryUrls,
            claimed,
            claimedAt,
            rawSource,
            externalId,
            existing.id,
          ]
        );
        updated += 1;
      }
    } catch {
      skipped += 1;
    }
  }

  return { inserted, updated, skipped };
};

export const importCatalogPromos = ({ promos = [], source = 'supabase' } = {}) => {
  const db = getDB();
  const safeText = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const raw of Array.isArray(promos) ? promos : []) {
    const promoId = raw?.id;
    const storeId = raw?.store_id ?? raw?.storeId ?? null;
    const title = safeText(raw?.title);
    if (!promoId || !storeId || !title) {
      skipped += 1;
      continue;
    }

    const storeExternalId = `sb:store/${storeId}`;
    const store = db.getFirstSync('SELECT id FROM stores WHERE external_id = ? LIMIT 1', [storeExternalId]);
    if (!store?.id) {
      skipped += 1;
      continue;
    }

    const externalId = safeText(raw?.external_id) || `sb:promo/${promoId}`;
    const description = safeText(raw?.description);
    const tag = safeText(raw?.tag);
    const expiresAt = safeText(raw?.expires_at);
    const isActive = raw?.is_active === false || raw?.is_active === 0 || String(raw?.is_active) === '0' ? 0 : 1;
    const rawSource = safeText(raw?.source) || source;

    try {
      const existing = db.getFirstSync('SELECT id FROM promotions WHERE external_id = ? LIMIT 1', [externalId]);
      if (!existing) {
        db.runSync(
          'INSERT INTO promotions (store_id, title, description, tag, expires_at, is_active, external_id, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [store.id, title, description, tag, expiresAt, isActive, externalId, rawSource]
        );
        inserted += 1;
      } else {
        db.runSync(
          `UPDATE promotions
           SET store_id = ?,
               title = ?,
               description = ?,
               tag = ?,
               expires_at = ?,
               is_active = ?,
               source = COALESCE(source, ?)
           WHERE id = ?`,
          [store.id, title, description, tag, expiresAt, isActive, rawSource, existing.id]
        );
        updated += 1;
      }
    } catch {
      skipped += 1;
    }
  }

  return { inserted, updated, skipped };
};
 
// ─── Datos de demo ────────────────────────────────────────────────────────────
const seedDemoData = async (database) => {
  const existing = database.getFirstSync('SELECT id FROM stores LIMIT 1');
  if (existing) return; // ya hay datos, no repetir
 
  const ensureOwner = (name, email, password) => {
    try {
      database.runSync('INSERT OR IGNORE INTO owners (name, email, password) VALUES (?, ?, ?)', [name, email, password]);
    } catch {}
    return database.getFirstSync('SELECT id FROM owners WHERE email = ?', [email])?.id || null;
  };

  const carlosId = ensureOwner('Carlos Ruiz', 'carlos@pizzeria.com', 'demo1234');
  const anaId = ensureOwner('Ana Torres', 'ana@stepup.com', 'demo1234');

  if (carlosId) {
    database.runSync(
      `INSERT INTO stores (owner_id, name, category, description, address, phone, schedule_weekday, schedule_weekend, emoji, banner_color, city, country, lat, lng, source, claimed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        carlosId,
        'La Pizzería',
        'Comida italiana',
        'Pizzería artesanal con más de 20 años en el barrio. Masa madre, ingredientes frescos y el mejor horno a leña de Santiago.',
        'Av. Providencia 1520, Santiago',
        '+56 2 2345 6789',
        'Lun–Sáb: 12:00–23:00',
        'Dom: 13:00–21:00',
        '🍕',
        '#EEEDFE',
        'Santiago',
        'CL',
        -33.4256,
        -70.6172,
        'local',
        1,
      ]
    );
    database.runSync(
      `INSERT INTO stores (owner_id, name, category, description, address, phone, schedule_weekday, schedule_weekend, emoji, banner_color, city, country, lat, lng, source, claimed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        carlosId,
        'Café Central',
        'Cafetería',
        'Café de especialidad en el corazón de Santiago. Granos de origen, métodos filtrados y repostería artesanal.',
        'Plaza de Armas 45, Santiago',
        '+56 2 2111 2222',
        'Lun–Vie: 08:00–20:00',
        'Sáb: 09:00–18:00',
        '☕',
        '#FAEEDA',
        'Santiago',
        'CL',
        -33.4372,
        -70.6506,
        'local',
        1,
      ]
    );
  }

  if (anaId) {
    database.runSync(
      `INSERT INTO stores (owner_id, name, category, description, address, phone, schedule_weekday, schedule_weekend, emoji, banner_color, city, country, lat, lng, source, claimed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        anaId,
        'StepUp Shoes',
        'Calzado y moda',
        'Tienda de calzado con las mejores marcas nacionales e importadas.',
        'Mall Costanera Center, L2, Santiago',
        '+56 2 2987 6543',
        'Lun–Sáb: 10:00–20:00',
        'Cerrado domingos',
        '👟',
        '#E1F5EE',
        'Santiago',
        'CL',
        -33.4172,
        -70.607,
        'local',
        1,
      ]
    );
  }

  const pizzeria = database.getFirstSync("SELECT id FROM stores WHERE name = 'La Pizzería' LIMIT 1")?.id || null;
  const stepup = database.getFirstSync("SELECT id FROM stores WHERE name = 'StepUp Shoes' LIMIT 1")?.id || null;
  const cafe = database.getFirstSync("SELECT id FROM stores WHERE name = 'Café Central' LIMIT 1")?.id || null;

  if (pizzeria) {
    database.runSync(
      'INSERT INTO promotions (store_id, title, description, tag, expires_at) VALUES (?, ?, ?, ?, date(\'now\'))',
      [pizzeria, '2x1 en pizza familiar', 'Pide 2 pizzas familiares y paga solo una. Válido en todo el menú.', '🔥 Solo hoy']
    );
    database.runSync(
      'INSERT INTO promotions (store_id, title, description, tag, expires_at) VALUES (?, ?, ?, ?, date(\'now\', \'+3 days\'))',
      [
        pizzeria,
        'Postre gratis sobre $15.000',
        'En pedidos superiores a $15.000 te regalamos un tiramisú casero.',
        '🎉 Especial semana',
      ]
    );
    database.runSync(
      'INSERT INTO promotions (store_id, title, description, tag, expires_at) VALUES (?, ?, ?, ?, date(\'now\'))',
      [pizzeria, 'Envío gratis primera compra', 'Primer pedido por la app con delivery sin costo.', '🚚 Delivery']
    );
  }
  if (stepup) {
    database.runSync(
      'INSERT INTO promotions (store_id, title, description, tag, expires_at) VALUES (?, ?, ?, ?, date(\'now\'))',
      [stepup, '30% off zapatillas seleccionadas', 'Modelos de temporada pasada. Stock limitado.', '💸 Descuento']
    );
  }
  if (cafe) {
    database.runSync(
      'INSERT INTO promotions (store_id, title, description, tag, expires_at) VALUES (?, ?, ?, ?, date(\'now\', \'+7 days\'))',
      [cafe, 'Café de filtro por $1.200', 'Todos los métodos de filtrado al precio especial de apertura.', '☕ Apertura']
    );
  }

  try {
    database.runSync('INSERT OR IGNORE INTO users (name, email, password) VALUES (?, ?, ?)', [
      'María González',
      'maria@mail.com',
      'demo1234',
    ]);
  } catch {}
};
 
// ─── USUARIOS (clientes) ──────────────────────────────────────────────────────
export const registerUser = (name, email, password) => {
  const db = getDB();
  try {
    db.runSync(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, password]
    );
    return { success: true };
  } catch (e) {
    return { success: false, error: 'El correo ya está registrado.' };
  }
};
 
export const loginUser = (email, password) => {
  const db = getDB();
  const user = db.getFirstSync(
    'SELECT id, name, email FROM users WHERE email = ? AND password = ?',
    [email, password]
  );
  return user || null;
};
 
// ─── DUEÑOS ───────────────────────────────────────────────────────────────────
export const registerOwner = (name, email, password) => {
  const db = getDB();
  try {
    db.runSync(
      'INSERT INTO owners (name, email, password) VALUES (?, ?, ?)',
      [name, email, password]
    );
    return { success: true };
  } catch (e) {
    return { success: false, error: 'El correo ya está registrado.' };
  }
};
 
export const loginOwner = (email, password) => {
  const db = getDB();
  const owner = db.getFirstSync(
    'SELECT id, name, email FROM owners WHERE email = ? AND password = ?',
    [email, password]
  );
  return owner || null;
};
 
// ─── TIENDAS ──────────────────────────────────────────────────────────────────
export const getAllStores = (category = null) => {
  const db = getDB();
  if (category && category !== 'all') {
    return db.getAllSync(
      'SELECT * FROM stores WHERE category LIKE ? ORDER BY name ASC',
      [`%${category}%`]
    );
  }
  return db.getAllSync('SELECT * FROM stores ORDER BY name ASC');
};
 
export const getStoreById = (id) => {
  const db = getDB();
  return db.getFirstSync('SELECT * FROM stores WHERE id = ?', [id]);
};

export const getStoreByExternalId = (externalId) => {
  const db = getDB();
  if (!externalId) return null;
  return db.getFirstSync('SELECT * FROM stores WHERE external_id = ? LIMIT 1', [externalId]);
};
 
export const getStoreByOwner = (ownerId) => {
  const db = getDB();
  return db.getFirstSync('SELECT * FROM stores WHERE owner_id = ?', [ownerId]);
};

export const getSystemOwnerId = () => {
  const db = getDB();
  const owner = db.getFirstSync('SELECT id FROM owners WHERE email = ?', ['system@datashopy.local']);
  return owner?.id || null;
};

export const upsertGoogleStores = ({ city = null, country = null, places = [] } = {}) => {
  const db = getDB();
  const systemOwnerId = getSystemOwnerId();
  if (!systemOwnerId) return { inserted: 0, updated: 0 };

  let inserted = 0;
  let updated = 0;

  for (const p of places) {
    const externalId = p?.place_id || null;
    const name = p?.name || null;
    const address = p?.vicinity || p?.formatted_address || null;
    const lat = p?.geometry?.location?.lat ?? null;
    const lng = p?.geometry?.location?.lng ?? null;
    if (!externalId || !name) continue;

    try {
      const existing = db.getFirstSync('SELECT id FROM stores WHERE external_id = ?', [externalId]);
      if (!existing) {
        db.runSync(
          `INSERT INTO stores (owner_id, name, category, description, address, phone, schedule_weekday, schedule_weekend, emoji, banner_color, city, country, lat, lng, source, external_id, claimed)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            systemOwnerId,
            name,
            'Local',
            null,
            address,
            null,
            null,
            null,
            '🏪',
            '#EEEDFE',
            city,
            country,
            lat,
            lng,
            'google',
            externalId,
            0,
          ]
        );
        inserted += 1;
      } else {
        db.runSync(
          `UPDATE stores
           SET name = COALESCE(?, name),
               address = COALESCE(?, address),
               city = COALESCE(?, city),
               country = COALESCE(?, country),
               lat = COALESCE(?, lat),
               lng = COALESCE(?, lng),
               source = COALESCE(source, 'google')
           WHERE id = ?`,
          [name, address, city, country, lat, lng, existing.id]
        );
        updated += 1;
      }
    } catch {}
  }

  return { inserted, updated };
};

export const upsertOsmStores = ({ city = null, country = null, elements = [] } = {}) => {
  const db = getDB();
  const systemOwnerId = getSystemOwnerId();
  if (!systemOwnerId) return { inserted: 0, updated: 0 };

  let inserted = 0;
  let updated = 0;

  const safeText = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const buildAddress = (tags) => {
    const street = safeText(tags?.['addr:street']);
    const number = safeText(tags?.['addr:housenumber']);
    const unit = safeText(tags?.['addr:unit']);
    const cityTag = safeText(tags?.['addr:city']);
    const a = [];
    if (street) a.push(number ? `${street} ${number}` : street);
    if (unit) a.push(unit);
    if (cityTag) a.push(cityTag);
    return a.join(', ') || null;
  };

  for (const el of elements) {
    const tags = el?.tags || {};
    const name = safeText(tags?.name);
    if (!name) continue;

    const type = safeText(el?.type);
    const id = el?.id;
    if (!type || id == null) continue;

    const externalId = `osm:${type}/${id}`;
    const lat = type === 'node' ? el?.lat ?? null : el?.center?.lat ?? null;
    const lng = type === 'node' ? el?.lon ?? null : el?.center?.lon ?? null;

    const address = safeText(tags?.['addr:full']) || buildAddress(tags) || safeText(tags?.['addr:street']) || null;
    const category =
      safeText(tags?.shop) ||
      safeText(tags?.amenity) ||
      safeText(tags?.tourism) ||
      safeText(tags?.office) ||
      'Local';

    try {
      const existing = db.getFirstSync('SELECT id FROM stores WHERE external_id = ?', [externalId]);
      if (!existing) {
        db.runSync(
          `INSERT INTO stores (owner_id, name, category, description, address, phone, schedule_weekday, schedule_weekend, emoji, banner_color, city, country, lat, lng, source, external_id, claimed)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            systemOwnerId,
            name,
            category,
            null,
            address,
            null,
            null,
            null,
            '🏪',
            '#EEEDFE',
            city,
            country,
            lat,
            lng,
            'osm',
            externalId,
            0,
          ]
        );
        inserted += 1;
      } else {
        db.runSync(
          `UPDATE stores
           SET name = COALESCE(?, name),
               category = COALESCE(?, category),
               address = COALESCE(?, address),
               city = COALESCE(?, city),
               country = COALESCE(?, country),
               lat = COALESCE(?, lat),
               lng = COALESCE(?, lng),
               source = COALESCE(source, 'osm')
           WHERE id = ?`,
          [name, category, address, city, country, lat, lng, existing.id]
        );
        updated += 1;
      }
    } catch {}
  }

  return { inserted, updated };
};

export const listUnclaimedStores = ({ city = null, query = '' } = {}) => {
  const db = getDB();
  const q = (query || '').trim().toLowerCase();
  const c = (city || '').trim().toLowerCase();

  const rows = db.getAllSync(
    `SELECT *
     FROM stores
     WHERE COALESCE(claimed, 0) = 0
       AND external_id IS NOT NULL
     ORDER BY name ASC`
  );

  return rows.filter((s) => {
    const matchesQ = !q || `${s.name || ''} ${s.address || ''}`.toLowerCase().includes(q);
    const matchesCity = !c || String(s.city || '').trim().toLowerCase() === c;
    return matchesQ && matchesCity;
  });
};
 
export const createStore = (ownerId, data) => {
  const db = getDB();
  db.runSync(
    `INSERT INTO stores (owner_id, name, category, description, address, phone, schedule_weekday, schedule_weekend, emoji, banner_color, city, country, lat, lng, source, claimed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ownerId, data.name, data.category, data.description, data.address,
     data.phone, data.schedule_weekday, data.schedule_weekend,
     data.emoji || '🏪', data.banner_color || '#EEEDFE',
     data.city || null, data.country || null, data.lat ?? null, data.lng ?? null,
     'local', 1]
  );
};
 
export const updateStore = (id, data) => {
  const db = getDB();
  db.runSync(
    `UPDATE stores SET name=?, category=?, description=?, address=?, phone=?,
     schedule_weekday=?, schedule_weekend=?, emoji=?, banner_color=?,
     city=?, country=?, lat=?, lng=? WHERE id=?`,
    [data.name, data.category, data.description, data.address, data.phone,
     data.schedule_weekday, data.schedule_weekend, data.emoji, data.banner_color,
     data.city || null, data.country || null, data.lat ?? null, data.lng ?? null, id]
  );
};
 
// ─── TRACKING ────────────────────────────────────────────────────────────────
export const trackEvent = (eventName, { storeId = null, userId = null, ownerId = null, metadata = null } = {}) => {
  const db = getDB();
  const meta = metadata ? JSON.stringify(metadata) : null;
  db.runSync(
    'INSERT INTO tracking_events (event_name, store_id, user_id, owner_id, metadata) VALUES (?, ?, ?, ?, ?)',
    [eventName, storeId, userId, ownerId, meta]
  );

  try {
    let remoteStoreId = null;
    if (storeId != null) {
      const s = db.getFirstSync('SELECT external_id FROM stores WHERE id = ? LIMIT 1', [storeId]);
      const ext = String(s?.external_id || '');
      if (ext.startsWith('sb:store/')) {
        const n = Number(ext.replace('sb:store/', ''));
        if (!Number.isNaN(n) && n) remoteStoreId = n;
      }
    }
    const payload = {
      event_name: eventName,
      store_id: remoteStoreId,
      user_id: userId || null,
      owner_id: ownerId || null,
      metadata: metadata || null,
    };
    supabase
      .from('tracking_events')
      .insert(payload)
      .then(() => {})
      .catch(() => {});
  } catch {}
};

export const countStoreEventsToday = (storeId, eventName) => {
  const db = getDB();
  const result = db.getFirstSync(
    `SELECT COUNT(*) as count
     FROM tracking_events
     WHERE store_id = ?
       AND event_name = ?
       AND date(created_at, 'localtime') = date('now', 'localtime')`,
    [storeId, eventName]
  );
  return result?.count || 0;
};

export const ownerCanRequestClaim = (ownerId) => {
  const db = getDB();
  const existing = db.getFirstSync('SELECT id FROM stores WHERE owner_id = ?', [ownerId]);
  return !existing;
};

export const createClaim = (ownerId, storeId, message = '') => {
  const db = getDB();
  if (!ownerId || !storeId) return { success: false, error: 'Datos incompletos.' };
  if (!ownerCanRequestClaim(ownerId)) return { success: false, error: 'Ya tienes una tienda asociada.' };

  const pending = db.getFirstSync(
    "SELECT id FROM claims WHERE store_id = ? AND status = 'pending' LIMIT 1",
    [storeId]
  );
  if (pending) return { success: false, error: 'Este local ya tiene una solicitud pendiente.' };

  try {
    db.runSync('INSERT INTO claims (store_id, owner_id, status, message) VALUES (?, ?, ?, ?)', [
      storeId,
      ownerId,
      'pending',
      message || null,
    ]);
    return { success: true };
  } catch {
    return { success: false, error: 'No se pudo crear la solicitud.' };
  }
};

export const getPendingClaims = () => {
  const db = getDB();
  return db.getAllSync(
    `SELECT c.id as claim_id, c.created_at, c.message,
            s.id as store_id, s.name as store_name, s.address as store_address, s.city as store_city, s.country as store_country,
            o.id as owner_id, o.name as owner_name, o.email as owner_email
     FROM claims c
     JOIN stores s ON s.id = c.store_id
     JOIN owners o ON o.id = c.owner_id
     WHERE c.status = 'pending'
     ORDER BY c.created_at DESC`
  );
};

export const approveClaim = (claimId) => {
  const db = getDB();
  const claim = db.getFirstSync('SELECT id, store_id, owner_id FROM claims WHERE id = ?', [claimId]);
  if (!claim) return { success: false, error: 'Solicitud no encontrada.' };
  if (!ownerCanRequestClaim(claim.owner_id)) return { success: false, error: 'El dueño ya tiene una tienda.' };

  try {
    db.runSync("UPDATE claims SET status='approved', decided_at=datetime('now') WHERE id = ?", [claimId]);
    db.runSync(
      "UPDATE stores SET owner_id=?, claimed=1, claimed_at=datetime('now') WHERE id = ?",
      [claim.owner_id, claim.store_id]
    );
    return { success: true };
  } catch {
    return { success: false, error: 'No se pudo aprobar.' };
  }
};

export const rejectClaim = (claimId) => {
  const db = getDB();
  try {
    db.runSync("UPDATE claims SET status='rejected', decided_at=datetime('now') WHERE id = ?", [claimId]);
    return { success: true };
  } catch {
    return { success: false, error: 'No se pudo rechazar.' };
  }
};

// ─── PROMOCIONES ──────────────────────────────────────────────────────────────
export const getPromosByStore = (storeId) => {
  const db = getDB();
  return db.getAllSync(
    'SELECT * FROM promotions WHERE store_id = ? AND is_active = 1 ORDER BY created_at DESC',
    [storeId]
  );
};
 
export const createPromo = (storeId, data) => {
  const db = getDB();
  db.runSync(
    'INSERT INTO promotions (store_id, title, description, tag, expires_at) VALUES (?, ?, ?, ?, ?)',
    [storeId, data.title, data.description, data.tag, data.expires_at]
  );
};
 
export const updatePromo = (id, data) => {
  const db = getDB();
  db.runSync(
    'UPDATE promotions SET title=?, description=?, tag=?, expires_at=? WHERE id=?',
    [data.title, data.description, data.tag, data.expires_at, id]
  );
};
 
export const deletePromo = (id) => {
  const db = getDB();
  db.runSync('UPDATE promotions SET is_active = 0 WHERE id = ?', [id]);
};
 
export const countActivePromos = (storeId) => {
  const db = getDB();
  const result = db.getFirstSync(
    'SELECT COUNT(*) as count FROM promotions WHERE store_id = ? AND is_active = 1',
    [storeId]
  );
  return result?.count || 0;
};

const safeClientKey = (userId) => String(userId || 'guest');

export const getClientPreferences = (userId) => {
  const db = getDB();
  const key = safeClientKey(userId);
  const row = db.getFirstSync(
    `SELECT preferred_city, notifications_enabled, promo_alerts, nearby_alerts, marketing_updates
     FROM client_preferences
     WHERE user_id = ?
     LIMIT 1`,
    [key]
  );
  return {
    user_id: key,
    preferred_city: row?.preferred_city || '',
    notifications_enabled: Number(row?.notifications_enabled ?? 1) === 1,
    promo_alerts: Number(row?.promo_alerts ?? 1) === 1,
    nearby_alerts: Number(row?.nearby_alerts ?? 1) === 1,
    marketing_updates: Number(row?.marketing_updates ?? 0) === 1,
  };
};

export const saveClientPreferences = (userId, updates = {}) => {
  const db = getDB();
  const key = safeClientKey(userId);
  const current = getClientPreferences(key);
  const next = {
    preferred_city: typeof updates.preferred_city === 'string' ? updates.preferred_city.trim() : current.preferred_city,
    notifications_enabled:
      typeof updates.notifications_enabled === 'boolean' ? (updates.notifications_enabled ? 1 : 0) : current.notifications_enabled ? 1 : 0,
    promo_alerts: typeof updates.promo_alerts === 'boolean' ? (updates.promo_alerts ? 1 : 0) : current.promo_alerts ? 1 : 0,
    nearby_alerts: typeof updates.nearby_alerts === 'boolean' ? (updates.nearby_alerts ? 1 : 0) : current.nearby_alerts ? 1 : 0,
    marketing_updates:
      typeof updates.marketing_updates === 'boolean' ? (updates.marketing_updates ? 1 : 0) : current.marketing_updates ? 1 : 0,
  };

  db.runSync(
    `INSERT OR REPLACE INTO client_preferences
     (user_id, preferred_city, notifications_enabled, promo_alerts, nearby_alerts, marketing_updates, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      key,
      next.preferred_city || null,
      next.notifications_enabled,
      next.promo_alerts,
      next.nearby_alerts,
      next.marketing_updates,
    ]
  );

  return getClientPreferences(key);
};

export const getFavoriteStoreIds = (userId) => {
  const db = getDB();
  const key = safeClientKey(userId);
  const rows = db.getAllSync('SELECT store_id FROM favorite_stores WHERE user_id = ? ORDER BY created_at DESC', [key]);
  return rows.map((row) => row.store_id);
};

export const isFavoriteStore = (userId, storeId) => {
  if (!storeId) return false;
  const db = getDB();
  const key = safeClientKey(userId);
  const row = db.getFirstSync(
    'SELECT id FROM favorite_stores WHERE user_id = ? AND store_id = ? LIMIT 1',
    [key, storeId]
  );
  return Boolean(row?.id);
};

export const toggleFavoriteStore = (userId, storeId) => {
  const db = getDB();
  const key = safeClientKey(userId);
  if (!storeId) return { isFavorite: false };
  const exists = isFavoriteStore(key, storeId);
  if (exists) {
    db.runSync('DELETE FROM favorite_stores WHERE user_id = ? AND store_id = ?', [key, storeId]);
    return { isFavorite: false };
  }
  db.runSync('INSERT OR IGNORE INTO favorite_stores (user_id, store_id) VALUES (?, ?)', [key, storeId]);
  return { isFavorite: true };
};

export const getFavoriteStores = (userId) => {
  const db = getDB();
  const key = safeClientKey(userId);
  return db.getAllSync(
    `SELECT s.*
     FROM favorite_stores f
     JOIN stores s ON s.id = f.store_id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC`,
    [key]
  );
};
