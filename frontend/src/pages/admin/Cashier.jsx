import { useEffect, useState } from 'react'
import { T, FONT } from '../../utils/theme'
import Ic from '../../components/Ic'
import { ProductThumb } from './Layout'
import { formatCurrency } from '../../utils/format'
import api from '../../api'
import toast from 'react-hot-toast'

// crypto.randomUUID() only exists in a secure context (HTTPS / localhost). The
// admin panel is served over plain HTTP, where it's undefined and throws — so
// fall back to getRandomValues (available on insecure origins), then Math.random.
function makeClientRecordId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const b = crypto.getRandomValues(new Uint8Array(16))
      b[6] = (b[6] & 0x0f) | 0x40
      b[8] = (b[8] & 0x3f) | 0x80
      const h = [...b].map(x => x.toString(16).padStart(2, '0'))
      return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`
    }
  } catch { /* fall through */ }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

// ── CheckoutSheet ─────────────────────────────────────────────────────────────
function CheckoutSheet({ open, items, total, workers, onClose, onCompleted }) {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(null)
  const [charging, setCharging] = useState(false)

  useEffect(() => {
    if (open) {
      setQ('')
      setSelected(null)
      setCharging(false)
    }
  }, [open])

  if (!open) return null

  const matches = q
    ? workers.filter(w =>
        w.employee_id.toLowerCase().includes(q.toLowerCase()) ||
        w.name.toLowerCase().includes(q.toLowerCase())
      )
    : workers

  const insufficient = selected && selected.balance < total

  async function charge() {
    if (!selected || insufficient) return
    setCharging(true)
    try {
      const res = await api.post('/mobile/v1/cashier/sales/sync', {
        sales: [{
          client_record_id: makeClientRecordId(),
          worker_employee_id: selected.employee_id,
          items: items.map(i => ({ product_id: i.id, quantity: i.quantity })),
        }],
      })
      const result = res.data.results[0]
      if (result.status === 'synced') {
        toast.success(`Charged ${formatCurrency(total)} to ${selected.name}`)
        onCompleted(result.worker_balance_after)
      } else {
        toast.error(result.error || 'Sale failed')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Sale failed')
    } finally {
      setCharging(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(12,35,64,0.45)', zIndex: 50,
      }} />
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        background: T.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        zIndex: 60, maxHeight: '92%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(12,35,64,0.18)', fontFamily: FONT,
      }}>
        <div style={{ display: 'grid', placeItems: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 3, background: T.line }} />
        </div>

        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: T.ink, fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>Charge to worker</div>
          <div onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 12, background: T.surface,
            border: `1px solid ${T.line}`, display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}>
            <Ic name="close" size={18} color={T.ink2} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            background: T.surface, borderRadius: 16, padding: 14, border: `1px solid ${T.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ color: T.ink3, fontSize: 12, fontWeight: 600 }}>{items.reduce((s, i) => s + i.quantity, 0)} items</div>
            <div style={{ color: T.ink, fontSize: 20, fontWeight: 700 }}>{formatCurrency(total)}</div>
          </div>

          {!selected ? (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16,
              }}>
                <Ic name="search" size={18} color={T.ink3} />
                <input
                  autoFocus
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search by name or employee ID"
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: T.ink, fontFamily: FONT }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {matches.length === 0 ? (
                  <div style={{ color: T.ink3, textAlign: 'center', padding: 20, fontSize: 14 }}>No matching worker.</div>
                ) : matches.map(w => (
                  <div key={w.id} onClick={() => setSelected(w)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: T.surface, borderRadius: 14, padding: 12,
                    border: `1px solid ${T.line}`, cursor: 'pointer',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, background: T.brandSoft,
                      display: 'grid', placeItems: 'center', flexShrink: 0,
                    }}>
                      <Ic name="profile" size={18} color={T.brand} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: T.ink, fontSize: 14, fontWeight: 600 }}>{w.name}</div>
                      <div style={{ color: T.ink3, fontSize: 12 }}>{w.employee_id}</div>
                    </div>
                    <div style={{ color: T.ink2, fontSize: 13, fontWeight: 700 }}>{formatCurrency(w.balance)}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{
              background: T.surface, borderRadius: 16, padding: 16, border: `1px solid ${T.line}`,
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: T.brandSoft,
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <Ic name="profile" size={20} color={T.brand} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.ink, fontSize: 15, fontWeight: 700 }}>{selected.name}</div>
                  <div style={{ color: T.ink3, fontSize: 12 }}>{selected.employee_id}</div>
                </div>
                <div onClick={() => setSelected(null)} style={{
                  padding: '6px 10px', borderRadius: 10, background: T.surfaceAlt,
                  color: T.ink2, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>Change</div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: 12,
                background: insufficient ? T.badSoft : T.goodSoft,
              }}>
                <div style={{ color: insufficient ? T.bad : T.good, fontSize: 13, fontWeight: 700 }}>
                  Balance {formatCurrency(selected.balance)}
                </div>
                {insufficient && (
                  <div style={{ color: T.bad, fontSize: 12, fontWeight: 700 }}>Insufficient balance</div>
                )}
              </div>
            </div>
          )}
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
          <div
            onClick={charge}
            style={{
              flex: 2, padding: 16, borderRadius: 16,
              background: (!selected || insufficient || charging) ? T.brandSoft : T.brand,
              color: (!selected || insufficient || charging) ? T.brand : '#fff',
              fontSize: 15, fontWeight: 700, textAlign: 'center',
              cursor: (!selected || insufficient || charging) ? 'default' : 'pointer',
            }}
          >{charging ? 'Charging…' : `Confirm sale · ${formatCurrency(total)}`}</div>
        </div>
      </div>
    </>
  )
}

