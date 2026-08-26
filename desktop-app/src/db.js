import Database from '@tauri-apps/plugin-sql'

let dbPromise = null

export function getDb() {
  if (!dbPromise) dbPromise = Database.load('sqlite:minimart-cashier.db')
  return dbPromise
}

export async function initDb() {
  const db = await getDb()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      name_zh TEXT,
      sku TEXT,
      price REAL NOT NULL,
      stock INTEGER NOT NULL,
      unit TEXT,
      image_url TEXT,
      updated_at TEXT
    );
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS workers (
      id INTEGER PRIMARY KEY,
      employee_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      balance REAL NOT NULL
    );
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sales (
      client_record_id TEXT PRIMARY KEY,
      worker_employee_id TEXT NOT NULL,
      items_json TEXT NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- pending | synced | failed | refunded
      error TEXT,
      created_at TEXT NOT NULL,
      synced_at TEXT,
      server_order_id INTEGER
    );
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS topups (
      id TEXT PRIMARY KEY,
      worker_employee_id TEXT NOT NULL,
      worker_name TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      balance_after REAL NOT NULL,
      created_at TEXT NOT NULL,
      transaction_id INTEGER,
      reversed INTEGER DEFAULT 0
    );
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `)
  // Tills that installed before these columns existed have `sales`/`topups`
  // tables already created without them — CREATE TABLE IF NOT EXISTS above
  // is a no-op for those, so backfill via ALTER TABLE. SQLite has no
  // "ADD COLUMN IF NOT EXISTS", so guard manually.
  await ensureColumn(db, 'sales', 'server_order_id', 'server_order_id INTEGER')
  await ensureColumn(db, 'topups', 'transaction_id', 'transaction_id INTEGER')
  await ensureColumn(db, 'topups', 'reversed', 'reversed INTEGER DEFAULT 0')
  await ensureColumn(db, 'products', 'updated_at', 'updated_at TEXT')
  return db
}

async function ensureColumn(db, table, column, columnDdl) {
  const info = await db.select(`PRAGMA table_info(${table})`)
  if (!info.some((c) => c.name === column)) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${columnDdl}`)
  }
}

export async function getMeta(key) {
  const db = await getDb()
  const rows = await db.select('SELECT value FROM meta WHERE key = $1', [key])
  return rows[0]?.value ?? null
}

export async function setMeta(key, value) {
  const db = await getDb()
  await db.execute(
    'INSERT INTO meta (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $2',
    [key, value]
  )
}

export async function replaceProducts(products) {
  const db = await getDb()
  await db.execute('DELETE FROM products')
  for (const p of products) {
    await db.execute(
      `INSERT INTO products (id, name, name_zh, sku, price, stock, unit, image_url, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [p.id, p.name, p.name_zh ?? null, p.sku, p.price, p.stock, p.unit, p.image_url ?? null, p.updated_at ?? null]
    )
  }
}

export async function replaceWorkers(workers) {
  const db = await getDb()
  await db.execute('DELETE FROM workers')
  for (const w of workers) {
    await db.execute(
      `INSERT INTO workers (id, employee_id, name, balance) VALUES ($1, $2, $3, $4)`,
      [w.id, w.employee_id, w.name, w.balance]
    )
  }
}

export async function getAllProducts() {
  const db = await getDb()
  return db.select('SELECT * FROM products ORDER BY name')
}

export async function findWorkerByEmployeeId(employeeId) {
  const db = await getDb()
  const rows = await db.select(
    'SELECT * FROM workers WHERE employee_id = $1 COLLATE NOCASE',
    [employeeId]
  )
  return rows[0] ?? null
}

export async function getAllWorkers() {
  const db = await getDb()
  return db.select('SELECT * FROM workers ORDER BY name')
}

export async function decrementStockLocally(productId, qty) {
  const db = await getDb()
  await db.execute('UPDATE products SET stock = stock - $1 WHERE id = $2', [qty, productId])
}

export async function incrementStockLocally(productId, qty) {
  const db = await getDb()
  await db.execute('UPDATE products SET stock = stock + $1 WHERE id = $2', [qty, productId])
}

export async function decrementWorkerBalanceLocally(employeeId, amount) {
  const db = await getDb()
  await db.execute(
    'UPDATE workers SET balance = balance - $1 WHERE employee_id = $2',
    [amount, employeeId]
  )
}

// Used ONLY for the local-only undo path (a sale that never synced, so
// there's no server call and no authoritative balance to fall back on).
export async function incrementWorkerBalanceLocally(employeeId, amount) {
  const db = await getDb()
  await db.execute(
    'UPDATE workers SET balance = balance + $1 WHERE employee_id = $2',
    [amount, employeeId]
  )
}

export async function setWorkerBalanceLocally(employeeId, balance) {
  const db = await getDb()
  await db.execute(
    'UPDATE workers SET balance = $1 WHERE employee_id = $2',
    [balance, employeeId]
  )
}

export async function queueSale({ clientRecordId, workerEmployeeId, items, total }) {
  const db = await getDb()
  await db.execute(
    `INSERT INTO sales (client_record_id, worker_employee_id, items_json, total, status, created_at)
     VALUES ($1, $2, $3, $4, 'pending', $5)`,
    [clientRecordId, workerEmployeeId, JSON.stringify(items), total, new Date().toISOString()]
  )
}

export async function getPendingSales() {
  const db = await getDb()
  return db.select("SELECT * FROM sales WHERE status IN ('pending', 'failed') ORDER BY created_at")
}

export async function getAllSales() {
  const db = await getDb()
  return db.select('SELECT * FROM sales ORDER BY created_at DESC')
}

export async function markSaleSynced(clientRecordId) {
  const db = await getDb()
  await db.execute(
    "UPDATE sales SET status = 'synced', error = NULL, synced_at = $2 WHERE client_record_id = $1",
    [clientRecordId, new Date().toISOString()]
  )
}

export async function markSaleFailed(clientRecordId, error) {
  const db = await getDb()
  await db.execute(
    "UPDATE sales SET status = 'failed', error = $2 WHERE client_record_id = $1",
    [clientRecordId, error]
  )
}

export async function setSaleServerOrderId(clientRecordId, serverOrderId) {
  const db = await getDb()
  await db.execute(
    'UPDATE sales SET server_order_id = $1 WHERE client_record_id = $2',
    [serverOrderId, clientRecordId]
  )
}

export async function markSaleRefunded(clientRecordId) {
  const db = await getDb()
  await db.execute(
    "UPDATE sales SET status = 'refunded' WHERE client_record_id = $1",
    [clientRecordId]
  )
}

export async function deleteSale(clientRecordId) {
  const db = await getDb()
  await db.execute('DELETE FROM sales WHERE client_record_id = $1', [clientRecordId])
}

export async function logTopUp({ id, workerEmployeeId, workerName, amount, note, balanceAfter, transactionId }) {
  const db = await getDb()
  await db.execute(
    `INSERT INTO topups (id, worker_employee_id, worker_name, amount, note, balance_after, transaction_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, workerEmployeeId, workerName, amount, note || null, balanceAfter, transactionId ?? null, new Date().toISOString()]
  )
}

export async function getAllTopUps() {
  const db = await getDb()
  return db.select('SELECT * FROM topups ORDER BY created_at DESC')
}

export async function markTopUpReversed(id) {
  const db = await getDb()
  await db.execute('UPDATE topups SET reversed = 1 WHERE id = $1', [id])
}
