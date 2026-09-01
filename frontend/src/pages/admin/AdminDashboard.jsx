import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { T, FONT } from '../../utils/theme'
import Ic from '../../components/Ic'
import AdminLangToggle from '../../components/AdminLangToggle'
import { ProductThumb } from './Layout'
import { formatCurrency, formatDateTime } from '../../utils/format'
import { isLowStock } from '../../utils/product'
import api from '../../api'

// naive-UTC "today" as YYYY-MM-DD — matches how the backend buckets a day
function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export default function AdminDashboard() {
  const { openInvoice, refreshKey } = useOutletContext()
  const { t, i18n } = useTranslation()
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [invoices, setInvoices] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [ordersRes, productsRes, invoicesRes, summaryRes] = await Promise.all([
          api.get('/admin/orders/'),
          api.get('/admin/products/'),
          api.get('/invoices/'),
          api.get('/admin/dashboard/summary'),
        ])
        setOrders(ordersRes.data)
        setProducts(productsRes.data)
        setInvoices(invoicesRes.data)
        setSummary(summaryRes.data)
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }
    load()
  }, [refreshKey])

  const pending   = orders.filter(o => o.status === 'pending')
  const fulfilled = orders.filter(o => o.status === 'fulfilled')
  const cancelled = orders.filter(o => o.status === 'cancelled')

  // Today's figures come from the backend so the day boundary matches the rest
  // of the app; fall back to 0 while it loads.
  const salesToday    = summary?.sales_total ?? 0
  const depositsToday = summary?.deposits_total ?? 0
  const ordersToday   = summary?.order_count ?? 0
  const itemsToday    = summary?.items_sold ?? 0

  // Top items — restricted to orders created today
  const tKey = todayKey()
  const todaysOrders = orders.filter(o =>
    o.status !== 'cancelled' && (o.created_at || '').slice(0, 10) === tKey
  )
  const itemAgg = {}
  todaysOrders.forEach(o => (o.items || []).forEach(i => {
    itemAgg[i.product_name] = (itemAgg[i.product_name] || 0) + i.quantity
  }))
  const topItems = Object.entries(itemAgg).sort((a, b) => b[1] - a[1]).slice(0, 4)

  const lowStock   = products.filter(p => p.is_active && isLowStock(p.stock))
  const outOfStock = products.filter(p => p.is_active && p.stock === 0)
  const pendingInvoices = invoices.filter(inv => inv.status === 'pending_review')

  const dateLocale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-AU'
  const today = new Date().toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'short' })

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: T.ink3, fontFamily: FONT }}>
        {t('admin.common.loading')}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 8 }}>
      {/* Header */}
      <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ color: T.ink3, fontSize: 13, fontWeight: 500, letterSpacing: 0.2 }}>{today}</div>
          <div style={{ color: T.ink, fontSize: 26, fontWeight: 700, letterSpacing: -0.5, marginTop: 2 }}>{t('admin.dashboard.title')}</div>
        </div>
        <AdminLangToggle />
      </div>

      {/* Today card — spend (belanja) vs deposits, split and scoped to today */}
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${T.brand} 0%, ${T.brandDeep} 100%)`,
          borderRadius: 22, padding: 18, color: '#fff', position: 'relative', overflow: 'hidden',
          boxShadow: '0 10px 30px -8px rgba(59,130,246,0.45)',
        }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
          <div style={{ position: 'absolute', right: 30, bottom: -50, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'relative', display: 'flex', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, opacity: 0.9, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                <Ic name="cart" size={13} color="#fff" /> {t('admin.dashboard.spendToday')}
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, letterSpacing: -0.6 }}>{formatCurrency(salesToday)}</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.22)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, opacity: 0.9, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                <Ic name="wallet" size={13} color="#fff" /> {t('admin.dashboard.depositToday')}
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, letterSpacing: -0.6 }}>{formatCurrency(depositsToday)}</div>
            </div>
          </div>
          <div style={{ position: 'relative', display: 'flex', gap: 18, marginTop: 14 }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600 }}>{t('admin.dashboard.orders').toUpperCase()}</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{ordersToday}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600 }}>{t('admin.dashboard.itemsSold').toUpperCase()}</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{itemsToday}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Order queue snapshot */}
      <div style={{ padding: '0 20px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: t('admin.dashboard.statusPending'),   v: pending.length,   dot: T.warn },
          { label: t('admin.dashboard.statusFulfilled'), v: fulfilled.length, dot: T.good },
          { label: t('admin.dashboard.statusCancelled'), v: cancelled.length, dot: T.bad },
        ].map(t2 => (
          <div key={t2.label} style={{
            background: T.surface, border: `1px solid ${T.line}`,
            borderRadius: 16, padding: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: t2.dot }} />
              <div style={{ color: T.ink3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t2.label}</div>
            </div>
            <div style={{ color: T.ink, fontSize: 24, fontWeight: 700, letterSpacing: -0.4, marginTop: 4 }}>{t2.v}</div>
          </div>
        ))}
      </div>

      {/* Top items */}
      <div style={{ padding: '0 20px 6px' }}>
        <div style={{ color: T.ink, fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>{t('admin.dashboard.topItems')}</div>
      </div>
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{ background: T.surface, borderRadius: 18, border: `1px solid ${T.line}`, overflow: 'hidden' }}>
          {topItems.length === 0 ? (
            <div style={{ padding: 14, color: T.ink3, fontSize: 13, textAlign: 'center' }}>{t('admin.dashboard.noSalesToday')}</div>
          ) : topItems.map(([name, qty], i) => {
            const pct = (qty / topItems[0][1]) * 100
            return (
              <div key={name} style={{ padding: '12px 14px', borderTop: i === 0 ? 'none' : `1px solid ${T.line}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: T.ink, fontSize: 13, fontWeight: 600 }}>{name}</span>
                  <span style={{ color: T.ink2, fontSize: 13, fontWeight: 700 }}>{t('admin.dashboard.sold', { count: qty })}</span>
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
            <div style={{ color: T.ink, fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>{t('admin.dashboard.stockAlerts')}</div>
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
                  {p.stock === 0 ? t('admin.dashboard.out') : t('admin.dashboard.left', { count: p.stock })}
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
            <div style={{ color: T.ink, fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>{t('admin.dashboard.invoicesToReview')}</div>
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
                    {t('admin.dashboard.itemsCount', { count: inv.items?.length ?? 0 })} · {formatDateTime(inv.uploaded_at)}
                  </div>
                </div>
                <div>
                  <div style={{
                    padding: '2px 8px', borderRadius: 999,
                    background: T.warnSoft, color: T.warn,
                    fontSize: 10, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase',
                  }}>{t('admin.dashboard.review')}</div>
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
