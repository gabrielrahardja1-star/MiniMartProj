import { useState, useEffect, useCallback } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { T, FONT } from '../../utils/theme'
import Ic from '../../components/Ic'
import { formatCurrency } from '../../utils/format'
import api from '../../api'
import toast from 'react-hot-toast'

// ── Category helper (mirrors Shop.jsx) ──────────────────────────────────────
const CAT_COLORS = {
  drinks: ['#BFDBFE', '#3B82F6'],
  snacks: ['#FDE68A', '#F59E0B'],
  meals:  ['#BBF7D0', '#10B981'],
  care:   ['#FBCFE8', '#EC4899'],
  gear:   ['#DDD6FE', '#7C3AED'],
  other:  ['#E2E8F0', '#64748B'],
}
const CAT_ICONS = { drinks: 'cup', snacks: 'snack', meals: 'meal', care: 'care', gear: 'helmet', other: 'box' }

function guessCategory(name = '') {
  const n = name.toLowerCase()
  if (/water|cola|drink|juice|coffee|tea|energy|power|milk|lemon|soda|gatorade|powerade/.test(n)) return 'drinks'
  if (/chip|bar|biscuit|cookie|nut|snack|muesli|cracker|popcorn/.test(n)) return 'snacks'
  if (/wrap|bowl|rice|chicken|beef|meal|lunch|crib|fruit|salad|sandwich/.test(n)) return 'meals'
  if (/sunscreen|lip|lotion|cream|care|balm|soap|sanitiser/.test(n)) return 'care'
  if (/glove|vest|cap|helmet|glasses|boot|safety|hi-vis/.test(n)) return 'gear'
  return 'other'
}