// ── Cashier ───────────────────────────────────────────────────────────────────
export default function Cashier() {
  const [products, setProducts] = useState([])
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [cart, setCart] = useState({})
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.get('/mobile/v1/cashier/master-data')
      setProducts(res.data.products)
      setWorkers(res.data.workers)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load catalog')
    } finally {
      setLoading(false)
    }
  }

  function setQty(productId, qty) {
    setCart(prev => {
      const next = { ...prev }
      if (qty <= 0) delete next[productId]
      else next[productId] = qty
      return next
    })
  }

  const cartItems = Object.entries(cart)
    .map(([id, quantity]) => {
      const p = products.find(pp => pp.id === Number(id))
      return p ? { ...p, quantity } : null
    })
    .filter(Boolean)
  const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0)
  const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0)

  const filtered = products.filter(p =>
    q === '' || p.name.toLowerCase().includes(q.toLowerCase()) || p.name_zh?.includes(q)
  )

  function handleCompleted() {
    setCart({})
    setCheckoutOpen(false)
    load() // refresh stock + balances
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 8, paddingBottom: cartItems.length ? 110 : 16 }}>
      <div style={{ padding: '8px 20px 14px' }}>
        <div style={{ color: T.ink3, fontSize: 13, fontWeight: 500 }}>{products.length} products in stock</div>
        <div style={{ color: T.ink, fontSize: 26, fontWeight: 700, letterSpacing: -0.5, marginTop: 2 }}>Cashier</div>
      </div>

      <div style={{ padding: '0 20px 14px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
          background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16,
        }}>
          <Ic name="search" size={18} color={T.ink3} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search products"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: T.ink, fontFamily: FONT }}
          />
          {q && (
            <div onClick={() => setQ('')} style={{ display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <Ic name="close" size={16} color={T.ink3} />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ color: T.ink3, textAlign: 'center', padding: 30, fontSize: 14 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: T.ink3, textAlign: 'center', padding: 30, fontSize: 14 }}>No products match.</div>
      ) : (
        <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {filtered.map(p => {
            const qty = cart[p.id] || 0
            return (
              <div key={p.id} style={{
                background: T.surface, borderRadius: 18, overflow: 'hidden',
                border: `1px solid ${T.line}`, display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ padding: '12px 12px 6px' }}>
                  <ProductThumb name={p.name} imageUrl={p.image_url} updatedAt={p.updated_at} size={120} radius={12} />
                </div>
                <div style={{ padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ color: T.ink, fontSize: 13, fontWeight: 600, lineHeight: 1.25 }}>{p.name}</div>
                  <div style={{ color: T.ink3, fontSize: 11, marginTop: 2 }}>{p.unit} · {p.stock} in stock</div>
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ color: T.ink, fontSize: 15, fontWeight: 700 }}>{formatCurrency(p.price)}</div>
                    {qty > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', background: T.brand, borderRadius: 12, padding: 2 }}>
                        <div onClick={() => setQty(p.id, qty - 1)} style={{ width: 26, height: 26, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                          <Ic name="minus" size={14} color="#fff" />
                        </div>
                        <div style={{ minWidth: 16, textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: 12 }}>{qty}</div>
                        <div onClick={() => qty < p.stock && setQty(p.id, qty + 1)} style={{ width: 26, height: 26, display: 'grid', placeItems: 'center', cursor: qty < p.stock ? 'pointer' : 'default', opacity: qty < p.stock ? 1 : 0.5 }}>
                          <Ic name="plus" size={14} color="#fff" />
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => setQty(p.id, 1)} style={{
                        padding: '6px 12px', borderRadius: 12, background: T.brandSoft, color: T.brand,
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}>Add</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {cartItems.length > 0 && (
        <div style={{
          position: 'fixed', left: 0, right: 0, bottom: 84,
          padding: '0 20px', zIndex: 15,
        }}>
          <div
            onClick={() => setCheckoutOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: T.brand, borderRadius: 18, padding: '14px 18px',
              boxShadow: '0 8px 24px rgba(59,130,246,0.35)', cursor: 'pointer',
            }}
          >
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{itemCount} item{itemCount === 1 ? '' : 's'}</div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>Charge {formatCurrency(total)}</div>
          </div>
        </div>
      )}

      <CheckoutSheet
        open={checkoutOpen}
        items={cartItems}
        total={total}
        workers={workers}
        onClose={() => setCheckoutOpen(false)}
        onCompleted={handleCompleted}
      />
    </div>
  )
}
