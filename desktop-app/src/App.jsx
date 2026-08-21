import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  initDb,
  getMeta,
  getAllProducts,
  findWorkerByEmployeeId,
  decrementStockLocally,
  decrementWorkerBalanceLocally,
  setWorkerBalanceLocally,
  queueSale,
  getPendingSales,
  getAllSales,
  logTopUp,
  getAllTopUps,
} from './db'
import { pullMasterData, pushPendingSales } from './sync'
import { topUpWorker } from './api'
import { strings, nextLang } from './strings'
import { LOW_STOCK_THRESHOLD, SYNC_INTERVAL_MS, resolveImageUrl } from './config'

function uuid() {
  return crypto.randomUUID()
}

export default function App() {
  const [lang, setLang] = useState('EN')
  const t = strings(lang)

  const [ready, setReady] = useState(false)
  const [everSynced, setEverSynced] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState(null)

  const [view, setView] = useState('shop') // 'shop' | 'transactions'

  const [products, setProducts] = useState([])
  const [cart, setCart] = useState({}) // productId -> qty

  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [salesLog, setSalesLog] = useState([])
  const [topUpsLog, setTopUpsLog] = useState([])

  // Worker is looked up only at checkout time, not at app start — the
  // cashier rings up items against the catalog first, and only enters
  // the Employee ID being charged when closing out the sale.
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutIdInput, setCheckoutIdInput] = useState('')
  const [checkoutError, setCheckoutError] = useState('')
  const [checkoutBusy, setCheckoutBusy] = useState(false)

  const [dialog, setDialog] = useState(null) // { title, body }

  const [topUpOpen, setTopUpOpen] = useState(false)
  const [topUpIdInput, setTopUpIdInput] = useState('')
  const [topUpWorkerFound, setTopUpWorkerFound] = useState(null)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [topUpNote, setTopUpNote] = useState('')
  const [topUpError, setTopUpError] = useState('')
  const [topUpBusy, setTopUpBusy] = useState(false)

  const refreshPendingCount = useCallback(async () => {
    const pending = await getPendingSales()
    setPendingCount(pending.length)
    setSalesLog(await getAllSales())
    setTopUpsLog(await getAllTopUps())
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

  const transactions = useMemo(() => {
    const sales = salesLog.map((s) => ({
      key: `sale-${s.client_record_id}`,
      kind: 'sale',
      worker: s.worker_employee_id,
      amount: s.total,
      status: s.status,
      detail: s.error || '',
      created_at: s.created_at,
    }))
    const topUps = topUpsLog.map((tu) => ({
      key: `topup-${tu.id}`,
      kind: 'topup',
      worker: `${tu.worker_name} (${tu.worker_employee_id})`,
      amount: tu.amount,
      status: 'synced',
      detail: tu.note || '',
      created_at: tu.created_at,
    }))
    return [...sales, ...topUps].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    )
  }, [salesLog, topUpsLog])

  function statusLabel(status) {
    if (status === 'pending') return t.statusPending
    if (status === 'synced') return t.statusSynced
    if (status === 'failed') return t.statusFailed
    return status
  }

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

  function openTopUp() {
    setTopUpIdInput('')
    setTopUpWorkerFound(null)
    setTopUpAmount('')
    setTopUpNote('')
    setTopUpError('')
    setTopUpOpen(true)
  }

  function closeTopUp() {
    setTopUpOpen(false)
  }

  async function lookUpTopUpWorker() {
    const id = topUpIdInput.trim()
    if (!id) return
    setTopUpError('')
    const worker = await findWorkerByEmployeeId(id)
    if (!worker) {
      setTopUpError(t.workerNotFound)
      return
    }
    setTopUpWorkerFound(worker)
  }

  function changeTopUpWorker() {
    setTopUpWorkerFound(null)
    setTopUpAmount('')
    setTopUpNote('')
    setTopUpError('')
  }

  async function submitTopUp() {
    const amount = parseFloat(topUpAmount)
    if (!topUpWorkerFound || !(amount > 0)) {
      setTopUpError(t.invalidAmount)
      return
    }
    setTopUpBusy(true)
    setTopUpError('')
    try {
      const note = topUpNote.trim()
      const updated = await topUpWorker(topUpWorkerFound.id, amount, note)
      await setWorkerBalanceLocally(topUpWorkerFound.employee_id, updated.balance)
      await logTopUp({
        id: uuid(),
        workerEmployeeId: topUpWorkerFound.employee_id,
        workerName: updated.name,
        amount,
        note,
        balanceAfter: updated.balance,
      })
      await refreshPendingCount()
      closeTopUp()
      setDialog({
        title: t.topUpComplete,
        body: `${updated.name}: +${amount.toFixed(2)}. ${t.newBalance}: ${updated.balance.toFixed(2)}.`,
      })
    } catch (err) {
      setTopUpError(`${t.topUpFailed}: ${err.message}`)
    } finally {
      setTopUpBusy(false)
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
          <button className="pill topup-btn" onClick={openTopUp}>
            {t.topUp}
          </button>
        </div>
      </header>

      <div className="topbar-tabs">
        <button
          className={`tab-btn ${view === 'shop' ? 'active' : ''}`}
          onClick={() => setView('shop')}
        >
          {t.tabShop}
        </button>
        <button
          className={`tab-btn ${view === 'transactions' ? 'active' : ''}`}
          onClick={() => setView('transactions')}
        >
          {t.tabTransactions}{pendingCount ? ` (${pendingCount})` : ''}
        </button>
      </div>

      {syncMessage && <div className="sync-message">{syncMessage}</div>}
      <div className="last-synced">
        {t.lastSynced}: {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : t.never}
      </div>

      {!everSynced && <div className="banner">{t.staleBanner}</div>}

      {view === 'transactions' ? (
        <div className="tx-panel">
          {transactions.length === 0 ? (
            <div className="sync-panel-empty">{t.noTransactions}</div>
          ) : (
            <table className="sync-table">
              <thead>
                <tr>
                  <th>{t.colType}</th>
                  <th>{t.colWorker}</th>
                  <th>{t.colAmount}</th>
                  <th>{t.colStatus}</th>
                  <th>{t.colDetail}</th>
                  <th>{t.colCreated}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.key} className={`row-${tx.status}`}>
                    <td>{tx.kind === 'topup' ? t.topUpLabel : t.saleLabel}</td>
                    <td>{tx.worker}</td>
                    <td>{tx.amount.toFixed(2)}</td>
                    <td>{statusLabel(tx.status)}</td>
                    <td>{tx.detail}</td>
                    <td>{new Date(tx.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : products.length === 0 ? (
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
                  <img src={resolveImageUrl(p.image_url)} alt={primaryName} />
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

      {view === 'shop' && (
        <div className="checkout-bar">
          <div className="total">
            {t.total}: {total.toFixed(2)}
          </div>
          <button disabled={cartItems.length === 0} onClick={openCheckout}>
            {t.confirmSale} ({cartItems.reduce((n, i) => n + i.qty, 0)})
          </button>
        </div>
      )}

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

      {topUpOpen && (
        <div className="dialog-overlay" onClick={closeTopUp}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>{t.topUpTitle}</h2>
            {!topUpWorkerFound ? (
              <>
                <input
                  autoFocus
                  placeholder={t.employeeId}
                  value={topUpIdInput}
                  onChange={(e) => setTopUpIdInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && lookUpTopUpWorker()}
                />
                {topUpError && <div className="error">{topUpError}</div>}
                <div className="dialog-actions">
                  <button className="secondary" onClick={closeTopUp}>{t.cancel}</button>
                  <button onClick={lookUpTopUpWorker} disabled={!topUpIdInput.trim()}>
                    {t.lookUpWorker}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="checkout-total">
                  {topUpWorkerFound.name} ({t.idLabel}: {topUpWorkerFound.employee_id})
                </p>
                <p>{t.currentBalance}: {topUpWorkerFound.balance.toFixed(2)}</p>
                <input
                  autoFocus
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t.cashReceived}
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                />
                <input
                  placeholder={t.noteOptional}
                  value={topUpNote}
                  onChange={(e) => setTopUpNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitTopUp()}
                />
                {topUpError && <div className="error">{topUpError}</div>}
                <div className="dialog-actions">
                  <button className="secondary" onClick={changeTopUpWorker}>{t.change}</button>
                  <button onClick={submitTopUp} disabled={topUpBusy || !(parseFloat(topUpAmount) > 0)}>
                    {t.topUp}
                  </button>
                </div>
              </>
            )}
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
