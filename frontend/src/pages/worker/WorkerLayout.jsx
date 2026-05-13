import { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { T, FONT } from '../../utils/theme'
import { formatCurrency } from '../../utils/format'
import Ic from '../../components/Ic'
import api from '../../api'
import toast from 'react-hot-toast'
import QRCode from 'react-qr-code'

// ─── Cart Sheet ───────────────────────────────────────────────────────────────

function CartSheet({ open, onClose, onPlaced }) {
  const { items, updateQty, clear, total } = useCart()
  const [placing, setPlacing] = useState(false)
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)

  async function placeOrder() {
    if (items.length === 0 || placing) return
    setPlacing(true)
    try {
      const { data: order } = await api.post('/orders/', {
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
      })
      clear()
      onPlaced(order)
      toast.success('Order placed!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Order failed')
    } finally {
      setPlacing(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(12,35,64,0.45)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 220ms ease',
          zIndex: 49,
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        background: T.bg,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        zIndex: 50, maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(12,35,64,0.18)',
        fontFamily: FONT,
      }}>
        {/* Grabber */}
        <div style={{ display: 'grid', placeItems: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 3, background: T.line }} />
        </div>

        {/* Header */}
        <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: T.ink, fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>Your cart</div>
            <div style={{ color: T.ink3, fontSize: 13, marginTop: 2 }}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: 12,
              background: T.surface, border: `1px solid ${T.line}`,
              display: 'grid', placeItems: 'center', cursor: 'pointer',
            }}
          >
            <Ic name="close" size={18} color={T.ink2} />
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: T.ink3 }}>
              <Ic name="cart" size={36} color={T.ink3} />
              <div style={{ marginTop: 8, fontSize: 14 }}>Your cart is empty</div>
            </div>
          ) : items.map(item => (
            <div key={item.product_id} style={{
              background: T.surface, borderRadius: 16, padding: 12,
              border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: T.ink, fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{item.name}</div>
                <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>{formatCurrency(item.price)} each</div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: T.surfaceAlt, borderRadius: 12, padding: 2,
              }}>
                <button
                  onClick={() => updateQty(item.product_id, item.quantity - 1)}
                  style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', border: 'none', background: 'transparent', cursor: 'pointer' }}
                >
                  <Ic name="minus" size={14} color={T.ink2} />
                </button>
                <div style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, fontSize: 13, color: T.ink }}>
                  {item.quantity}
                </div>
                <button
                  onClick={() => updateQty(item.product_id, item.quantity + 1)}
                  style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', border: 'none', background: 'transparent', cursor: 'pointer' }}
                >
                  <Ic name="plus" size={14} color={T.ink2} />
                </button>
              </div>
              <div style={{ color: T.ink, fontSize: 13, fontWeight: 700, minWidth: 56, textAlign: 'right' }}>
                {formatCurrency(item.price * item.quantity)}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{
            background: T.surface,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: '16px 20px 32px',
            boxShadow: '0 -4px 20px rgba(12,35,64,0.05)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: T.ink3, fontSize: 13 }}>Subtotal</span>
              <span style={{ color: T.ink, fontSize: 13, fontWeight: 600 }}>{formatCurrency(total)}</span>
            </div>
            <button
              onClick={placeOrder}
              disabled={placing}
              style={{
                width: '100%', padding: '16px', borderRadius: 16,
                background: placing ? T.ink2 : T.ink,
                color: '#fff', fontSize: 16, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                border: 'none', cursor: placing ? 'not-allowed' : 'pointer',
                fontFamily: FONT,
              }}
            >
              <span style={{
                background: 'rgba(255,255,255,0.15)',
                padding: '4px 10px', borderRadius: 8, fontSize: 13,
              }}>{itemCount}</span>
              <span>{placing ? 'Placing order…' : 'Place pickup order'}</span>
              <span>{formatCurrency(total)}</span>
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Pass Overlay ─────────────────────────────────────────────────────────────

function PassOverlay({ order, onClose }) {
  const STEPS = [
    { label: 'Order placed',      detail: 'Your order has been received' },
    { label: 'Being packed',      detail: 'Staff are preparing your items' },
    { label: 'Ready for pickup',  detail: 'Come to the MiniMart counter' },
    { label: 'Picked up',         detail: 'Enjoy!' },
  ]

  // pending → step 0, fulfilled → step 3, cancelled → -1
  const stepIdx = order.status === 'fulfilled' ? 3 : order.status === 'cancelled' ? -1 : 0
  const orderTotal = order.items.reduce((s, i) => s + i.subtotal, 0)

  const placedAt = new Date(order.created_at).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  const [payStatus, setPayStatus] = useState(order.payment_status || 'unpaid')
  const [qrString, setQrString] = useState('')
  const [generating, setGenerating] = useState(false)
  const pollRef = useRef(null)

  useEffect(() => {
    if (payStatus === 'pending') {
      pollRef.current = setInterval(async () => {
        try {
          const { data } = await api.get(`/payments/status/${order.id}`)
          if (data.payment_status !== 'pending') {
            setPayStatus(data.payment_status)
            clearInterval(pollRef.current)
          }
        } catch {}
      }, 3000)
    }
    return () => clearInterval(pollRef.current)
  }, [payStatus, order.id])

  async function handleGenerateQris() {
    setGenerating(true)
    try {
      const { data } = await api.post(`/payments/qris/${order.id}`)
      setQrString(data.qr_string)
      setPayStatus('pending')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate QR')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: T.bg, overflowY: 'auto',
      fontFamily: FONT,
    }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={onClose}
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: T.surface, border: `1px solid ${T.line}`,
            display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}
        >
          <Ic name="close" size={18} color={T.ink2} />
        </button>
        <div style={{ color: T.ink, fontSize: 18, fontWeight: 700 }}>Pickup pass</div>
      </div>

      {/* Pass card */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{
          background: T.surface, borderRadius: 24, overflow: 'hidden',
          border: `1px solid ${T.line}`,
          boxShadow: '0 4px 20px rgba(12,35,64,0.06)',
        }}>
          {/* Blue header */}
          <div style={{
            padding: '20px 20px 16px',
            background: `linear-gradient(135deg, ${T.brand} 0%, ${T.brandDeep} 100%)`,
            color: '#fff', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', right: -30, top: -30,
              width: 140, height: 140, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
            }} />
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, opacity: 0.85, textTransform: 'uppercase' }}>
                MiniMart pickup
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, letterSpacing: -0.4 }}>
                Order #{order.id}
              </div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{placedAt}</div>
            </div>
          </div>

          {/* Dashed divider with notch cutouts */}
          <div style={{ position: 'relative', height: 0 }}>
            <div style={{ position: 'absolute', left: -10, top: -10, width: 20, height: 20, borderRadius: 999, background: T.bg }} />
            <div style={{ position: 'absolute', right: -10, top: -10, width: 20, height: 20, borderRadius: 999, background: T.bg }} />
            <div style={{ position: 'absolute', left: 14, right: 14, top: 0, borderTop: `1.5px dashed ${T.line}` }} />
          </div>

          {/* Status body */}
          {order.status === 'cancelled' ? (
            <div style={{ padding: '28px 20px', textAlign: 'center' }}>
              <div style={{ color: T.bad, fontSize: 18, fontWeight: 700 }}>Order Cancelled</div>
            </div>
          ) : (
            <div style={{ padding: '28px 20px 26px', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 999,
                background: order.status === 'fulfilled' ? T.goodSoft : T.brandSoft,
                display: 'grid', placeItems: 'center', marginBottom: 14,
              }}>
                <Ic
                  name={order.status === 'fulfilled' ? 'check' : 'clock'}
                  size={32}
                  color={order.status === 'fulfilled' ? T.good : T.brand}
                  stroke={2.4}
                />
              </div>
              <div style={{ color: T.ink, fontSize: 18, fontWeight: 700 }}>
                {order.status === 'fulfilled' ? 'Order picked up' : 'Order placed — being prepared'}
              </div>
              <div style={{ marginTop: 6, color: T.ink2, fontSize: 13 }}>
                Show this screen at the MiniMart counter
              </div>
              <div style={{ marginTop: 14, color: T.ink2, fontSize: 12, letterSpacing: 2, fontWeight: 700 }}>
                MM-{order.id}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status timeline */}
      {order.status !== 'cancelled' && (
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ background: T.surface, borderRadius: 18, padding: 18, border: `1px solid ${T.line}` }}>
            <div style={{ color: T.ink, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Order status</div>
            {STEPS.map((s, i) => {
              const done = i < stepIdx
              const active = i === stepIdx
              return (
                <div key={i} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  position: 'relative',
                  paddingBottom: i < STEPS.length - 1 ? 16 : 0,
                }}>
                  {i < STEPS.length - 1 && (
                    <div style={{
                      position: 'absolute', left: 11, top: 26, bottom: 0, width: 2,
                      background: done ? T.brand : T.line,
                    }} />
                  )}
                  <div style={{
                    width: 24, height: 24, borderRadius: 999, flexShrink: 0,
                    background: done || active ? T.brand : T.surface,
                    border: `2px solid ${done || active ? T.brand : T.line}`,
                    display: 'grid', placeItems: 'center',
                    boxShadow: active ? `0 0 0 4px ${T.brandSoft}` : 'none',
                  }}>
                    {done && <Ic name="check" size={12} color="#fff" stroke={3} />}
                    {active && <div style={{ width: 8, height: 8, background: '#fff', borderRadius: 999 }} />}
                  </div>
                  <div style={{ paddingTop: 2 }}>
                    <div style={{ color: done || active ? T.ink : T.ink3, fontSize: 14, fontWeight: active ? 700 : 500 }}>
                      {s.label}
                    </div>
                    {active && (
                      <div style={{ color: T.brand, fontSize: 12, fontWeight: 600, marginTop: 2 }}>{s.detail}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Payment section */}
      {order.status !== 'cancelled' && (
        <div style={{ padding: '0 20px 16px' }}>
          {payStatus === 'paid' ? (
            <div style={{
              background: '#ECFDF5', borderRadius: 18, padding: 18,
              display: 'flex', alignItems: 'center', gap: 12,
              border: '1px solid #6EE7B7',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 999,
                background: T.good, display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                <Ic name="check" size={22} color="#fff" stroke={2.5} />
              </div>
              <div>
                <div style={{ color: T.good, fontSize: 15, fontWeight: 700 }}>Payment confirmed</div>
                <div style={{ color: T.ink2, fontSize: 12, marginTop: 2 }}>QRIS payment received</div>
              </div>
            </div>
          ) : payStatus === 'pending' && qrString ? (
            <div style={{
              background: T.surface, borderRadius: 18, padding: 18,
              border: `1px solid ${T.line}`, textAlign: 'center',
            }}>
              <div style={{ color: T.ink, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Scan to pay</div>
              <div style={{ color: T.ink3, fontSize: 12, marginBottom: 16 }}>
                GoPay, OVO, DANA, or any QRIS app
              </div>
              <div style={{
                display: 'inline-block', background: '#fff',
                padding: 16, borderRadius: 16, border: `1px solid ${T.line}`,
              }}>
                <QRCode value={qrString} size={200} />
              </div>
              <div style={{ marginTop: 14, color: T.ink, fontSize: 18, fontWeight: 700 }}>
                {formatCurrency(orderTotal)}
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: 999,
                  background: '#F59E0B',
                }} />
                <span style={{ color: T.ink2, fontSize: 12 }}>Waiting for payment…</span>
              </div>
            </div>
          ) : (payStatus === 'failed' || payStatus === 'expired') ? (
            <div style={{
              background: T.surface, borderRadius: 18, padding: 18,
              border: `1px solid ${T.line}`, textAlign: 'center',
            }}>
              <div style={{ color: T.bad, fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
                {payStatus === 'expired' ? 'QR code expired — try again' : 'Payment failed — try again'}
              </div>
              <button
                onClick={handleGenerateQris}
                disabled={generating}
                style={{
                  width: '100%', padding: '14px', borderRadius: 14,
                  background: generating ? T.ink2 : T.ink,
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  border: 'none', cursor: generating ? 'not-allowed' : 'pointer',
                  fontFamily: FONT,
                }}
              >
                {generating ? 'Generating…' : 'Try again'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateQris}
              disabled={generating}
              style={{
                width: '100%', padding: '16px', borderRadius: 16,
                background: generating ? T.ink2 : T.brand,
                color: '#fff', fontSize: 16, fontWeight: 700,
                border: 'none', cursor: generating ? 'not-allowed' : 'pointer',
                fontFamily: FONT,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
            >
              {generating ? 'Generating QR…' : 'Pay with QRIS'}
            </button>
          )}
        </div>
      )}

      {/* Items list */}
      <div style={{ padding: '0 20px 48px' }}>
        <div style={{ color: T.ink, fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
          {order.items.length} {order.items.length === 1 ? 'item' : 'items'} · {formatCurrency(orderTotal)}
        </div>
        <div style={{ background: T.surface, borderRadius: 18, border: `1px solid ${T.line}`, overflow: 'hidden' }}>
          {order.items.map((it, i) => (
            <div key={i} style={{
              padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
              borderTop: i === 0 ? 'none' : `1px solid ${T.line}`,
            }}>
              <div style={{
                minWidth: 30, padding: '3px 7px', borderRadius: 8,
                background: T.surfaceAlt, color: T.ink2,
                fontSize: 12, fontWeight: 700, textAlign: 'center',
              }}>×{it.quantity}</div>
              <div style={{ flex: 1, color: T.ink, fontSize: 14, fontWeight: 600 }}>{it.product_name}</div>
              <div style={{ color: T.ink2, fontSize: 13 }}>{formatCurrency(it.subtotal)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

function TabBar({ active, cartCount, onCartOpen }) {
  const navigate = useNavigate()
  const tabs = [
    { id: 'home',    icon: 'home',    label: 'Home' },
    { id: 'shop',    icon: 'shop',    label: 'Shop' },
    { id: 'cart',    icon: 'cart',    label: 'Cart',   isCart: true },
    { id: 'orders',  icon: 'orders',  label: 'Orders' },
    { id: 'profile', icon: 'profile', label: 'Me' },
  ]

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0,
      paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
      paddingTop: 8,
      background: 'rgba(244,248,252,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: `1px solid ${T.line}`,
      zIndex: 40,
      fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 6px' }}>
        {tabs.map(t => {
          const isActive = active === t.id
          const handleClick = t.isCart ? onCartOpen : () => navigate(`/${t.id}`)
          return (
            <button
              key={t.id}
              onClick={handleClick}
              style={{
                flex: 1, padding: '6px 0',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              <div style={{ position: 'relative' }}>
                <Ic name={t.icon} size={24} color={isActive ? T.brand : T.ink3} stroke={isActive ? 2 : 1.7} />
                {t.isCart && cartCount > 0 && (
                  <div style={{
                    position: 'absolute', top: -4, right: -8,
                    minWidth: 16, height: 16, padding: '0 4px',
                    background: T.bad, color: '#fff',
                    borderRadius: 999, fontSize: 10, fontWeight: 700,
                    display: 'grid', placeItems: 'center',
                    border: `2px solid ${T.bg}`,
                  }}>
                    {cartCount > 9 ? '9+' : cartCount}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? T.brand : T.ink3 }}>
                {t.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Worker Layout ────────────────────────────────────────────────────────────

export default function WorkerLayout() {
  const [cartOpen, setCartOpen] = useState(false)
  const [passOrder, setPassOrder] = useState(null)
  const { items } = useCart()
  const location = useLocation()

  const cartCount = items.reduce((s, i) => s + i.quantity, 0)
  const activeTab = location.pathname.slice(1) // 'home' | 'shop' | 'orders' | 'profile'

  function handlePlaced(order) {
    setCartOpen(false)
    setPassOrder(order)
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: FONT }}>
      <Outlet context={{ openCart: () => setCartOpen(true), openPass: setPassOrder }} />

      <TabBar
        active={activeTab}
        cartCount={cartCount}
        onCartOpen={() => setCartOpen(true)}
      />

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onPlaced={handlePlaced}
      />

      {passOrder && (
        <PassOverlay order={passOrder} onClose={() => setPassOrder(null)} />
      )}
    </div>
  )
}
