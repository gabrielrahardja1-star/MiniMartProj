import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { T, FONT } from '../../utils/theme'
import Ic from '../../components/Ic'
import { ProductThumb } from './Layout'
import { formatCurrency, formatDateTime } from '../../utils/format'
import api from '../../api'

export default function AdminDashboard() {
  const { openInvoice, openFulfill, refreshKey } = useOutletContext()
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [ordersRes, productsRes, invoicesRes] = await Promise.all([
          api.get('/admin/orders/'),
          api.get('/admin/products/'),
          api.get('/invoices/'),
        ])
        setOrders(ordersRes.data)
        setProducts(productsRes.data)
        setInvoices(invoicesRes.data)
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }
    load()
  }, [refreshKey])

  const pending   = orders.filter(o => o.status === 'pending')
  const fulfilled = orders.filter(o => o.status === 'fulfilled')
  const cancelled = orders.filter(o => o.status === 'cancelled')
  const active    = orders.filter(o => o.status !== 'cancelled')
  const revenue   = active.reduce((s, o) => s + o.total, 0)
  const itemsSold = active.reduce((s, o) => s + (o.items?.reduce((a, i) => a + i.quantity, 0) || 0), 0)

  // Top items
  const itemAgg = {}
  active.forEach(o => (o.items || []).forEach(i => {
    itemAgg[i.product_name] = (itemAgg[i.product_name] || 0) + i.quantity
  }))
  const topItems = Object.entries(itemAgg).sort((a, b) => b[1] - a[1]).slice(0, 4)

  const lowStock   = products.filter(p => p.is_active && p.stock > 0 && p.stock <= 5)
  const outOfStock = products.filter(p => p.is_active && p.stock === 0)
  const pendingInvoices = invoices.filter(inv => inv.status === 'pending_review')

  const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: T.ink3, fontFamily: FONT }}>
        Loading…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 8 }}>
      {/* Header */}
      <div style={{ padding: '8px 20px 14px' }}>
        <div style={{ color: T.ink3, fontSize: 13, fontWeight: 500, letterSpacing: 0.2 }}>{today}</div>
        <div style={{ color: T.ink, fontSize: 26, fontWeight: 700, letterSpacing: -0.5, marginTop: 2 }}>Dashboard</div>
      </div>

      {/* Revenue card */}
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${T.brand} 0%, ${T.brandDeep} 100%)`,
          borderRadius: 22, padding: 18, color: '#fff', position: 'relative', overflow: 'hidden',
          boxShadow: '0 10px 30px -8px rgba(59,130,246,0.45)',
        }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
          <div style={{ position: 'absolute', right: 30, bottom: -50, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, opacity: 0.9, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              <Ic name="trend" size={13} color="#fff" /> Revenue today
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4, letterSpacing: -0.6 }}>{formatCurrency(revenue)}</div>
            <div style={{ display: 'flex', gap: 18, marginTop: 14 }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600 }}>ORDERS</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{active.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600 }}>ITEMS SOLD</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{itemsSold}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600 }}>AVG ORDER</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{formatCurrency(active.length ? revenue / active.length : 0)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order status row */}
      <div style={{ padding: '0 20px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'Pending',   v: pending.length,   dot: T.warn,  color: '#A06B0E', bg: '#FDEFD1' },
          { label: 'Fulfilled', v: fulfilled.length, dot: T.good,  color: '#0E7A4D', bg: '#D6F3E6' },
          { label: 'Cancelled', v: cancelled.length, dot: T.bad,   color: '#991B1B', bg: '#FCE0E0' },
        ].map(t => (
          <div key={t.label} style={{
            background: T.surface, border: `1px solid ${T.line}`,
            borderRadius: 16, padding: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: t.dot }} />
              <div style={{ color: T.ink3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t.label}</div>
            </div>
            <div style={{ color: T.ink, fontSize: 24, fontWeight: 700, letterSpacing: -0.4, marginTop: 4 }}>{t.v}</div>
          </div>
        ))}
      </div>

      {/* Top items */}
      <div style={{ padding: '0 20px 6px' }}>
        <div style={{ color: T.ink, fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>Top items today</div>
      </div>
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{ background: T.surface, borderRadius: 18, border: `1px solid ${T.line}`, overflow: 'hidden' }}>
          {topItems.length === 0 ? (
            <div style={{ padding: 14, color: T.ink3, fontSize: 13, textAlign: 'center' }}>No sales yet today</div>
          ) : topItems.map(([name, qty], i) => {
            const pct = (qty / topItems[0][1]) * 100
            return (
              <div key={name} style={{ padding: '12px 14px', borderTop: i === 0 ? 'none' : `1px solid ${T.line}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: T.ink, fontSize: 13, fontWeight: 600 }}>{name}</span>
                  <span style={{ color: T.ink2, fontSize: 13, fontWeight: 700 }}>{qty} sold</span>
                </div>
                <div style={{ height: 5, background: T.surfaceAlt, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: `linear-gradient(90deg, ${T.brandSoft}, ${T.brand})`,
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Stock alerts */}
      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <>
          <div style={{ padding: '0 20px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ic name="alert" size={16} color={T.warn} />
            <div style={{ color: T.ink, fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>Stock alerts</div>
          </div>
          <div style={{ padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...outOfStock, ...lowStock].slice(0, 4).map(p => (
              <div key={p.id} style={{
                background: T.surface, borderRadius: 14, border: `1px solid ${T.line}`,
                padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <ProductThumb name={p.name} size={36} radius={9} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.ink, fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ color: T.ink3, fontSize: 11, marginTop: 1 }}>{p.unit}</div>
                </div>
                <div style={{
                  padding: '4px 10px', borderRadius: 999,
                  background: p.stock === 0 ? T.badSoft : T.warnSoft,
                  color: p.stock === 0 ? T.bad : T.warn,
                  fontSize: 11, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase',
                }}>
                  {p.stock === 0 ? 'Out' : `${p.stock} left`}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pending invoices */}
      {pendingInvoices.length > 0 && (
        <>
          <div style={{ padding: '0 20px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ic name="doc" size={16} color={T.ink2} />
            <div style={{ color: T.ink, fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>Invoices to review</div>
            <div style={{
              marginLeft: 'auto', background: T.brand, color: '#fff',
              padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700,
            }}>{pendingInvoices.length}</div>
          </div>
          <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingInvoices.map(inv => (
              <div key={inv.id} onClick={() => openInvoice(inv)} style={{
                background: T.surface, borderRadius: 14, border: `1px solid ${T.line}`,
                padding: 14, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: T.surfaceAlt,
                  display: 'grid', placeItems: 'center',
                }}>
                  <Ic name="doc" size={20} color={T.ink2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.ink, fontSize: 14, fontWeight: 700 }}>{inv.supplier_name || inv.filename}</div>
                  <div style={{ color: T.ink3, fontSize: 12, marginTop: 1 }}>
                    {inv.items?.length ?? 0} items · {formatDateTime(inv.uploaded_at)}
                  </div>
                </div>
                <div>
                  <div style={{
                    padding: '2px 8px', borderRadius: 999,
                    background: T.warnSoft, color: T.warn,
                    fontSize: 10, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase',
                  }}>Review</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ height: 16 }} />
    </div>
  )
}
