import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { T } from '../../utils/theme'
import { formatCurrency, formatDateTime, formatDate, formatSlotLabel } from '../../utils/format'
import api from '../../api'
import toast from 'react-hot-toast'

const STATUS_META = {
  pending:   { label: 'Pending',   color: '#A06B0E', bg: '#FDEFD1' },
  ready:     { label: 'Ready',     color: '#1D4ED8', bg: '#DBEAFE' },
  fulfilled: { label: 'Fulfilled', color: '#0E7A4D', bg: '#D6F3E6' },
  cancelled: { label: 'Cancelled', color: '#991B1B', bg: '#FCE0E0' },
}

function workerInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function OrderCard({ order, onOpen, onMarkReady, onFulfill, onCancel }) {
  const meta = STATUS_META[order.status] || STATUS_META.pending
  const itemCount = (order.items || []).reduce((s, i) => s + i.quantity, 0)
  const isPaid = order.payment_status === 'paid'

  return (
    <div onClick={onOpen} style={{
      background: T.surface, borderRadius: 18, padding: 14,
      border: `1px solid ${T.line}`, cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `linear-gradient(135deg, ${T.brand}, ${T.brandDeep})`,
          color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0,
        }}>{workerInitials(order.worker_name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: T.ink, fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{order.worker_name}</div>
          <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>
            #{order.id} · {formatDateTime(order.created_at)} · {order.worker_employee_id}
          </div>
          {order.pickup_date && order.pickup_slot && (
            <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>
              Pickup: {formatDate(order.pickup_date)} · {formatSlotLabel(order.pickup_slot)}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{
            padding: '4px 10px', borderRadius: 999,
            background: meta.bg, color: meta.color,
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
          }}>{meta.label}</div>
          {order.status === 'pending' && (
            <div style={{
              padding: '2px 8px', borderRadius: 999,
              background: isPaid ? '#D6F3E6' : '#FDEFD1',
              color: isPaid ? '#0E7A4D' : '#A06B0E',
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3,
            }}>{isPaid ? 'Paid' : 'Awaiting payment'}</div>
          )}
        </div>
      </div>

      {(order.items || []).length > 0 && (
        <div style={{
          marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.line}`,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {(order.items || []).slice(0, 3).map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{
                minWidth: 26, padding: '2px 6px', borderRadius: 6, background: T.surfaceAlt,
                color: T.ink2, fontWeight: 700, fontSize: 11, textAlign: 'center',
              }}>×{it.quantity}</span>
              <span style={{ color: T.ink2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.product_name}</span>
            </div>
          ))}
          {(order.items || []).length > 3 && (
            <div style={{ color: T.ink3, fontSize: 12, paddingLeft: 34 }}>+ {(order.items || []).length - 3} more</div>
          )}
        </div>
      )}

      <div style={{
        paddingTop: 10, borderTop: `1px solid ${T.line}`, marginTop: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ color: T.ink3, fontSize: 12 }}>
          {itemCount} {itemCount === 1 ? 'item' : 'items'} · <span style={{ color: T.ink, fontWeight: 700 }}>{formatCurrency(order.total)}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
          {order.status === 'pending' && isPaid && (
            <>
              <div onClick={onCancel} style={{
                padding: '7px 12px', borderRadius: 10, background: T.badSoft, color: T.bad,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>Cancel</div>
              <div onClick={onMarkReady} style={{
                padding: '7px 12px', borderRadius: 10, background: T.brand, color: '#fff',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>Mark ready</div>
            </>
          )}
          {order.status === 'ready' && (
            <>
              <div onClick={onCancel} style={{
                padding: '7px 12px', borderRadius: 10, background: T.badSoft, color: T.bad,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>Cancel</div>
              <div onClick={onFulfill} style={{
                padding: '7px 12px', borderRadius: 10, background: '#16A34A', color: '#fff',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>Mark fulfilled</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminOrders() {
  const { openFulfill, refreshKey, refresh } = useOutletContext()
  const [orders, setOrders] = useState([])
  const [tab, setTab] = useState('pending')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await api.get('/admin/orders/')
        setOrders(res.data)
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }
    load()
  }, [refreshKey])

  async function markReady(id) {
    try {
      const res = await api.put(`/admin/orders/${id}/ready`)
      setOrders(prev => prev.map(o => o.id === id ? res.data : o))
      toast.success('Order marked as ready for pickup')
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to mark ready')
    }
  }

  async function fulfillOrder(id) {
    try {
      const res = await api.put(`/admin/orders/${id}/fulfill`)
      setOrders(prev => prev.map(o => o.id === id ? res.data : o))
      toast.success('Order fulfilled')
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to fulfill')
    }
  }

  async function cancelOrder(id) {
    try {
      const res = await api.put(`/admin/orders/${id}/cancel`)
      setOrders(prev => prev.map(o => o.id === id ? res.data : o))
      toast.success('Order cancelled')
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to cancel')
    }
  }

  const counts = {
    pending:   orders.filter(o => o.status === 'pending').length,
    ready:     orders.filter(o => o.status === 'ready').length,
    fulfilled: orders.filter(o => o.status === 'fulfilled').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  }
  const visible = orders.filter(o => o.status === tab)

  const tabDefs = [
    { id: 'pending',   label: 'Pending' },
    { id: 'ready',     label: 'Ready' },
    { id: 'fulfilled', label: 'Done' },
    { id: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 8 }}>
      {/* Header */}
      <div style={{ padding: '8px 20px 14px' }}>
        <div style={{ color: T.ink3, fontSize: 13, fontWeight: 500 }}>Order fulfillment</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 2 }}>
          <div style={{ color: T.ink, fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>Order queue</div>
          {counts.pending > 0 && (
            <div style={{
              background: T.brand, color: '#fff',
              padding: '6px 12px', borderRadius: 999,
              fontSize: 13, fontWeight: 700,
            }}>{counts.pending} to pack</div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: T.surfaceAlt, borderRadius: 14 }}>
          {tabDefs.map(t => {
            const active = tab === t.id
            return (
              <div key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: '9px 0', textAlign: 'center', borderRadius: 10,
                background: active ? T.surface : 'transparent',
                boxShadow: active ? '0 1px 3px rgba(12,35,64,0.08)' : 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <span style={{ color: active ? T.ink : T.ink3, fontSize: 13, fontWeight: 700 }}>{t.label}</span>
                {counts[t.id] > 0 && (
                  <span style={{
                    background: active ? T.brand : T.line,
                    color: active ? '#fff' : T.ink2,
                    fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999,
                    minWidth: 18, textAlign: 'center',
                  }}>{counts[t.id]}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Cards */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ color: T.ink3, textAlign: 'center', padding: 30, fontSize: 14 }}>Loading…</div>
        ) : visible.length === 0 ? (
          <div style={{
            background: T.surface, borderRadius: 18, padding: 30,
            border: `1px dashed ${T.line}`, textAlign: 'center', color: T.ink3, fontSize: 14,
          }}>All caught up — nothing in this queue.</div>
        ) : visible.map(o => (
          <OrderCard
            key={o.id}
            order={o}
            onOpen={() => openFulfill(o)}
            onMarkReady={() => markReady(o.id)}
            onFulfill={() => fulfillOrder(o.id)}
            onCancel={() => cancelOrder(o.id)}
          />
        ))}
      </div>

      <div style={{ height: 16 }} />
    </div>
  )
}