export function ProductThumb({ name, size = 44, radius = 10 }) {
  const cat = guessCategory(name)
  const [bg, fg] = CAT_COLORS[cat] || CAT_COLORS.other
  const icon = CAT_ICONS[cat] || 'box'
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: bg, flexShrink: 0,
      display: 'grid', placeItems: 'center',
    }}>
      <Ic name={icon} size={size * 0.42} color={fg} stroke={1.8} />
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      width: 44, height: 26, borderRadius: 999, padding: 3, cursor: 'pointer',
      background: value ? T.brand : T.line, transition: 'background 200ms ease', flexShrink: 0,
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: 999, background: '#fff',
        transform: value ? 'translateX(18px)' : 'translateX(0)',
        transition: 'transform 200ms ease',
        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
      }} />
    </div>
  )
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <div style={{ color: T.ink3, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}

const inputSt = {
  width: '100%', boxSizing: 'border-box',
  padding: '12px 14px', borderRadius: 12,
  border: `1px solid ${T.line}`, background: T.surface,
  fontSize: 15, color: T.ink, fontFamily: FONT, outline: 'none',
}

// ── FulfillSheet ─────────────────────────────────────────────────────────────
function FulfillSheet({ order, open, onClose, onAdvance }) {
  const [checked, setChecked] = useState({})
  useEffect(() => { if (open) setChecked({}) }, [open, order?.id])

  if (!order) return null

  const STATUS_META = {
    pending:   { label: 'Pending',   color: '#A06B0E', bg: '#FDEFD1' },
    fulfilled: { label: 'Fulfilled', color: '#0E7A4D', bg: '#D6F3E6' },
    cancelled: { label: 'Cancelled', color: '#991B1B', bg: '#FCE0E0' },
  }
  const meta = STATUS_META[order.status] || STATUS_META.pending
  const items = order.items || []
  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const checkedQty = items.reduce((s, i, idx) => s + (checked[idx] ? i.quantity : 0), 0)
  const allChecked = items.length > 0 && items.every((_, i) => checked[i])

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
        zIndex: 60, maxHeight: '92%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(12,35,64,0.18)', fontFamily: FONT,
      }}>
        <div style={{ display: 'grid', placeItems: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 3, background: T.line }} />
        </div>

        <div style={{ padding: '8px 20px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ color: T.ink, fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>Order #{order.id}</div>
            <div style={{
              padding: '4px 10px', borderRadius: 999,
              background: meta.bg, color: meta.color,
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
            }}>{meta.label}</div>
          </div>
          <div style={{ color: T.ink2, fontSize: 14, marginTop: 4 }}>
            {order.worker_name} · {order.worker_employee_id}
          </div>
        </div>

        {order.status === 'pending' && items.length > 0 && (
          <div style={{ padding: '0 20px 14px' }}>
            <div style={{ background: T.surface, borderRadius: 16, padding: 14, border: `1px solid ${T.line}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ color: T.ink3, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Picking progress</div>
                <div style={{ color: T.ink, fontSize: 13, fontWeight: 700 }}>{checkedQty}/{totalQty}</div>
              </div>
              <div style={{ height: 8, background: T.surfaceAlt, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{
                  width: `${totalQty ? (checkedQty / totalQty) * 100 : 0}%`, height: '100%',
                  background: `linear-gradient(90deg, ${T.brandSoft}, ${T.brand})`,
                  borderRadius: 8, transition: 'width 250ms ease',
                }} />
              </div>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.length === 0 ? (
            <div style={{ color: T.ink3, textAlign: 'center', padding: 20, fontSize: 14 }}>No items</div>
          ) : items.map((it, i) => {
            const isChecked = !!checked[i]
            return (
              <div key={i}
                onClick={() => order.status === 'pending' && setChecked(c => ({ ...c, [i]: !c[i] }))}
                style={{
                  background: T.surface, borderRadius: 14, padding: 12,
                  border: `1px solid ${isChecked ? T.brand : T.line}`,
                  display: 'flex', alignItems: 'center', gap: 12,
                  cursor: order.status === 'pending' ? 'pointer' : 'default',
                  opacity: isChecked ? 0.6 : 1, transition: 'all 200ms ease',
                }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 8,
                  border: `2px solid ${isChecked ? T.brand : T.line}`,
                  background: isChecked ? T.brand : T.surface,
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  {isChecked && <Ic name="check" size={14} color="#fff" stroke={3} />}
                </div>
                <ProductThumb name={it.product_name} size={42} radius={10} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: T.ink, fontSize: 14, fontWeight: 600,
                    textDecoration: isChecked ? 'line-through' : 'none',
                  }}>{it.product_name}</div>
                  <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>{it.quantity} × {formatCurrency(it.unit_price)}</div>
                </div>
                <div style={{
                  padding: '4px 10px', borderRadius: 8, background: T.surfaceAlt,
                  color: T.ink2, fontWeight: 700, fontSize: 13, flexShrink: 0,
                }}>×{it.quantity}</div>
              </div>
            )
          })}
        </div>

        <div style={{
          background: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '16px 20px 34px', boxShadow: '0 -4px 20px rgba(12,35,64,0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: T.ink3, fontSize: 13 }}>Order total</span>
            <span style={{ color: T.ink, fontSize: 16, fontWeight: 700 }}>{formatCurrency(order.total)}</span>
          </div>
          {order.status === 'pending' && (
            <div onClick={() => allChecked && onAdvance(order.id, onClose)} style={{
              padding: 16, borderRadius: 16,
              background: allChecked ? T.brand : T.surfaceAlt,
              color: allChecked ? '#fff' : T.ink3,
              fontSize: 15, fontWeight: 700, textAlign: 'center',
              cursor: allChecked ? 'pointer' : 'default',
            }}>
              {allChecked ? 'Mark ready for pickup' : `Pick all items (${checkedQty}/${totalQty})`}
            </div>
          )}
          {order.status === 'fulfilled' && (
            <div onClick={onClose} style={{
              padding: 16, borderRadius: 16, background: T.surfaceAlt, color: T.ink2,
              fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: 'pointer',
            }}>Close</div>
          )}
        </div>
      </div>
    </>
  )
}

// ── EditProductSheet ─────────────────────────────────────────────────────────
function EditProductSheet({ product, open, onClose, onSaved }) {
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (product) setDraft({ ...product }) }, [product?.id, open])

  if (!draft) return null

  async function save() {
    setSaving(true)
    try {
      await api.put(`/admin/products/${draft.id}`, {
        name: draft.name,
        unit: draft.unit,
        price: draft.price,
        stock: draft.stock,
        is_active: draft.is_active,
      })
      toast.success('Product updated')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

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
        zIndex: 60, maxHeight: '92%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(12,35,64,0.18)', fontFamily: FONT,
      }}>
        <div style={{ display: 'grid', placeItems: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 3, background: T.line }} />
        </div>

        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: T.ink, fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>Edit product</div>
          <div onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 12, background: T.surface,
            border: `1px solid ${T.line}`, display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}>
            <Ic name="close" size={18} color={T.ink2} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: T.surface, borderRadius: 16, padding: 14, border: `1px solid ${T.line}` }}>
            <ProductThumb name={draft.name} size={56} radius={12} />
            <div style={{ flex: 1, color: T.ink3, fontSize: 12 }}>Product ID #{draft.id} · SKU {draft.sku}</div>
          </div>

          <Field label="Name">
            <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} style={inputSt} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Unit">
              <input value={draft.unit} onChange={e => setDraft({ ...draft, unit: e.target.value })} style={inputSt} />
            </Field>
            <Field label="Price (IDR)">
              <input type="number" step="0.10" value={draft.price}
                onChange={e => setDraft({ ...draft, price: parseFloat(e.target.value) || 0 })}
                style={inputSt} />
            </Field>
          </div>

          <Field label="Stock on hand">
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: 6,
            }}>
              <div onClick={() => setDraft({ ...draft, stock: Math.max(0, draft.stock - 1) })} style={{
                width: 40, height: 40, display: 'grid', placeItems: 'center', cursor: 'pointer',
                background: T.surfaceAlt, borderRadius: 10,
              }}>
                <Ic name="minus" size={16} color={T.ink2} />
              </div>
              <input type="number" value={draft.stock}
                onChange={e => setDraft({ ...draft, stock: parseInt(e.target.value) || 0 })}
                style={{ ...inputSt, border: 'none', textAlign: 'center', fontSize: 18, fontWeight: 700, padding: '0 8px' }} />
              <div onClick={() => setDraft({ ...draft, stock: draft.stock + 1 })} style={{
                width: 40, height: 40, display: 'grid', placeItems: 'center', cursor: 'pointer',
                background: T.surfaceAlt, borderRadius: 10,
              }}>
                <Ic name="plus" size={16} color={T.ink2} />
              </div>
            </div>
          </Field>

          <div style={{
            background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, padding: 14,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: T.ink, fontSize: 14, fontWeight: 700 }}>Show to workers</div>
              <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>
                {draft.is_active ? 'Visible in shop.' : 'Hidden from shop entirely.'}
              </div>
            </div>
            <Toggle value={draft.is_active} onChange={v => setDraft({ ...draft, is_active: v })} />
          </div>
        </div>

        <div style={{
          background: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '16px 20px 34px', boxShadow: '0 -4px 20px rgba(12,35,64,0.05)',
          display: 'flex', gap: 10,
        }}>
          <div onClick={onClose} style={{
            flex: 1, padding: 16, borderRadius: 16,
            background: T.surfaceAlt, color: T.ink2,
            fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: 'pointer',
          }}>Cancel</div>
          <div onClick={save} style={{
            flex: 2, padding: 16, borderRadius: 16,
            background: saving ? T.brandSoft : T.brand, color: saving ? T.brand : '#fff',
            fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: saving ? 'default' : 'pointer',
          }}>{saving ? 'Saving…' : 'Save changes'}</div>
        </div>
      </div>
    </>
  )
}

// ── InvoiceSheet ──────────────────────────────────────────────────────────────
function InvoiceSheet({ invoice, open, onClose, onResolved }) {
  const [busy, setBusy] = useState(false)
  if (!invoice) return null

  async function resolve(action) {
    setBusy(true)
    try {
      await api.post(`/invoices/${invoice.id}/${action}`)
      toast.success(action === 'approve' ? 'Invoice approved — stock updated' : 'Invoice rejected')
      onResolved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to ${action}`)
    } finally {
      setBusy(false)
    }
  }

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
        zIndex: 60, maxHeight: '88%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(12,35,64,0.18)', fontFamily: FONT,
      }}>
        <div style={{ display: 'grid', placeItems: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 3, background: T.line }} />
        </div>
        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: T.ink3, fontSize: 12, fontWeight: 600 }}>Invoice review</div>
            <div style={{ color: T.ink, fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
              {invoice.supplier_name || invoice.filename}
            </div>
          </div>
          <div onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 12, background: T.surface,
            border: `1px solid ${T.line}`, display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}>
            <Ic name="close" size={18} color={T.ink2} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: T.surface, borderRadius: 16, padding: 14, border: `1px solid ${T.line}` }}>
            {[
              { label: 'Supplier', value: invoice.supplier_name || '—' },
              { label: 'Uploaded', value: invoice.uploaded_at ? new Date(invoice.uploaded_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
              { label: 'Items', value: `${invoice.items?.length ?? 0} line items` },
            ].map(({ label, value }, i) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                marginBottom: i < 2 ? 8 : 0,
              }}>
                <span style={{ color: T.ink3, fontSize: 13 }}>{label}</span>
                <span style={{ color: T.ink, fontSize: 14, fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{
            background: T.surface, borderRadius: 16, padding: 30, border: `1px dashed ${T.line}`,
            textAlign: 'center', color: T.ink3, fontSize: 13,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}>
            <Ic name="doc" size={28} color={T.ink3} />
            <div>Invoice PDF · {invoice.filename}</div>
          </div>
        </div>

        <div style={{
          background: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '16px 20px 34px', boxShadow: '0 -4px 20px rgba(12,35,64,0.05)',
          display: 'flex', gap: 10,
        }}>
          <div onClick={() => !busy && resolve('reject')} style={{
            flex: 1, padding: 16, borderRadius: 16, background: T.badSoft, color: T.bad,
            fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}>Reject</div>
          <div onClick={() => !busy && resolve('approve')} style={{
            flex: 2, padding: 16, borderRadius: 16, background: T.good, color: '#fff',
            fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}>Approve invoice</div>
        </div>
      </div>
    </>
  )
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
function AdminTabBar({ active, pendingCount }) {
  const navigate = useNavigate()
  const tabs = [
    { id: 'dashboard', path: '/admin/dashboard', icon: 'home',    label: 'Dashboard' },
    { id: 'orders',    path: '/admin/orders',    icon: 'orders',  label: 'Orders', badge: pendingCount },
    { id: 'inventory', path: '/admin/inventory', icon: 'box',     label: 'Inventory' },
    { id: 'profile',   path: '/admin/profile',   icon: 'profile', label: 'Me' },
  ]
  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0,
      paddingBottom: 24, paddingTop: 8,
      background: 'rgba(244,248,252,0.90)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: `1px solid ${T.line}`, zIndex: 20, fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 6px' }}>
        {tabs.map(t => {
          const isActive = active === t.id
          return (
            <div key={t.id} onClick={() => navigate(t.path)} style={{
              flex: 1, padding: '6px 0', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 3, position: 'relative', cursor: 'pointer',
            }}>
              <div style={{ position: 'relative' }}>
                <Ic name={t.icon} size={24} color={isActive ? T.brand : T.ink3} stroke={isActive ? 2 : 1.7} />
                {t.badge > 0 && (
                  <div style={{
                    position: 'absolute', top: -4, right: -8,
                    minWidth: 16, height: 16, padding: '0 4px',
                    background: T.bad, color: '#fff',
                    borderRadius: 999, fontSize: 10, fontWeight: 700,
                    display: 'grid', placeItems: 'center',
                    border: `2px solid ${T.bg}`,
                  }}>{t.badge > 9 ? '9+' : t.badge}</div>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? T.brand : T.ink3 }}>{t.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── AdminLayout ───────────────────────────────────────────────────────────────
export default function AdminLayout() {
  const location = useLocation()
  const [pendingCount, setPendingCount] = useState(0)
  const [fulfillOrder, setFulfillOrder] = useState(null)
  const [editProduct, setEditProduct] = useState(null)
  const [reviewInvoice, setReviewInvoice] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const activeTab = location.pathname.split('/')[2] || 'dashboard'
  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    async function loadCount() {
      try {
        const res = await api.get('/admin/orders/', { params: { status: 'pending' } })
        setPendingCount(res.data.length)
      } catch { /* ignore */ }
    }
    loadCount()
  }, [refreshKey])

  async function advanceOrder(orderId, onClose) {
    try {
      await api.put(`/admin/orders/${orderId}/fulfill`)
      toast.success('Order marked as fulfilled')
      refresh()
      if (onClose) onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update order')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      background: T.bg, fontFamily: FONT, overflow: 'hidden',
    }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 82 }}>
        <Outlet context={{ openFulfill: setFulfillOrder, openEdit: setEditProduct, openInvoice: setReviewInvoice, refreshKey, refresh }} />
      </div>

      <AdminTabBar active={activeTab} pendingCount={pendingCount} />

      <FulfillSheet
        order={fulfillOrder}
        open={!!fulfillOrder}
        onClose={() => setFulfillOrder(null)}
        onAdvance={advanceOrder}
      />
      <EditProductSheet
        product={editProduct}
        open={!!editProduct}
        onClose={() => setEditProduct(null)}
        onSaved={refresh}
      />
      <InvoiceSheet
        invoice={reviewInvoice}
        open={!!reviewInvoice}
        onClose={() => setReviewInvoice(null)}
        onResolved={refresh}
      />
    </div>
  )
}
