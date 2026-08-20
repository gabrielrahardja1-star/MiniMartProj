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
import { strings, nextLang } from './strings'
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

  const [products, setProducts] = useState([])
  const [cart, setCart] = useState({}) // productId -> qty

  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [showSyncPanel, setShowSyncPanel] = useState(false)
  const [salesLog, setSalesLog] = useState([])

  // Worker is looked up only at checkout time, not at app start — the
  // cashier rings up items against the catalog first, and only enters
  // the Employee ID being charged when closing out the sale.
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutIdInput, setCheckoutIdInput] = useState('')
  const [checkoutError, setCheckoutError] = useState('')
  const [checkoutBusy, setCheckoutBusy] = useState(false)

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

  function openCheckout() {
    if (cartItems.length === 0) return
    setCheckoutIdInput('')
    setCheckoutError('')
    setCheckoutOpen(true)
  }

  function closeCheckout() {
    setCheckoutOpen(false)
    setCheckoutIdInput('')
    setCheckoutError('')
  }

  async function submitCheckout() {
    const id = checkoutIdInput.trim()
    if (!id) return
    setCheckoutBusy(true)
    setCheckoutError('')
    try {
      const worker = await findWorkerByEmployeeId(id)
      if (!worker) {
        setCheckoutError(t.workerNotFound)
        return
      }
      if (total > worker.balance) {
        setCheckoutError(`${t.insufficientBalance} (${worker.name}: ${worker.balance.toFixed(2)})`)
        return
      }

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
      closeCheckout()
      setCart({})
      setDialog({
        title: t.saleComplete,
        body: `${worker.name}: charged ${total.toFixed(2)}. New balance: ${newBalance.toFixed(2)}.`,
      })
      await refreshProducts()
      await refreshPendingCount()
      runSync(true)
    } finally {
      setCheckoutBusy(false)
    }
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
        <button disabled={cartItems.length === 0} onClick={openCheckout}>
          {t.confirmSale} ({cartItems.reduce((n, i) => n + i.qty, 0)})
        </button>
      </div>

      {checkoutOpen && (
        <div className="dialog-overlay" onClick={closeCheckout}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>{t.chargeTitle}</h2>
            <p className="checkout-total">{t.total}: {total.toFixed(2)}</p>
            <input
              autoFocus
              placeholder={t.employeeId}
              value={checkoutIdInput}
              onChange={(e) => setCheckoutIdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitCheckout()}
            />
            {checkoutError && <div className="error">{checkoutError}</div>}
            <div className="dialog-actions">
              <button className="secondary" onClick={closeCheckout}>{t.cancel}</button>
              <button onClick={submitCheckout} disabled={checkoutBusy || !checkoutIdInput.trim()}>
                {t.confirmSale}
              </button>
            </div>
          </div>
        </div>
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
