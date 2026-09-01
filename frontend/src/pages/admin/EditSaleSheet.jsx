import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { T, FONT } from '../../utils/theme'
import Ic from '../../components/Ic'
import { formatCurrency } from '../../utils/format'
import api from '../../api'
import toast from 'react-hot-toast'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// Full edit of a completed cashier (wallet) sale — change line items, reassign
// to another worker, backdate. Stock + wallet balances are reconciled server
// side; this sheet only collects the new state.
export default function EditSaleSheet({ order, open, onClose, onSaved }) {
  const { t } = useTranslation()
  const [products, setProducts] = useState([])
  const [workers, setWorkers] = useState([])
  const [lines, setLines] = useState([])          // [{ product_id, quantity, unit_price, name }]
  const [workerId, setWorkerId] = useState(null)
  const [date, setDate] = useState(todayStr())
  const [q, setQ] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!open) return
    Promise.all([api.get('/admin/products/'), api.get('/admin/workers/')])
      .then(([p, w]) => {
        setProducts(p.data)
        setWorkers(w.data.filter(x => x.role === 'worker'))
      })
      .catch(() => toast.error(t('admin.cashier.loadFail')))
  }, [open, t])

  useEffect(() => {
    if (open && order) {
      setLines((order.items || []).map(it => ({
        product_id: it.product_id,
        quantity: it.quantity,
        unit_price: it.unit_price,
        name: it.product_name,
      })))
      setWorkerId(order.worker_id)
      setDate((order.created_at || todayStr()).slice(0, 10))
      setQ('')
    }
  }, [open, order])

  const priceFor = (pid) => {
    const existing = lines.find(l => l.product_id === pid)
    if (existing) return existing.unit_price
    const p = products.find(pp => pp.id === pid)
    return p ? p.price : 0
  }

  function setQty(pid, qty) {
    setLines(prev => {
      if (qty <= 0) return prev.filter(l => l.product_id !== pid)
      const hit = prev.find(l => l.product_id === pid)
      if (hit) return prev.map(l => l.product_id === pid ? { ...l, quantity: qty } : l)
      const p = products.find(pp => pp.id === pid)
      return [...prev, { product_id: pid, quantity: qty, unit_price: p?.price ?? 0, name: p?.name ?? `#${pid}` }]
    })
  }

  const newTotal = useMemo(
    () => lines.reduce((s, l) => s + priceFor(l.product_id) * l.quantity, 0),
    [lines, products], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const oldTotal = order?.total ?? 0
  const delta = newTotal - oldTotal

  const searchResults = q
    ? products.filter(p =>
        p.is_active && (
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.name_zh?.includes(q) ||
          p.sku?.toLowerCase().includes(q.toLowerCase())
        ),
      ).slice(0, 8)
    : []

  async function save() {
    if (lines.length === 0) { toast.error(t('admin.editSale.empty')); return }
    setSaving(true)
    try {
      const body = {
        items: lines.map(l => ({ product_id: l.product_id, quantity: l.quantity })),
      }
      if (workerId && workerId !== order.worker_id) body.worker_id = workerId
      if (date && date !== (order.created_at || '').slice(0, 10)) body.occurred_at = `${date}T12:00:00`
      await api.put(`/admin/orders/${order.id}/edit`, body)
      toast.success(t('admin.editSale.saved'))
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || t('admin.editSale.saveFail'))
    } finally {
      setSaving(false)
    }
  }

  async function del() {
    const ok = window.confirm(t('admin.editSale.deleteConfirm', {
      id: order.id,
      name: order.worker_name,
      amount: formatCurrency(oldTotal),
    }))
    if (!ok) return
    setDeleting(true)
    try {
      await api.post(`/admin/orders/${order.id}/refund`)
      toast.success(t('admin.editSale.deleted'))
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || t('admin.editSale.deleteFail'))
    } finally {
      setDeleting(false)
    }
  }

  if (!order) return null

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(12,35,64,0.45)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 220ms ease', zIndex: 50,
      }} />
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        background: T.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        zIndex: 60, maxHeight: '94%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(12,35,64,0.18)', fontFamily: FONT,
      }}>
        <div style={{ display: 'grid', placeItems: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 3, background: T.line }} />
        </div>

        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: T.ink, fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
            {t('admin.editSale.title', { id: order.id })}
          </div>
          <div onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 12, background: T.surface,
            border: `1px solid ${T.line}`, display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}>
            <Ic name="close" size={18} color={T.ink2} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Worker + date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ color: T.ink3, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>{t('admin.editSale.worker')}</div>
              <select
                value={workerId ?? ''}
                onChange={e => setWorkerId(Number(e.target.value))}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 12,
                  border: `1px solid ${workerId !== order.worker_id ? T.brand : T.line}`, background: T.surface,
                  fontSize: 14, color: T.ink, fontFamily: FONT, outline: 'none', appearance: 'none',
                }}
              >
                {workers.map(w => <option key={w.id} value={w.id}>{w.employee_id} · {w.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ color: T.ink3, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>{t('admin.editSale.date')}</div>
              <input
                type="date"
                value={date}
                max={todayStr()}
                onChange={e => setDate(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 12,
                  border: `1px solid ${date !== (order.created_at || '').slice(0, 10) ? T.brand : T.line}`, background: T.surface,
                  fontSize: 14, color: T.ink, fontFamily: FONT, outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Line items */}
          <div style={{ color: T.ink3, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{t('admin.editSale.items')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lines.map(l => (
              <div key={l.product_id} style={{
                background: T.surface, borderRadius: 14, padding: 12, border: `1px solid ${T.line}`,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.ink, fontSize: 14, fontWeight: 600 }}>{l.name}</div>
                  <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>{formatCurrency(priceFor(l.product_id))}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', background: T.surfaceAlt, borderRadius: 10, padding: 2 }}>
                  <div onClick={() => setQty(l.product_id, l.quantity - 1)} style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                    <Ic name="minus" size={14} color={T.ink2} />
                  </div>
                  <div style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, fontSize: 13, color: T.ink }}>{l.quantity}</div>
                  <div onClick={() => setQty(l.product_id, l.quantity + 1)} style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                    <Ic name="plus" size={14} color={T.ink2} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add item */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14,
          }}>
            <Ic name="search" size={16} color={T.ink3} />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={t('admin.editSale.addItem')}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: T.ink, fontFamily: FONT }}
            />
          </div>
          {searchResults.map(p => (
            <div key={p.id} onClick={() => { setQty(p.id, (lines.find(l => l.product_id === p.id)?.quantity || 0) + 1); setQ('') }} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', background: T.surface, borderRadius: 12, border: `1px solid ${T.line}`, cursor: 'pointer',
            }}>
              <div>
                <div style={{ color: T.ink, fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                <div style={{ color: T.ink3, fontSize: 11 }}>{p.sku} · {p.stock} · {formatCurrency(p.price)}</div>
              </div>
              <Ic name="plus" size={16} color={T.brand} />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          background: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '14px 20px 34px', boxShadow: '0 -4px 20px rgba(12,35,64,0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: T.ink3 }}>{t('admin.editSale.was')}</span>
            <span style={{ color: T.ink3 }}>{formatCurrency(oldTotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
            <span style={{ color: T.ink }}>{t('admin.editSale.now')}</span>
            <span style={{ color: T.ink }}>{formatCurrency(newTotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 12 }}>
            <span style={{ color: T.ink3 }}>{t('admin.editSale.walletImpact')}</span>
            <span style={{ color: delta > 0 ? T.bad : delta < 0 ? T.good : T.ink3, fontWeight: 700 }}>
              {delta > 0 ? '−' : delta < 0 ? '+' : ''}{formatCurrency(Math.abs(delta))}
            </span>
          </div>
          <div onClick={() => !deleting && !saving && del()} style={{
            padding: 13, borderRadius: 14, background: T.badSoft, color: T.bad,
            fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 10,
            cursor: deleting || saving ? 'default' : 'pointer', opacity: deleting || saving ? 0.6 : 1,
          }}>{deleting ? t('admin.common.saving') : t('admin.editSale.delete')}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div onClick={onClose} style={{
              flex: 1, padding: 15, borderRadius: 16, background: T.surfaceAlt, color: T.ink2,
              fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: 'pointer',
            }}>{t('admin.common.cancel')}</div>
            <div onClick={() => !saving && save()} style={{
              flex: 2, padding: 15, borderRadius: 16,
              background: saving ? T.brandSoft : T.brand, color: saving ? T.brand : '#fff',
              fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: saving ? 'default' : 'pointer',
            }}>{saving ? t('admin.common.saving') : t('admin.editSale.save')}</div>
          </div>
        </div>
      </div>
    </>
  )
}
