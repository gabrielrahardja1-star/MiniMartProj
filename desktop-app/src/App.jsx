import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  initDb,
  getMeta,
  getAllProducts,
  getAllWorkers,
  decrementStockLocally,
  incrementStockLocally,
  decrementWorkerBalanceLocally,
  incrementWorkerBalanceLocally,
  setWorkerBalanceLocally,
  queueSale,
  getPendingSales,
  getAllSales,
  logTopUp,
  getAllTopUps,
  markSaleRefunded,
  deleteSale,
  markTopUpReversed,
} from './db'
import { pullMasterData, pushPendingSales } from './sync'
import { topUpWorker, refundOrder, reverseTopUp } from './api'
import { strings, nextLang } from './strings'
import { LOW_STOCK_THRESHOLD, SYNC_INTERVAL_MS, resolveImageUrl } from './config'
import { fuzzySearchWorkers } from './fuzzy'
import Inventory from './Inventory'

function uuid() {
  return crypto.randomUUID()
}

function WorkerResults({ results, onSelect, emptyLabel }) {
  if (results.length === 0) {
    return emptyLabel ? <div className="worker-results-empty">{emptyLabel}</div> : null
  }
  return (
    <div className="worker-results">
      {results.map((w) => (
        <div key={w.id} className="worker-result" onClick={() => onSelect(w)}>
          <div className="worker-result-name">{w.name}</div>
          <div className="worker-result-id">{w.employee_id}</div>
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [lang, setLang] = useState('EN')
  const t = strings(lang)

  const [ready, setReady] = useState(false)
  const [everSynced, setEverSynced] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState(null)

  const [view, setView] = useState('shop') // 'shop' | 'transactions'

  const [products, setProducts] = useState([])
  const [workers, setWorkers] = useState([])
  const [cart, setCart] = useState({}) // productId -> qty

  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [salesLog, setSalesLog] = useState([])
  const [topUpsLog, setTopUpsLog] = useState([])

  // Worker is looked up only at checkout time, not at app start — the
  // cashier rings up items against the catalog first, and only searches
  // for the worker to charge when closing out the sale. Search -> select
  // -> confirm is a deliberate two-step flow so a fat-fingered ID doesn't
  // silently charge the wrong person (hundreds of workers share ID
  // prefixes like WANG84/WANG85/WANG86).
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutQuery, setCheckoutQuery] = useState('')
  const [checkoutWorker, setCheckoutWorker] = useState(null)
  const [checkoutError, setCheckoutError] = useState('')
  const [checkoutBusy, setCheckoutBusy] = useState(false)

  const [dialog, setDialog] = useState(null) // { title, body }

  const [topUpOpen, setTopUpOpen] = useState(false)
  const [topUpQuery, setTopUpQuery] = useState('')
  const [topUpWorkerFound, setTopUpWorkerFound] = useState(null)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [topUpNote, setTopUpNote] = useState('')
  const [topUpError, setTopUpError] = useState('')
  const [topUpBusy, setTopUpBusy] = useState(false)

  // Undo (and "Edit" = undo + re-open the entry flow pre-filled) for the
  // Transactions tab. undoConfirm holds { tx } while the confirm dialog is
  // open; performUndo() does the actual server/local reversal and is
  // shared by both the confirm-dialog path and the Edit path.
  const [undoConfirm, setUndoConfirm] = useState(null) // { tx } or null
  const [undoBusy, setUndoBusy] = useState(false)
  const [undoError, setUndoError] = useState('')

  const refreshPendingCount = useCallback(async () => {
    const pending = await getPendingSales()
    setPendingCount(pending.length)
    setSalesLog(await getAllSales())
    setTopUpsLog(await getAllTopUps())
  }, [])

  const refreshProducts = useCallback(async () => {
    setProducts(await getAllProducts())
  }, [])

  const refreshWorkers = useCallback(async () => {
    setWorkers(await getAllWorkers())
  }, [])

  useEffect(() => {
    ;(async () => {
      await initDb()
      const lastPull = await getMeta('last_pull_at')
      const lastSync = await getMeta('last_sync_at')
      setEverSynced(!!lastPull)
      setLastSyncAt(lastSync)
      await refreshProducts()
      await refreshWorkers()
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
      await refreshWorkers()
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
  }, [t, refreshProducts, refreshWorkers, refreshPendingCount])

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

  const checkoutResults = useMemo(
    () => fuzzySearchWorkers(workers, checkoutQuery),
    [workers, checkoutQuery]
  )

  const topUpResults = useMemo(
    () => fuzzySearchWorkers(workers, topUpQuery),
    [workers, topUpQuery]
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
      raw: s,
    }))
    const topUps = topUpsLog.map((tu) => ({
      key: `topup-${tu.id}`,
      kind: 'topup',
      worker: `${tu.worker_name} (${tu.worker_employee_id})`,
      amount: tu.amount,
      status: tu.reversed ? 'reversed' : 'synced',
      detail: tu.note || '',
      created_at: tu.created_at,
      raw: tu,
    }))
    return [...sales, ...topUps].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    )
  }, [salesLog, topUpsLog])

  function statusLabel(status) {
    if (status === 'pending') return t.statusPending
    if (status === 'synced') return t.statusSynced
    if (status === 'failed') return t.statusFailed
    if (status === 'refunded') return t.statusRefunded
    if (status === 'reversed') return t.statusReversed
    return status
  }

  // A sale is undo-able unless it's already been refunded; a top-up is
  // undo-able unless it's already been reversed. "Edit" shares the same
  // eligibility as Undo, since it performs Undo first.
  //
  // Transactions made before this Undo feature existed don't have a
  // server_order_id / transaction_id recorded locally (the old app version
  // never stored one), so there's nothing to reverse them against — treat
  // those as not undo-able rather than sending a request that 422s.
  function undoEligible(tx) {
    if (tx.kind === 'sale') {
      if (tx.status === 'refunded') return false
      if (tx.status === 'synced') return tx.raw.server_order_id != null
      return true
    }
    return !tx.raw.reversed && tx.raw.transaction_id != null
  }

  function undoWorkerLabel(tx) {
    if (tx.kind === 'topup') return tx.worker
    const w = workers.find((w) => w.employee_id === tx.raw.worker_employee_id)
    return w ? w.name : tx.raw.worker_employee_id
  }

  function undoMessageFor(tx) {
    const worker = undoWorkerLabel(tx)
    const amount = tx.amount.toFixed(2)
    if (tx.kind === 'sale') {
      if (tx.status === 'synced') {
        return t.undoSaleSyncedMsg.replace('{amount}', amount).replace('{worker}', worker)
      }
      return t.undoSaleLocalMsg
    }
    return t.undoTopUpMsg.replace('{amount}', amount).replace('{worker}', worker)
  }

  function requestUndo(tx) {
    setUndoError('')
    setUndoConfirm({ tx })
  }

  // Shared by the confirm-dialog Confirm button and by "Edit" (which skips
  // the confirmation — choosing Edit is itself the deliberate action).
  // Throws on failure; callers decide how to surface the error.
  async function performUndo(tx) {
    if (tx.kind === 'sale') {
      if (tx.status === 'synced') {
        await refundOrder(tx.raw.server_order_id)
        await markSaleRefunded(tx.raw.client_record_id)
        // Full resync is the simplest correct way to reflect the server's
        // authoritative stock/balance changes, rather than trying to patch
        // every affected product locally.
        await pullMasterData()
      } else {
        const items = JSON.parse(tx.raw.items_json)
        for (const item of items) {
          await incrementStockLocally(item.product_id, item.quantity)
        }
        await incrementWorkerBalanceLocally(tx.raw.worker_employee_id, tx.raw.total)
        await deleteSale(tx.raw.client_record_id)
      }
    } else if (tx.kind === 'topup') {
      const result = await reverseTopUp(tx.raw.transaction_id)
      await setWorkerBalanceLocally(tx.raw.worker_employee_id, result.worker_balance)
      await markTopUpReversed(tx.raw.id)
    }
    await refreshProducts()
    await refreshWorkers()
    await refreshPendingCount()
  }

  async function confirmUndo() {
    if (!undoConfirm) return
    const { tx } = undoConfirm
    setUndoBusy(true)
    setUndoError('')
    try {
      await performUndo(tx)
      setUndoConfirm(null)
      setDialog({ title: t.undoDone, body: t.undoDoneBody })
    } catch (err) {
      setUndoError(`${t.undoFailed}: ${err.message}`)
    } finally {
      setUndoBusy(false)
    }
  }

  // "Edit" = undo the wrong entry, then re-open the relevant entry flow
  // pre-filled with the old transaction's data so the cashier doesn't have
  // to retype everything. No confirm step: choosing "Edit" is already a
  // deliberate action.
  async function requestEdit(tx) {
    try {
      await performUndo(tx)
    } catch (err) {
      setDialog({ title: t.undoFailed, body: err.message })
      return
    }
    if (tx.kind === 'sale') {
      const items = JSON.parse(tx.raw.items_json)
      const freshProducts = await getAllProducts()
      const newCart = {}
      for (const item of items) {
        if (freshProducts.some((p) => p.id === item.product_id)) {
          newCart[item.product_id] = item.quantity
        }
      }
      setCart(newCart)
      setView('shop')
    } else if (tx.kind === 'topup') {
      const freshWorkers = await getAllWorkers()
      const worker = freshWorkers.find((w) => w.employee_id === tx.raw.worker_employee_id)
      setTopUpWorkerFound(worker || null)
      setTopUpAmount(String(tx.raw.amount))
      setTopUpNote(tx.raw.note || '')
      setTopUpOpen(true)
    }
  }

  function openCheckout() {
    if (cartItems.length === 0) return
    setCheckoutQuery('')
    setCheckoutWorker(null)
    setCheckoutError('')
    setCheckoutOpen(true)
  }

  function closeCheckout() {
    setCheckoutOpen(false)
    setCheckoutQuery('')
    setCheckoutWorker(null)
    setCheckoutError('')
  }

  function selectCheckoutWorker(worker) {
    setCheckoutWorker(worker)
    setCheckoutError('')
  }

  function backToCheckoutSearch() {
    setCheckoutWorker(null)
    setCheckoutError('')
  }

  function checkoutSearchEnter() {
    if (checkoutResults.length > 0) selectCheckoutWorker(checkoutResults[0])
  }

  async function confirmCheckout() {
    const worker = checkoutWorker
    if (!worker) return
    setCheckoutBusy(true)
    setCheckoutError('')
    try {
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
      await refreshWorkers()
      await refreshPendingCount()
      runSync(true)
    } finally {
      setCheckoutBusy(false)
    }
  }

  function openTopUp() {
    setTopUpQuery('')
    setTopUpWorkerFound(null)
    setTopUpAmount('')
    setTopUpNote('')
    setTopUpError('')
    setTopUpOpen(true)
  }

  function closeTopUp() {
    setTopUpOpen(false)
  }

  function selectTopUpWorker(worker) {
    setTopUpWorkerFound(worker)
    setTopUpError('')
  }

  function topUpSearchEnter() {
    if (topUpResults.length > 0) selectTopUpWorker(topUpResults[0])
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
      const result = await topUpWorker(topUpWorkerFound.id, amount, note)
      await setWorkerBalanceLocally(topUpWorkerFound.employee_id, result.worker.balance)
      await logTopUp({
        id: uuid(),
        workerEmployeeId: topUpWorkerFound.employee_id,
        workerName: result.worker.name,
        amount,
        note,
        balanceAfter: result.worker.balance,
        transactionId: result.transaction.id,
      })
      await refreshWorkers()
      await refreshPendingCount()
      closeTopUp()
      setDialog({
        title: t.topUpComplete,
        body: `${result.worker.name}: +${amount.toFixed(2)}. ${t.newBalance}: ${result.worker.balance.toFixed(2)}.`,
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
        <button
          className={`tab-btn ${view === 'inventory' ? 'active' : ''}`}
          onClick={() => setView('inventory')}
        >
          {t.tabInventory}
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
                  <th>{t.colAction}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const eligible = undoEligible(tx)
                  return (
                    <tr key={tx.key} className={`row-${tx.status}`}>
                      <td>{tx.kind === 'topup' ? t.topUpLabel : t.saleLabel}</td>
                      <td>{tx.worker}</td>
                      <td>{tx.amount.toFixed(2)}</td>
                      <td>{statusLabel(tx.status)}</td>
                      <td>{tx.detail}</td>
                      <td>{new Date(tx.created_at).toLocaleString()}</td>
                      <td className="tx-actions">
                        <button
                          className="tx-action-btn"
                          disabled={!eligible}
                          onClick={() => requestEdit(tx)}
                        >
                          {t.edit}
                        </button>
                        <button
                          className="tx-action-btn tx-action-undo"
                          disabled={!eligible}
                          onClick={() => requestUndo(tx)}
                        >
                          {t.undo}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : view === 'inventory' ? (
        <Inventory t={t} />
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
            {!checkoutWorker ? (
              <>
                <input
                  autoFocus
                  placeholder={t.searchWorkerPlaceholder}
                  value={checkoutQuery}
                  onChange={(e) => setCheckoutQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && checkoutSearchEnter()}
                />
                <WorkerResults
                  results={checkoutResults}
                  onSelect={selectCheckoutWorker}
                  emptyLabel={checkoutQuery.trim() ? t.noMatches : ''}
                />
                {checkoutError && <div className="error">{checkoutError}</div>}
                <div className="dialog-actions">
                  <button className="secondary" onClick={closeCheckout}>{t.cancel}</button>
                </div>
              </>
            ) : (
              <>
                <div className="worker-confirm-card">
                  <div className="worker-confirm-name">{checkoutWorker.name}</div>
                  <div className="worker-confirm-id">{t.idLabel}: {checkoutWorker.employee_id}</div>
                  <div className="worker-confirm-row">{t.currentBalance}: {checkoutWorker.balance.toFixed(2)}</div>
                  <div className="worker-confirm-row">{t.balanceAfter}: {(checkoutWorker.balance - total).toFixed(2)}</div>
                </div>
                {checkoutError && <div className="error">{checkoutError}</div>}
                <div className="dialog-actions">
                  <button className="secondary" onClick={backToCheckoutSearch}>{t.change}</button>
                  <button onClick={confirmCheckout} disabled={checkoutBusy}>
                    {t.confirmCharge}
                  </button>
                </div>
              </>
            )}
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
                  placeholder={t.searchWorkerPlaceholder}
                  value={topUpQuery}
                  onChange={(e) => setTopUpQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && topUpSearchEnter()}
                />
                <WorkerResults
                  results={topUpResults}
                  onSelect={selectTopUpWorker}
                  emptyLabel={topUpQuery.trim() ? t.noMatches : ''}
                />
                {topUpError && <div className="error">{topUpError}</div>}
                <div className="dialog-actions">
                  <button className="secondary" onClick={closeTopUp}>{t.cancel}</button>
                </div>
              </>
            ) : (
              <>
                <div className="worker-confirm-card">
                  <div className="worker-confirm-name">{topUpWorkerFound.name}</div>
                  <div className="worker-confirm-id">{t.idLabel}: {topUpWorkerFound.employee_id}</div>
                  <div className="worker-confirm-row">{t.currentBalance}: {topUpWorkerFound.balance.toFixed(2)}</div>
                </div>
                <input
                  autoFocus
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t.cashReceived}
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                />
                {parseFloat(topUpAmount) > 0 && (
                  <div className="worker-confirm-row">
                    {t.newBalance}: {(topUpWorkerFound.balance + parseFloat(topUpAmount)).toFixed(2)}
                  </div>
                )}
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

      {undoConfirm && (
        <div className="dialog-overlay" onClick={() => !undoBusy && setUndoConfirm(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>{t.undoConfirmTitle}</h2>
            <p>{undoMessageFor(undoConfirm.tx)}</p>
            <p className="undo-warning">{t.undoIrreversible}</p>
            {undoError && <div className="error">{undoError}</div>}
            <div className="dialog-actions">
              <button className="secondary" onClick={() => setUndoConfirm(null)} disabled={undoBusy}>
                {t.cancel}
              </button>
              <button onClick={confirmUndo} disabled={undoBusy}>
                {t.confirmUndo}
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
