import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { T } from '../../utils/theme'
import { formatCurrency, formatDateTime, formatDate, formatSlotLabel } from '../../utils/format'
import EditSaleSheet from './EditSaleSheet'
import api from '../../api'
import toast from 'react-hot-toast'

const STATUS_META = {
  pending:   { key: 'statusPending',   color: '#A06B0E', bg: '#FDEFD1' },
  ready:     { key: 'tabReady',        color: '#1D4ED8', bg: '#DBEAFE' },
  fulfilled: { key: 'statusFulfilled', color: '#0E7A4D', bg: '#D6F3E6' },
  cancelled: { key: 'statusCancelled', color: '#991B1B', bg: '#FCE0E0' },
}

function workerInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function OrderCard({ order, onOpen, onMarkReady, onFulfill, onCancel, onEdit }) {
  const { t } = useTranslation()
  const meta = STATUS_META[order.status] || STATUS_META.pending
  const metaLabel = t(meta.key.startsWith('tab') ? `admin.orders.${meta.key}` : `admin.dashboard.${meta.key}`)
  const itemCount = (order.items || []).reduce((s, i) => s + i.quantity, 0)
  const isPaid = order.payment_status === 'paid'
  const editable = order.payment_method === 'wallet' && order.status !== 'cancelled'

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
              {t('admin.orders.pickup')}: {formatDate(order.pickup_date)} · {formatSlotLabel(order.pickup_slot)}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{
            padding: '4px 10px', borderRadius: 999,
            background: meta.bg, color: meta.color,
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
          }}>{metaLabel}</div>
          {order.status === 'pending' && (
            <div style={{
              padding: '2px 8px', borderRadius: 999,
              background: isPaid ? '#D6F3E6' : '#FDEFD1',
              color: isPaid ? '#0E7A4D' : '#A06B0E',
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3,
            }}>{isPaid ? t('admin.orders.paid') : t('admin.orders.awaitingPayment')}</div>
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
            <div style={{ color: T.ink3, fontSize: 12, paddingLeft: 34 }}>{t('admin.orders.more', { count: (order.items || []).length - 3 })}</div>
          )}
        </div>
      )}

      <div style={{
        paddingTop: 10, borderTop: `1px solid ${T.line}`, marginTop: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
      }}>
        <div style={{ color: T.ink3, fontSize: 12 }}>
          {t('admin.orders.item', { count: itemCount })} · <span style={{ color: T.ink, fontWeight: 700 }}>{formatCurrency(order.total)}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
          {editable && (
            <div onClick={onEdit} style={{
              padding: '7px 12px', borderRadius: 10, background: T.surfaceAlt, color: T.ink2,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>{t('admin.orders.editSale')}</div>
          )}
          {order.status === 'pending' && isPaid && (
            <>
              <div onClick={onCancel} style={{
                padding: '7px 12px', borderRadius: 10, background: T.badSoft, color: T.bad,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>{t('admin.orders.cancel')}</div>
              <div onClick={onMarkReady} style={{
                padding: '7px 12px', borderRadius: 10, background: T.brand, color: '#fff',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>{t('admin.orders.markReady')}</div>
            </>
          )}
          {order.status === 'ready' && (
            <>
              <div onClick={onCancel} style={{
                padding: '7px 12px', borderRadius: 10, background: T.badSoft, color: T.bad,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>{t('admin.orders.cancel')}</div>
              <div onClick={onFulfill} style={{
                padding: '7px 12px', borderRadius: 10, background: '#16A34A', color: '#fff',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>{t('admin.orders.markFulfilled')}</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminOrders() {
  const { openFulfill, refreshKey, refresh } = useOutletContext()
  const { t } = useTranslation()
  const [orders, setOrders] = useState([])
  const [tab, setTab] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [editOrder, setEditOrder] = useState(null)

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
      toast.success(t('admin.orders.ready'))
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.detail || t('admin.orders.readyFail'))
    }
  }

  async function fulfillOrder(id) {
    try {
      const res = await api.put(`/admin/orders/${id}/fulfill`)
      setOrders(prev => prev.map(o => o.id === id ? res.data : o))
      toast.success(t('admin.orders.fulfilled'))
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.detail || t('admin.orders.fulfillFail'))
    }
  }

  async function cancelOrder(id) {
    try {
      const res = await api.put(`/admin/orders/${id}/cancel`)
      setOrders(prev => prev.map(o => o.id === id ? res.data : o))
      toast.success(t('admin.orders.cancelled'))
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.detail || t('admin.orders.cancelFail'))
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
    { id: 'pending',   label: t('admin.orders.tabPending') },
    { id: 'ready',     label: t('admin.orders.tabReady') },
    { id: 'fulfilled', label: t('admin.orders.tabDone') },
    { id: 'cancelled', label: t('admin.orders.tabCancelled') },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 8 }}>
      {/* Header */}
      <div style={{ padding: '8px 20px 14px' }}>
        <div style={{ color: T.ink3, fontSize: 13, fontWeight: 500 }}>{t('admin.orders.subtitle')}</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 2 }}>
          <div style={{ color: T.ink, fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>{t('admin.orders.title')}</div>
          {counts.pending > 0 && (
            <div style={{
              background: T.brand, color: '#fff',
              padding: '6px 12px', borderRadius: 999,
              fontSize: 13, fontWeight: 700,
            }}>{t('admin.orders.toPack', { count: counts.pending })}</div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: T.surfaceAlt, borderRadius: 14 }}>
          {tabDefs.map(td => {
            const active = tab === td.id
            return (
              <div key={td.id} onClick={() => setTab(td.id)} style={{
                flex: 1, padding: '9px 0', textAlign: 'center', borderRadius: 10,
                background: active ? T.surface : 'transparent',
                boxShadow: active ? '0 1px 3px rgba(12,35,64,0.08)' : 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <span style={{ color: active ? T.ink : T.ink3, fontSize: 13, fontWeight: 700 }}>{td.label}</span>
                {counts[td.id] > 0 && (
                  <span style={{
                    background: active ? T.brand : T.line,
                    color: active ? '#fff' : T.ink2,
                    fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999,
                    minWidth: 18, textAlign: 'center',
                  }}>{counts[td.id]}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Cards */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ color: T.ink3, textAlign: 'center', padding: 30, fontSize: 14 }}>{t('admin.common.loading')}</div>
        ) : visible.length === 0 ? (
          <div style={{
            background: T.surface, borderRadius: 18, padding: 30,
            border: `1px dashed ${T.line}`, textAlign: 'center', color: T.ink3, fontSize: 14,
          }}>{t('admin.orders.allCaughtUp')}</div>
        ) : visible.map(o => (
          <OrderCard
            key={o.id}
            order={o}
            onOpen={() => openFulfill(o)}
            onMarkReady={() => markReady(o.id)}
            onFulfill={() => fulfillOrder(o.id)}
            onCancel={() => cancelOrder(o.id)}
            onEdit={() => setEditOrder(o)}
          />
        ))}
      </div>

      <div style={{ height: 16 }} />

      <EditSaleSheet
        order={editOrder}
        open={!!editOrder}
        onClose={() => setEditOrder(null)}
        onSaved={refresh}
      />
    </div>
  )
}
