import * as SQLite from 'expo-sqlite';
 
let db;
 
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
  `);
 
  // Datos de demo para ver la app funcionando desde el primer inicio
  await seedDemoData(database);
};
 
// ─── Datos de demo ────────────────────────────────────────────────────────────
const seedDemoData = async (database) => {
  const existing = database.getFirstSync('SELECT id FROM stores LIMIT 1');
  if (existing) return; // ya hay datos, no repetir
 
  database.execSync(`
    INSERT INTO owners (name, email, password) VALUES
      ('Carlos Ruiz', 'carlos@pizzeria.com', 'demo1234'),
      ('Ana Torres', 'ana@stepup.com', 'demo1234');
 
    INSERT INTO stores (owner_id, name, category, description, address, phone, schedule_weekday, schedule_weekend, emoji, banner_color) VALUES
      (1, 'La Pizzería', 'Comida italiana', 'Pizzería artesanal con más de 20 años en el barrio. Masa madre, ingredientes frescos y el mejor horno a leña de Santiago.', 'Av. Providencia 1520, Santiago', '+56 2 2345 6789', 'Lun–Sáb: 12:00–23:00', 'Dom: 13:00–21:00', '🍕', '#EEEDFE'),
      (2, 'StepUp Shoes', 'Calzado y moda', 'Tienda de calzado con las mejores marcas nacionales e importadas.', 'Mall Costanera Center, L2', '+56 2 2987 6543', 'Lun–Sáb: 10:00–20:00', 'Cerrado domingos', '👟', '#E1F5EE'),
      (1, 'Café Central', 'Cafetería', 'Café de especialidad en el corazón de Santiago. Granos de origen, métodos filtrados y repostería artesanal.', 'Plaza de Armas 45, Santiago', '+56 2 2111 2222', 'Lun–Vie: 08:00–20:00', 'Sáb: 09:00–18:00', '☕', '#FAEEDA');
 
    INSERT INTO promotions (store_id, title, description, tag, expires_at) VALUES
      (1, '2x1 en pizza familiar', 'Pide 2 pizzas familiares y paga solo una. Válido en todo el menú.', '🔥 Solo hoy', date('now')),
      (1, 'Postre gratis sobre $15.000', 'En pedidos superiores a $15.000 te regalamos un tiramisú casero.', '🎉 Especial semana', date('now', '+3 days')),
      (1, 'Envío gratis primera compra', 'Primer pedido por la app con delivery sin costo.', '🚚 Delivery', date('now')),
      (2, '30% off zapatillas seleccionadas', 'Modelos de temporada pasada. Stock limitado.', '💸 Descuento', date('now')),
      (3, 'Café de filtro por $1.200', 'Todos los métodos de filtrado al precio especial de apertura.', '☕ Apertura', date('now', '+7 days'));
 
    INSERT INTO users (name, email, password) VALUES
      ('María González', 'maria@mail.com', 'demo1234');
  `);
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
 
export const getStoreByOwner = (ownerId) => {
  const db = getDB();
  return db.getFirstSync('SELECT * FROM stores WHERE owner_id = ?', [ownerId]);
};
 
export const createStore = (ownerId, data) => {
  const db = getDB();
  db.runSync(
    `INSERT INTO stores (owner_id, name, category, description, address, phone, schedule_weekday, schedule_weekend, emoji, banner_color)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ownerId, data.name, data.category, data.description, data.address,
     data.phone, data.schedule_weekday, data.schedule_weekend,
     data.emoji || '🏪', data.banner_color || '#EEEDFE']
  );
};
 
export const updateStore = (id, data) => {
  const db = getDB();
  db.runSync(
    `UPDATE stores SET name=?, category=?, description=?, address=?, phone=?,
     schedule_weekday=?, schedule_weekend=?, emoji=?, banner_color=? WHERE id=?`,
    [data.name, data.category, data.description, data.address, data.phone,
     data.schedule_weekday, data.schedule_weekend, data.emoji, data.banner_color, id]
  );
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