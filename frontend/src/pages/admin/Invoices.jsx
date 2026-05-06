import { useEffect, useState, useRef } from 'react'
import { Upload, CheckCircle, XCircle, ChevronDown, ChevronUp, FileText, AlertCircle } from 'lucide-react'
import { formatCurrency, formatDateTime } from '../../utils/format'
import { INVOICE_STATUS_CLASSES, INVOICE_STATUS_LABELS } from '../../utils/status'
import Badge from '../../components/Badge'
import Button from '../../components/Button'
import EmptyState from '../../components/EmptyState'
import PageHeader from '../../components/PageHeader'
import api from '../../api'
import toast from 'react-hot-toast'

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'pending_review', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

function InvoiceRow({ invoice, products, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [localItems, setLocalItems] = useState(invoice.items || [])
  const [confirming, setConfirming] = useState(null) // 'reject' | null

  // Update local items when invoice changes
  useEffect(() => { setLocalItems(invoice.items || []) }, [invoice.items])

  const mappedCount = localItems.filter(i => i.product_id).length
  const totalCount = localItems.length
  const allMapped = mappedCount === totalCount && totalCount > 0

  async function mapItem(itemId, productId) {
    try {
      await api.put(`/invoices/${invoice.id}/items/${itemId}`, { product_id: +productId })
      setLocalItems(items => items.map(i => i.id === itemId ? { ...i, product_id: +productId } : i))
      onRefresh()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to map') }
  }

  async function approve() {
    try {
      await api.post(`/invoices/${invoice.id}/approve`)
      toast.success('Invoice approved — stock updated')
      onRefresh()
    } catch (err) { toast.error(err.response?.data?.detail || 'Cannot approve') }
  }

  async function reject() {
    try {
      await api.post(`/invoices/${invoice.id}/reject`)
      toast.success('Invoice rejected')
      onRefresh()
    } catch { toast.error('Failed to reject') }
    finally { setConfirming(null) }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
      {/* Header row */}
      <div
        className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors duration-150"
        onClick={() => setExpanded(x => !x)}
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{invoice.supplier_name || invoice.filename}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {formatDateTime(invoice.uploaded_at)} · {totalCount} items
            {invoice.status === 'pending_review' && totalCount > 0 && (
              <span className={`ml-2 font-medium ${allMapped ? 'text-green-600' : 'text-amber-600'}`}>
                {mappedCount}/{totalCount} mapped
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2.5 ml-4 shrink-0">
          <Badge status={invoice.status} map={INVOICE_STATUS_CLASSES} label={INVOICE_STATUS_LABELS[invoice.status]} />
          {expanded ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
        </div>
      </div>

      {/* Expanded: items */}
      {expanded && (
        <div className="border-t border-slate-100">
          <div className="px-4 py-3 space-y-2">
            {localItems.map(item => {
              const isMapped = !!item.product_id
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 text-sm rounded-lg px-3 py-2 border-l-2 transition-colors duration-150
                    ${isMapped
                      ? 'border-green-400 bg-green-50/60'
                      : 'border-amber-400 bg-amber-50/60'
                    }`}
                >
                  <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 shrink-0">×{item.quantity}</span>
                  <span className="flex-1 text-slate-700 truncate">{item.raw_product_name}</span>
                  <span className="text-slate-500 text-xs shrink-0">{formatCurrency(item.unit_price)}</span>
                  {invoice.status === 'pending_review' ? (
                    <select
                      value={item.product_id || ''}
                      onChange={e => mapItem(item.id, e.target.value)}
                      className="border-2 border-slate-200 focus:border-amber-400 rounded-lg px-2 py-1 text-xs focus:outline-none transition-colors duration-150 w-40 bg-white cursor-pointer"
                    >
                      <option value="">— map to product —</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  ) : (
                    <span className="text-xs text-slate-500 w-40 truncate">
                      {isMapped ? (
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <CheckCircle size={11} />
                          {products.find(p => p.id === item.product_id)?.name || `Product #${item.product_id}`}
                        </span>
                      ) : '—'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Actions */}
          {invoice.status === 'pending_review' && (
            <div className="border-t border-slate-100 px-4 py-3 flex items-center gap-3 bg-slate-50/50">
              {!allMapped && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mr-auto">
                  <AlertCircle size={12} />
                  Map all {totalCount - mappedCount} remaining item{totalCount - mappedCount !== 1 ? 's' : ''} before approving
                </div>
              )}
              {confirming === 'reject' ? (
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-slate-600 font-medium">Reject invoice?</span>
                  <button onClick={reject} className="text-xs font-bold text-red-600 hover:text-red-800 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 transition-all duration-150 cursor-pointer">Yes, reject</button>
                  <button onClick={() => setConfirming(null)} className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2.5 py-1.5 rounded-lg bg-slate-100 transition-all duration-150 cursor-pointer">Cancel</button>
                </div>
              ) : (
                <div className="flex gap-2 ml-auto">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={CheckCircle}
                    onClick={approve}
                    disabled={!allMapped}
                  >
                    Approve & Update Stock
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={XCircle}
                    onClick={() => setConfirming('reject')}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [products, setProducts] = useState([])
  const [uploading, setUploading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)

  const load = () => Promise.all([
    api.get('/invoices/').then(r => setInvoices(r.data)),
    api.get('/admin/products/').then(r => setProducts(r.data)),
  ]).catch(() => toast.error('Failed to load'))

  useEffect(() => { load() }, [])

  async function handleFile(file) {
    if (!file || !file.name.endsWith('.pdf')) return toast.error('Please upload a PDF file')
    const fd = new FormData()
    fd.append('file', file)
    setUploading(true)
    try {
      await api.post('/invoices/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Invoice uploaded and parsed')
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Upload failed') }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  function onFileChange(e) { handleFile(e.target.files?.[0]) }
  function onDrop(e) {
    e.preventDefault(); setDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  const filtered = statusFilter ? invoices.filter(i => i.status === statusFilter) : invoices
  const pendingCount = invoices.filter(i => i.status === 'pending_review').length

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} total`}
        action={
          <label className={`cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <Button as="span" variant="primary" icon={Upload} loading={uploading}>
              {uploading ? 'Uploading…' : 'Upload PDF'}
            </Button>
            <input ref={fileRef} type="file" accept=".pdf" onChange={onFileChange} className="hidden" />
          </label>
        }
      />

      {/* Status tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        {STATUS_TABS.map(tab => (
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
            {tab.value === 'pending_review' && pendingCount > 0 && (
              <span className="bg-amber-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 leading-none min-w-[18px] text-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 && invoices.length === 0 ? (
        /* Drag-drop empty state */
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-200 cursor-pointer
            ${dragging ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/30'}`}
          onClick={() => fileRef.current?.click()}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors duration-200 ${dragging ? 'bg-amber-100' : 'bg-slate-100'}`}>
            <FileText size={28} className={dragging ? 'text-amber-500' : 'text-slate-400'} />
          </div>
          <p className="font-semibold text-slate-700 mb-1">{dragging ? 'Drop to upload' : 'Drop a PDF invoice here'}</p>
          <p className="text-sm text-slate-400">or click to browse files</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <EmptyState icon={FileText} title="No invoices" description={`No ${statusFilter.replace('_', ' ')} invoices`} />
          ) : filtered.map(inv => (
            <InvoiceRow key={inv.id} invoice={inv} products={products} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
  )
}
