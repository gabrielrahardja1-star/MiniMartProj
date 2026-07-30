import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useTranslation } from 'react-i18next'
import { T, FONT } from '../../utils/theme'
import { formatCurrency, formatMonth } from '../../utils/format'
import { getProductName } from '../../utils/product'
import Ic from '../../components/Ic'
import api from '../../api'
import toast from 'react-hot-toast'

export default function Home() {
  const { openPass } = useOutletContext()
  const { user } = useAuth()
  const { items: cartItems, add } = useCart()
  const { t, i18n } = useTranslation()
  const [orders, setOrders] = useState([])
  const [spending, setSpending] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/orders/my'),
      api.get('/orders/my/spending'),
      api.get('/wallet/me'),
      api.get('/products/'),
    ])
      .then(([o, s, w, p]) => {
        setOrders(o.data)
        setSpending(s.data)
        setWallet(w.data)
        setProducts(p.data)
      })
      .catch(() => toast.error(t('worker.home.failedToLoad')))
      .finally(() => setLoading(false))
  }, [t])

  const activeOrder = orders.find(o => o.status === 'pending')
  const recentItems = orders[0]?.items ?? []

  const hour = new Date().getHours()
  const greetingKey = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const greeting = t(`worker.home.greeting.${greetingKey}`)
  const firstName = user?.name?.split(' ')[0] ?? 'there'
  const dateLocale = i18n.language === 'zh' ? 'zh-CN' : 'en-AU'
  const dayName = new Date().toLocaleDateString(dateLocale, { weekday: 'long' })

  function addFromOrderItem(item) {
    add({ id: item.product_id, name: item.product_name, price: item.unit_price })
  }

  return (
    <div style={{ background: T.bg, fontFamily: FONT, paddingBottom: 100 }}>
      {/* Greeting */}
      <div style={{ padding: '56px 20px 14px' }}>
        <div style={{ color: T.ink3, fontSize: 13, fontWeight: 500, letterSpacing: 0.2 }}>{dayName}</div>
        <div style={{ color: T.ink, fontSize: 26, fontWeight: 700, letterSpacing: -0.5, marginTop: 2 }}>
          {greeting}, {firstName}
        </div>
      </div>

      {/* Active order card */}
      {activeOrder && (
        <div style={{ padding: '0 20px 16px' }}>
          <button
            onClick={() => openPass(activeOrder)}
            style={{
              background: `linear-gradient(135deg, ${T.brand} 0%, ${T.brandDeep} 100%)`,
              borderRadius: 22, padding: 18, color: '#fff',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 10px 30px -8px rgba(59,130,246,0.45)',
              border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
              fontFamily: FONT,
            }}
          >
            <div style={{
              position: 'absolute', right: -40, top: -40,
              width: 160, height: 160, borderRadius: '50%',
              background: 'rgba(255,255,255,0.10)',
            }} />

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 12, fontWeight: 600, opacity: 0.9,
              letterSpacing: 0.3, textTransform: 'uppercase',
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: 4, background: '#62E6A8',
                boxShadow: '0 0 0 4px rgba(98,230,168,0.25)',
              }} />
              {t('worker.home.orderInProgress')}
            </div>

            <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>
              {t('worker.home.order')} #{activeOrder.id}
            </div>
            <div style={{ fontSize: 14, opacity: 0.85, marginTop: 2 }}>
              {activeOrder.items.length} items · {formatCurrency(activeOrder.total)}
            </div>

            <div style={{
              marginTop: 14, display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)',
              borderRadius: 14, padding: '10px 12px',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: '#fff', display: 'grid', placeItems: 'center',
              }}>
                <Ic name="qr" size={26} color={T.brandDeep} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{t('worker.home.tapToViewPickupPass')}</div>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>
                  PASS · MM{activeOrder.id}
                </div>
              </div>
              <Ic name="arrow" size={18} color="#fff" />
            </div>
          </button>
        </div>
      )}

      {/* Wallet balance */}
      {wallet && (
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{
            background: T.surface, borderRadius: 20, padding: 18,
            border: `1px solid ${T.line}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  color: T.ink3, fontSize: 12, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: 0.5,
                }}>
                  <Ic name="wallet" size={13} color={T.ink3} />
                  {t('worker.home.walletBalance')}
                </div>
                <div style={{ marginTop: 4, color: T.ink, fontSize: 24, fontWeight: 700, letterSpacing: -0.4 }}>
                  {formatCurrency(wallet.balance)}
                </div>
              </div>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: T.goodSoft, display: 'grid', placeItems: 'center',
              }}>
                <Ic name="wallet" size={20} color={T.good} />
              </div>
            </div>
            <div style={{ marginTop: 12, color: T.ink3, fontSize: 12 }}>
              {t('worker.home.topUpHint')}
            </div>
          </div>
        </div>
      )}

      {/* Spending card */}
      {spending && (
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{
            background: T.surface, borderRadius: 20, padding: 18,
            border: `1px solid ${T.line}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  color: T.ink3, fontSize: 12, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: 0.5,
                }}>
                  <Ic name="wallet" size={13} color={T.ink3} />
                  {t('worker.home.totalSpending')} · {formatMonth(spending.month)}
                </div>
                <div style={{ marginTop: 4, color: T.ink, fontSize: 24, fontWeight: 700, letterSpacing: -0.4 }}>
                  {formatCurrency(spending.total_spend)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: T.ink3, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{t('worker.home.orders')}</div>
                <div style={{ color: T.ink2, fontSize: 14, fontWeight: 600 }}>{spending.order_count}</div>
              </div>
            </div>
            <div style={{ marginTop: 12, color: T.ink3, fontSize: 12 }}>
              {t('worker.home.autoDeducted')}
            </div>
          </div>
        </div>
      )}

      {/* Order again */}
      {recentItems.length > 0 && (
        <>
          <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ color: T.ink, fontSize: 18, fontWeight: 700, letterSpacing: -0.2 }}>{t('worker.home.orderAgain')}</div>
          </div>
          <div style={{ padding: '0 0 18px' }}>
            <div style={{
              display: 'flex', gap: 12, overflowX: 'auto',
              padding: '4px 20px', scrollbarWidth: 'none',
            }}>
              {recentItems.map((item, i) => {
                const inCart = cartItems.find(c => c.product_id === item.product_id)
                return (
                  <div key={i} style={{
                    minWidth: 148, background: T.surface, borderRadius: 18,
                    border: `1px solid ${T.line}`, padding: 12,
                    display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0,
                  }}>
                    <div style={{
                      width: '100%', height: 80, borderRadius: 12,
                      background: T.surfaceAlt, display: 'grid', placeItems: 'center',
                    }}>
                      <Ic name="box" size={32} color={T.ink3} />
                    </div>
                    <div style={{
                      color: T.ink, fontSize: 13, fontWeight: 600,
                      lineHeight: 1.25, minHeight: 32,
                    }}>{item.product_name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ color: T.ink, fontSize: 14, fontWeight: 700 }}>
                        {formatCurrency(item.unit_price)}
                      </div>
                      <button
                        onClick={() => addFromOrderItem(item)}
                        style={{
                          width: 32, height: 32, borderRadius: 10,
                          background: inCart ? T.brand : T.brandSoft,
                          border: 'none', cursor: 'pointer',
                          display: 'grid', placeItems: 'center',
                        }}
                      >
                        {inCart
                          ? <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>×{inCart.quantity}</span>
                          : <Ic name="plus" size={16} color={T.brand} />}
                      </button>
                    </div>
                  </div>
                )
              })}
              <div style={{ minWidth: 1 }} />
            </div>
          </div>
        </>
      )}

      {/* In stock today */}
      {products.length > 0 && (
        <>
          <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ic name="flame" size={18} color={T.warn} />
            <div style={{ color: T.ink, fontSize: 18, fontWeight: 700, letterSpacing: -0.2 }}>{t('worker.home.inStockToday')}</div>
          </div>
          <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {products.slice(0, 4).map(p => {
              const inCart = cartItems.find(c => c.product_id === p.id)
              const lowStock = p.stock > 0 && p.stock <= 5
              return (
                <div key={p.id} style={{
                  background: T.surface, borderRadius: 18, padding: 12,
                  border: `1px solid ${T.line}`,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 12,
                    background: T.surfaceAlt, display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}>
                    <Ic name="box" size={24} color={T.ink3} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: T.ink, fontSize: 14, fontWeight: 600 }}>{getProductName(p, i18n.language)}</div>
                    <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>
                      {p.unit}
                      {lowStock && (
                        <span style={{ color: T.warn, marginLeft: 6 }}>· {t('worker.home.leftInStock', { count: p.stock })}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ color: T.ink, fontSize: 15, fontWeight: 700 }}>{formatCurrency(p.price)}</div>
                  <button
                    onClick={() => add(p)}
                    style={{
                      width: 36, height: 36, borderRadius: 12,
                      background: inCart ? T.brand : T.brandSoft,
                      border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center',
                    }}
                  >
                    {inCart
                      ? <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>×{inCart.quantity}</span>
                      : <Ic name="plus" size={18} color={T.brand} />}
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {!loading && products.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: T.ink3 }}>
          <Ic name="box" size={40} color={T.line} />
          <div style={{ marginTop: 12, fontSize: 16 }}>{t('worker.home.noProductsAvailable')}</div>
        </div>
      )}
    </div>
  )
}
