import { useEffect, useState } from 'react'
import { Plus, Pencil, AlertTriangle, Search, Package } from 'lucide-react'
import { formatCurrency } from '../../utils/format'
import Modal from '../../components/Modal'
import Badge from '../../components/Badge'
import Button from '../../components/Button'
import EmptyState from '../../components/EmptyState'
import PageHeader from '../../components/PageHeader'
import { SkeletonRow } from '../../components/LoadingSkeleton'
import api from '../../api'
import toast from 'react-hot-toast'

function ProductForm({ product, onClose, onSaved }) {
  const editing = !!product
  const [form, setForm] = useState(
    product
      ? { name: product.name, sku: product.sku, price: product.price, stock: product.stock, unit: product.unit }
      : { name: '', sku: '', price: '', stock: '', unit: 'unit' }
  )
  const [saving, setSaving] = useState(false)

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/admin/products/${product.id}`, { name: form.name, price: +form.price, stock: +form.stock, unit: form.unit })
      } else {
        await api.post('/admin/products/', { ...form, price: +form.price, stock: +form.stock })
      }
      toast.success(editing ? 'Product updated' : 'Product created')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-colors duration-150"
  const disabledCls = "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="pf-name" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Product Name</label>
        <input id="pf-name" value={form.name} onChange={set('name')} placeholder="e.g. Safety Gloves" required className={inputCls} />
      </div>
      <div>
        <label htmlFor="pf-sku" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">SKU</label>
        <input id="pf-sku" value={form.sku} onChange={set('sku')} placeholder="e.g. SFT-GLV-001" required
          disabled={editing}
          className={`${inputCls} ${editing ? disabledCls : ''}`}
        />
      </div>
      <div>
        <label htmlFor="pf-unit" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Unit</label>
        <input id="pf-unit" value={form.unit} onChange={set('unit')} placeholder="e.g. pair, box, each" required className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="pf-price" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Price (AUD)</label>
          <input id="pf-price" type="number" step="0.01" min="0" value={form.price} onChange={set('price')} placeholder="0.00" required className={inputCls} />
        </div>
        <div>
          <label htmlFor="pf-stock" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Stock</label>
          <input id="pf-stock" type="number" min="0" value={form.stock} onChange={set('stock')} placeholder="0" required className={inputCls} />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
        <Button type="submit" variant="primary" loading={saving} className="flex-1">{saving ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  )
}

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'new' | product object

  const load = () => {
    setLoading(true)
    api.get('/admin/products/')
      .then(r => setProducts(r.data))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={`${products.length} products`}
        action={
          <Button variant="primary" icon={Plus} onClick={() => setModal('new')}>
            Add Product
          </Button>
        }
      />

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or SKU…"
          className="w-full border-2 border-slate-200 focus:border-amber-400 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none transition-colors duration-150"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Name', 'SKU', 'Price', 'Stock', 'Unit', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12">
                  <EmptyState icon={Package} title={search ? 'No results' : 'No products yet'} description={search ? `Nothing matches "${search}"` : 'Add your first product'} />
                </td>
              </tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="hover:bg-amber-50/40 transition-colors duration-150">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${p.is_active ? 'text-slate-900' : 'text-slate-400'}`}>{p.name}</span>
                    {p.low_stock && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded-full font-medium">
                        <AlertTriangle size={9} /> Low
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-slate-500 text-xs">{p.sku}</td>
                <td className="px-4 py-3 text-slate-700">{formatCurrency(p.price)}</td>
                <td className={`px-4 py-3 font-semibold ${p.low_stock ? 'text-orange-600' : 'text-slate-800'}`}>{p.stock}</td>
                <td className="px-4 py-3 text-slate-500">{p.unit}</td>
                <td className="px-4 py-3">
                  <Badge
                    status={p.is_active ? 'active' : 'inactive'}
                    map={{ active: 'bg-green-100 text-green-700', inactive: 'bg-slate-100 text-slate-500' }}
                    label={p.is_active ? 'Active' : 'Inactive'}
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setModal(p)}
                    aria-label={`Edit ${p.name}`}
                    className="text-slate-400 hover:text-amber-600 hover:bg-amber-50 p-1.5 rounded-lg transition-all duration-150 cursor-pointer"
                  >
                    <Pencil size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'new' ? 'New Product' : 'Edit Product'}
      >
        {modal && (
          <ProductForm
            product={modal === 'new' ? null : modal}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); load() }}
          />
        )}
      </Modal>
    </div>
  )
}
