import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/format'
import { ORDER_STATUS_CLASSES, ORDER_STATUS_LABELS } from '../../utils/status'
import Badge from '../../components/Badge'
import EmptyState from '../../components/EmptyState'
import PageHeader from '../../components/PageHeader'
import { SkeletonRow } from '../../components/LoadingSkeleton'
import api from '../../api'
import toast from 'react-hot-toast'

const TABS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'cancelled', label: 'Cancelled' },
]

function OrderRow({ order, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [confirming, setConfirming] = useState(null) // 'cancel' | null

  async function fulfill() {
    try { await api.put(`/admin/orders/${order.id}/fulfill`); toast.success('Order fulfilled'); onRefresh() }
    catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  async function cancel() {
    try { await api.put(`/admin/orders/${order.id}/cancel`); toast.success('Order cancelled'); onRefresh() }
    catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setConfirming(null) }
  }

  return (
    <>
      <tr
        className="hover:bg-amber-50/40 transition-colors duration-150 cursor-pointer"
        onClick={() => setExpanded(x => !x)}
      >
        <td className="px-4 py-3 font-mono text-slate-500 text-xs">#{order.id}</td>
        <td className="px-4 py-3">
          <p className="font-medium text-slate-900">{order.worker_name}</p>
          <p className="text-xs text-slate-400">{order.worker_employee_id}</p>
        </td>
        <td className="px-4 py-3 text-slate-500 text-sm">{formatDate(order.created_at)}</td>
        <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(order.total)}</td>
        <td className="px-4 py-3">
          <Badge status={order.status} map={ORDER_STATUS_CLASSES} label={ORDER_STATUS_LABELS[order.status]} />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {order.status === 'pending' && !confirming && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); fulfill() }}
                  className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer"
                >
                  <CheckCircle size={13} /> Fulfill
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setConfirming('cancel') }}
                  className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer"
                >
                  <XCircle size={13} /> Cancel
                </button>
              </>
            )}
            {confirming === 'cancel' && (
              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                <span className="text-xs text-slate-600 font-medium">Cancel order?</span>
                <button
                  onClick={cancel}
                  className="text-xs font-bold text-red-600 hover:text-red-800 px-2 py-1 rounded-lg bg-red-50 border border-red-200 transition-all duration-150 cursor-pointer"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg bg-slate-100 transition-all duration-150 cursor-pointer"
                >
                  No
                </button>
              </div>
            )}
            <span className="text-slate-300 ml-auto">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50">
          <td colSpan={6} className="px-4 py-3">
            <div className="space-y-1.5">
              {order.items?.map(item => (
                <div key={item.id} className="flex items-center gap-3 text-sm">
                  <span className="text-xs font-bold text-slate-400 bg-white border border-slate-200 rounded-md px-1.5 py-0.5">×{item.quantity}</span>
                  <span className="flex-1 text-slate-700">{item.product_name || `Product #${item.product_id}`}</span>
                  <span className="text-slate-500 font-medium">{formatCurrency(item.unit_price)} each</span>
                  <span className="text-slate-700 font-semibold w-20 text-right">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
              {(!order.items || order.items.length === 0) && (
                <p className="text-xs text-slate-400">No item details</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [counts, setCounts] = useState({})

  const load = () => {
    setLoading(true)
    const params = statusFilter ? `?status=${statusFilter}` : ''
    api.get(`/admin/orders/${params}`)
      .then(r => setOrders(r.data))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false))
  }

  // Load all orders once to get counts for tabs
  useEffect(() => {
    api.get('/admin/orders/').then(r => {
      const c = { '': r.data.length }
      r.data.forEach(o => { c[o.status] = (c[o.status] || 0) + 1 })
      setCounts(c)
    }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [statusFilter])

  return (
    <div>
      <PageHeader title="Orders" subtitle={`${orders.length} orders`} />

      {/* Status tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer
              ${statusFilter === tab.value
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            {tab.label}
            {tab.value === 'pending' && counts['pending'] > 0 && (
              <span className="bg-amber-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 leading-none min-w-[18px] text-center">
                {counts['pending']}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['#', 'Worker', 'Date', 'Total', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12">
                  <EmptyState icon={ShoppingBag} title="No orders" description={statusFilter ? `No ${statusFilter} orders` : 'No orders yet'} />
                </td>
              </tr>
            ) : orders.map(o => (
              <OrderRow key={o.id} order={o} onRefresh={load} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
