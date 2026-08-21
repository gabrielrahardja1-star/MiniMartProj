import { useEffect, useState, useCallback } from 'react'
import { fetchAdminProducts, createProduct, updateProductStock } from './api'

// Inventory management tab: add new products and adjust stock on hand.
// Unlike the rest of the till, this hits the live admin API every time
// (fetch on mount, refetch after create/update) rather than going through
// the offline SQLite cache/sync machinery — inventory edits are a
// low-frequency manager action, not a high-frequency POS action.

const emptyForm = {
  name: '',
  name_zh: '',
  unit: '',
  price: '',
  category: '',
  sub_category: '',
}

function AddItemDialog({ t, onClose, onCreated }) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function submit() {
    const name = form.name.trim()
    const price = parseFloat(form.price)
    if (!name) {
      setError(t.nameRequired)
      return
    }
    if (!(price > 0)) {
      setError(t.priceRequired)
      return
    }
    setBusy(true)
    setError('')
    try {
      const payload = {
        name,
        name_zh: form.name_zh.trim() || null,
        price,
        stock: 0,
        unit: form.unit.trim() || 'unit',
        category: form.category.trim() || null,
        sub_category: form.sub_category.trim() || null,
      }
      const created = await createProduct(payload)
      onCreated(created)
    } catch (err) {
      setError(`${t.productCreateFailed}: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{t.addItem}</h2>
        <input
          autoFocus
          placeholder={t.itemName}
          value={form.name}
          onChange={(e) => setField('name', e.target.value)}
        />
        <input
          placeholder={t.itemNameZh}
          value={form.name_zh}
          onChange={(e) => setField('name_zh', e.target.value)}
        />
        <input
          placeholder={t.uom}
          value={form.unit}
          onChange={(e) => setField('unit', e.target.value)}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder={t.sellingPrice}
          value={form.price}
          onChange={(e) => setField('price', e.target.value)}
        />
        <input
          placeholder={t.category}
          value={form.category}
          onChange={(e) => setField('category', e.target.value)}
        />
        <input
          placeholder={t.subCategory}
          value={form.sub_category}
          onChange={(e) => setField('sub_category', e.target.value)}
        />
        {error && <div className="error">{error}</div>}
        <div className="dialog-actions">
          <button className="secondary" onClick={onClose}>{t.cancel}</button>
          <button onClick={submit} disabled={busy}>{t.save}</button>
        </div>
      </div>
    </div>
  )
}

function StockAdjuster({ t, product, onAdjusted }) {
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function adjust(sign) {
    const n = parseInt(amount, 10)
    if (!(n > 0)) return
    const delta = sign * n
    const newStock = Math.max(0, product.stock + delta)
    setBusy(true)
    setError('')
    try {
      const updated = await updateProductStock(product.id, newStock)
      onAdjusted(updated)
      setAmount('')
    } catch (err) {
      setError(`${t.stockUpdateFailed}: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stock-adjuster">
      <div className="stock-adjuster-row">
        <input
          className="stock-adjuster-input"
          type="number"
          min="1"
          step="1"
          placeholder="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy}
        />
        <button
          className="stock-adjuster-btn"
          onClick={() => adjust(-1)}
          disabled={busy || !(parseInt(amount, 10) > 0)}
        >
          −
        </button>
        <button
          className="stock-adjuster-btn"
          onClick={() => adjust(1)}
          disabled={busy || !(parseInt(amount, 10) > 0)}
        >
          +
        </button>
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  )
}

export default function Inventory({ t }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await fetchAdminProducts()
      setProducts(list)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function handleCreated(created) {
    setProducts((prev) => [created, ...prev])
    setAddOpen(false)
    setNotice(t.productCreated)
    setTimeout(() => setNotice(''), 3000)
  }

  function handleAdjusted(updated) {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  return (
    <div className="inventory-panel">
      <div className="inventory-header">
        <button onClick={() => setAddOpen(true)}>{t.addItem}</button>
        {notice && <span className="inventory-notice">{notice}</span>}
      </div>

      {loading ? (
        <div className="empty">{t.loadingProducts}</div>
      ) : error ? (
        <div className="empty">
          <div className="error">{error}</div>
          <button onClick={load}>{t.retryLoad}</button>
        </div>
      ) : products.length === 0 ? (
        <div className="empty">{t.noProductsYet}</div>
      ) : (
        <table className="sync-table">
          <thead>
            <tr>
              <th>{t.colName}</th>
              <th>{t.colCategory}</th>
              <th>{t.colUom}</th>
              <th>{t.colPrice}</th>
              <th>{t.colStock}</th>
              <th>{t.adjust}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="product-name">{p.name}</div>
                  {p.name_zh && <div className="product-name-secondary">{p.name_zh}</div>}
                </td>
                <td>
                  {p.category || ''}
                  {p.sub_category && <div className="product-name-secondary">{p.sub_category}</div>}
                </td>
                <td>{p.unit}</td>
                <td>{p.price.toFixed(2)}</td>
                <td>{p.stock}</td>
                <td>
                  <StockAdjuster t={t} product={p} onAdjusted={handleAdjusted} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {addOpen && (
        <AddItemDialog t={t} onClose={() => setAddOpen(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}
