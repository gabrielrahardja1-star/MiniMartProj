import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { T, FONT } from '../../utils/theme'
import { formatCurrency, formatMonth, formatDate, formatSlotLabel } from '../../utils/format'
import Ic from '../../components/Ic'
import api from '../../api'
import toast from 'react-hot-toast'

const STATUS_META = {
  pending:   { label: 'Pending',    color: T.brand, bg: '#DCE8F8' },
  fulfilled: { label: 'Picked up', color: '#10B981', bg: '#D6F3E6' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FCE0E0' },
}

export default function Orders() {
  const { openPass } = useOutletContext()
  const [orders, setOrders] = useState([])
  const [spending, setSpending] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get('/orders/my'), api.get('/orders/my/spending')])
      .then(([o, s]) => { setOrders(o.data); setSpending(s.data) })
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ background: T.bg, fontFamily: FONT, paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 16px' }}>
        <div style={{ color: T.ink, fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>My orders</div>
        {spending && (
          <div style={{ color: T.ink3, fontSize: 13, marginTop: 2 }}>
            {spending.order_count} orders · {formatMonth(spending.month)}
          </div>
        )}
      </div>

      {/* Spending card */}
      {spending && spending.total_spend > 0 && (
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{
            background: `linear-gradient(135deg, ${T.brand} 0%, ${T.brandDeep} 100%)`,
            borderRadius: 20, padding: '18px 20px',
            color: '#fff', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', right: -20, top: -20,
              width: 120, height: 120, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
            }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <Ic name="wallet" size={13} color="#fff" />
                {formatMonth(spending.month)} deductions
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5, marginTop: 4 }}>
                {formatCurrency(spending.total_spend)}
              </div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
                {spending.order_count} {spending.order_count === 1 ? 'order' : 'orders'} · auto-deducted from payroll
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders list */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{
              background: T.surface, borderRadius: 18, height: 130,
              border: `1px solid ${T.line}`,
            }} />
          ))
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: T.ink3 }}>
            <Ic name="orders" size={40} color={T.line} />
            <div style={{ marginTop: 12, fontSize: 16 }}>No orders yet</div>
            <div style={{ marginTop: 6, fontSize: 13 }}>Place your first order from the shop</div>
          </div>
        ) : orders.map(order => {
          const meta = STATUS_META[order.status] || { label: order.status, color: T.ink2, bg: T.surfaceAlt }
          const dt = new Date(order.created_at)
          const date = dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
          const time = dt.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })

          return (
            <button
              key={order.id}
              onClick={() => openPass(order)}
              style={{
                background: T.surface, borderRadius: 18, padding: 16,
                border: `1px solid ${T.line}`, width: '100%', textAlign: 'left',
                cursor: 'pointer', fontFamily: FONT,
              }}
            >
              {/* Row 1: order id + status badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: T.ink, fontSize: 15, fontWeight: 700 }}>Order #{order.id}</div>
                  <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>{date} · {time}</div>
                  {order.pickup_date && order.pickup_slot && (
                    <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>
                      Pickup: {formatDate(order.pickup_date)} · {formatSlotLabel(order.pickup_slot)}
                    </div>
                  )}
                </div>
                <div style={{
                  padding: '5px 10px', borderRadius: 999,
                  background: meta.bg, color: meta.color,
                  fontSize: 11, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase',
                }}>
                  {meta.label}
                </div>
              </div>

              {/* Row 2: items preview */}
              <div style={{
                marginTop: 10, paddingTop: 10,
                borderTop: `1px solid ${T.line}`,
                display: 'flex', flexDirection: 'column', gap: 4,
              }}>
                {order.items.slice(0, 2).map((it, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: T.ink2 }}>×{it.quantity} · {it.product_name}</span>
                    <span style={{ color: T.ink3 }}>{formatCurrency(it.subtotal)}</span>
                  </div>
                ))}
                {order.items.length > 2 && (
                  <div style={{ color: T.ink3, fontSize: 12 }}>
                    + {order.items.length - 2} more item{order.items.length - 2 > 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Row 3: total + arrow */}
              <div style={{
                marginTop: 4, paddingTop: 10,
                borderTop: `1px solid ${T.line}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ color: T.ink3, fontSize: 12 }}>Total</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: T.ink, fontSize: 16, fontWeight: 700 }}>{formatCurrency(order.total)}</span>
                  <Ic name="arrow" size={16} color={T.ink3} />
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
