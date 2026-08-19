import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  initDb,
  getMeta,
  getAllProducts,
  findWorkerByEmployeeId,
  decrementStockLocally,
  decrementWorkerBalanceLocally,
  queueSale,
  getPendingSales,
  getAllSales,
} from './db'
import { pullMasterData, pushPendingSales } from './sync'
import { strings, nextLang, LANGS } from './strings'
import { LOW_STOCK_THRESHOLD, SYNC_INTERVAL_MS } from './config'

function uuid() {
  return crypto.randomUUID()
}

export default function App() {
  const [lang, setLang] = useState('EN')
  const t = strings(lang)

  const [ready, setReady] = useState(false)
  const [everSynced, setEverSynced] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState(null)

  const [employeeIdInput, setEmployeeIdInput] = useState('')
  const [worker, setWorker] = useState(null)
  const [lookupError, setLookupError] = useState('')

  const [products, setProducts] = useState([])
  const [cart, setCart] = useState({}) // productId -> qty

  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [showSyncPanel, setShowSyncPanel] = useState(false)
  const [salesLog, setSalesLog] = useState([])

  const [dialog, setDialog] = useState(null) // { title, body }

  const refreshPendingCount = useCallback(async () => {
    const pending = await getPendingSales()
    setPendingCount(pending.length)
    setSalesLog(await getAllSales())
  }, [])

  const refreshProducts = useCallback(async () => {
    setProducts(await getAllProducts())
  }, [])

  useEffect(() => {
    ;(async () => {
      await initDb()
      const lastPull = await getMeta('last_pull_at')
      const lastSync = await getMeta('last_sync_at')
      setEverSynced(!!lastPull)
      setLastSyncAt(lastSync)
      await refreshProducts()
      await refreshPendingCount()
      setReady(true)
      // Best-effort initial sync; ignore failure (offline first run uses
      // whatever's cached, same as Android's bundled seed data — except
      // here there's no seed bundle, so an empty first run just shows
      // the "no products cached" state until connectivity arrives).
      runSync(true)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const id = setInterval(() => runSync(true), SYNC_INTERVAL_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runSync = useCallback(async (silent = false) => {
    setSyncing(true)
    if (!silent) setSyncMessage('')
    try {
      const pushResult = await pushPendingSales()
      await pullMasterData()
      setEverSynced(true)
      setLastSyncAt(new Date().toISOString())
      await refreshProducts()
      await refreshPendingCount()
      if (!silent) {
        setSyncMessage(
          `${t.syncSuccess}: ${pushResult.synced}/${pushResult.total} ${t.pendingSales}` +
            (pushResult.failed ? ` (${pushResult.failed} failed)` : '')
        )
      }
    } catch (err) {
      if (!silent) setSyncMessage(`${t.syncFailure}: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }, [t, refreshProducts, refreshPendingCount])

  async function lookUpWorker() {
    setLookupError('')
    const id = employeeIdInput.trim()
    if (!id) return
    const found = await findWorkerByEmployeeId(id)
    if (!found) {
      setLookupError(`Worker "${id}" not found in cached directory.`)
      return
    }
    setWorker(found)
  }

  function changeWorker() {
    setWorker(null)
    setEmployeeIdInput('')
    setCart({})
    setLookupError('')
  }

  function addToCart(product) {
    setCart((prev) => {
      const currentQty = prev[product.id] || 0
      if (currentQty >= product.stock) return prev
      return { ...prev, [product.id]: currentQty + 1 }
    })
  }

  function decFromCart(product) {
    setCart((prev) => {
      const currentQty = prev[product.id] || 0
      if (currentQty <= 1) {
        const rest = { ...prev }
        delete rest[product.id]
        return rest
      }
      return { ...prev, [product.id]: currentQty - 1 }
    })
  }

  const cartItems = useMemo(
    () =>
      Object.entries(cart).map(([productId, qty]) => {
        const product = products.find((p) => p.id === Number(productId))
        return { product, qty }
      }).filter((i) => i.product),
    [cart, products]
  )

  const total = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.product.price * i.qty, 0),
    [cartItems]
  )

  const canConfirm = cartItems.length > 0 && worker && total <= worker.balance

  async function confirmSale() {
    if (!canConfirm) return
    const clientRecordId = uuid()
    const items = cartItems.map((i) => ({ product_id: i.product.id, quantity: i.qty }))

    await queueSale({
      clientRecordId,
      workerEmployeeId: worker.employee_id,
      items,
      total,
    })
    for (const i of cartItems) {
      await decrementStockLocally(i.product.id, i.qty)
    }
    await decrementWorkerBalanceLocally(worker.employee_id, total)

    const newBalance = worker.balance - total
    setDialog({ title: t.saleComplete, body: `Charged ${total.toFixed(2)}. New balance: ${newBalance.toFixed(2)}.` })
    setWorker({ ...worker, balance: newBalance })
    setCart({})
    await refreshProducts()
    await refreshPendingCount()
    runSync(true)
  }

  if (!ready) return <div className="loading">Loading…</div>

  return (
    <div className="app">
      <header className="topbar">
        <h1>{t.title}</h1>
        <div className="topbar-actions">
          <button className="pill" onClick={() => setLang(nextLang(lang))}>
            {lang}
          </button>
          <button className="pill sync-btn" onClick={() => runSync(false)} disabled={syncing}>
            {syncing ? t.syncing : `${t.sync}${pendingCount ? ` (${pendingCount})` : ''}`}
          </button>
          <button className="pill" onClick={() => setShowSyncPanel((v) => !v)}>
            {showSyncPanel ? '▲' : '▼'} {pendingCount} {t.pendingSales}
          </button>
        </div>
      </header>

      {syncMessage && <div className="sync-message">{syncMessage}</div>}
      <div className="last-synced">
        {t.lastSynced}: {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : t.never}
      </div>

      {showSyncPanel && (
        <div className="sync-panel">
          {salesLog.length === 0 ? (
            <div className="sync-panel-empty">No transactions yet.</div>
          ) : (
            <table className="sync-table">
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {salesLog.map((s) => (
                  <tr key={s.client_record_id} className={`row-${s.status}`}>
                    <td>{s.worker_employee_id}</td>
                    <td>{s.total.toFixed(2)}</td>
                    <td>{s.status}</td>
                    <td>{new Date(s.created_at).toLocaleString()}</td>
                    <td>{s.error || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!everSynced && <div className="banner">{t.staleBanner}</div>}

      {!worker ? (
        <div className="lookup-panel">
          <label>{t.enterWorkerId}</label>
          <input
            autoFocus
            placeholder={t.employeeId}
            value={employeeIdInput}
            onChange={(e) => setEmployeeIdInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lookUpWorker()}
          />
          <button onClick={lookUpWorker}>{t.lookUpWorker}</button>
          {lookupError && <div className="error">{lookupError}</div>}
        </div>
      ) : (
        <>
          <div className="worker-card">
            <div className="avatar">{worker.name.charAt(0).toUpperCase()}</div>
            <div className="worker-info">
              <div className="worker-name">{worker.name}</div>
              <div className="worker-meta">
                {t.idLabel}: {worker.employee_id} · Balance: {worker.balance.toFixed(2)}
              </div>
            </div>
            <button onClick={changeWorker}>{t.change}</button>
          </div>

          {products.length === 0 ? (
            <div className="empty">{t.noProductsCached}</div>
          ) : (
            <div className="product-grid">
              {products.map((p) => {
                const qty = cart[p.id] || 0
                const outOfStock = p.stock <= 0
                const lowStock = !outOfStock && p.stock <= LOW_STOCK_THRESHOLD
                const primaryName = lang === 'ZH' && p.name_zh ? p.name_zh : p.name
                const secondaryName = lang === 'ZH' && p.name_zh ? p.name : p.name_zh
                return (
                  <div className="product-card" key={p.id}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={primaryName} />
                    ) : (
                      <div className="product-img-placeholder" />
                    )}
                    {outOfStock && <div className="badge badge-out">{t.outOfStock}</div>}
                    {lowStock && <div className="badge badge-low">{p.stock} {t.left}</div>}
                    <div className="product-name">{primaryName}</div>
                    {secondaryName && <div className="product-name-secondary">{secondaryName}</div>}
                    <div className="product-meta">
                      {p.price.toFixed(2)} / {p.unit}
                    </div>
                    {qty === 0 ? (
                      <button
                        className="add-btn"
                        disabled={outOfStock}
                        onClick={() => addToCart(p)}
                      >
                        {t.add}
                      </button>
                    ) : (
                      <div className="stepper">
                        <button onClick={() => decFromCart(p)}>−</button>
                        <span>{qty}</span>
                        <button disabled={qty >= p.stock} onClick={() => addToCart(p)}>+</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="checkout-bar">
            <div className="total">
              {t.total}: {total.toFixed(2)}
            </div>
            <button disabled={!canConfirm} onClick={confirmSale}>
              {t.confirmSale} ({cartItems.reduce((n, i) => n + i.qty, 0)})
            </button>
          </div>
        </>
      )}

      {dialog && (
        <div className="dialog-overlay" onClick={() => setDialog(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>{dialog.title}</h2>
            <p>{dialog.body}</p>
            <button onClick={() => setDialog(null)}>{t.ok}</button>
          </div>
        </div>
      )}
    </div>
  )
}
