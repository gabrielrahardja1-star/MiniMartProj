import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { T } from '../../utils/theme'
import Ic from '../../components/Ic'
import { ProductThumb } from './Layout'
import { formatCurrency } from '../../utils/format'
import api from '../../api'
import toast from 'react-hot-toast'

export default function AdminInventory() {
  const { openEdit, refreshKey } = useOutletContext()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await api.get('/admin/products/')
        setProducts(res.data)
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }
    load()
  }, [refreshKey])

  async function adjustStock(product, delta) {
    const newStock = Math.max(0, product.stock + delta)
    try {
      const res = await api.put(`/admin/products/${product.id}`, { stock: newStock })
      setProducts(prev => prev.map(p => p.id === product.id ? res.data : p))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update stock')
    }
  }

  const lowCount      = products.filter(p => p.is_active && p.stock > 0 && p.stock <= 5).length
  const outCount      = products.filter(p => p.is_active && p.stock === 0).length
  const inactiveCount = products.filter(p => !p.is_active).length

  let list = products
  if (filter === 'low')      list = products.filter(p => p.is_active && p.stock > 0 && p.stock <= 5)
  if (filter === 'out')      list = products.filter(p => p.is_active && p.stock === 0)
  if (filter === 'inactive') list = products.filter(p => !p.is_active)
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q.toLowerCase()))

  const chips = [
    { id: 'all',      label: 'All',          count: products.length },
    { id: 'low',      label: 'Low stock',    count: lowCount,       color: T.warn },
    { id: 'out',      label: 'Out of stock', count: outCount,       color: T.bad },
    { id: 'inactive', label: 'Inactive',     count: inactiveCount,  color: T.ink3 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 8 }}>
      {/* Header */}
      <div style={{ padding: '8px 20px 14px' }}>
        <div style={{ color: T.ink3, fontSize: 13, fontWeight: 500 }}>{products.length} products</div>
        <div style={{ color: T.ink, fontSize: 26, fontWeight: 700, letterSpacing: -0.5, marginTop: 2 }}>Inventory</div>
      </div>

      {/* Search */}
      <div style={{ padding: '0 20px 12px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
          background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16,
        }}>
          <Ic name="search" size={18} color={T.ink3} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search products"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 15, color: T.ink,
            }}
          />
          {q && (
            <div onClick={() => setQ('')} style={{ display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <Ic name="close" size={16} color={T.ink3} />
            </div>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ padding: '0 0 14px' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 20px', scrollbarWidth: 'none' }}>
          {chips.map(c => {
            const active = filter === c.id
            return (
              <div key={c.id} onClick={() => setFilter(c.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 14px', borderRadius: 999,
                background: active ? T.ink : T.surface,
                border: `1px solid ${active ? T.ink : T.line}`,
                color: active ? '#fff' : (c.color || T.ink2),
                fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
              }}>
                {c.label}
                {c.count > 0 && (
                  <span style={{
                    background: active ? 'rgba(255,255,255,0.2)' : T.surfaceAlt,
                    color: active ? '#fff' : T.ink2,
                    fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999, minWidth: 18, textAlign: 'center',
                  }}>{c.count}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Product list */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ color: T.ink3, textAlign: 'center', padding: 30, fontSize: 14 }}>Loading…</div>
        ) : list.length === 0 ? (
          <div style={{
            background: T.surface, borderRadius: 18, padding: 30,
            border: `1px dashed ${T.line}`, textAlign: 'center', color: T.ink3, fontSize: 14,
          }}>No products match.</div>
        ) : list.map(p => {
          const out      = p.stock === 0
          const low      = p.stock > 0 && p.stock <= 5
          const inactive = !p.is_active
          const chip =
            inactive ? { label: 'Hidden',     bg: T.surfaceAlt, fg: T.ink3 } :
            out      ? { label: 'Out',        bg: T.badSoft,    fg: T.bad } :
            low      ? { label: `${p.stock}`, bg: T.warnSoft,   fg: T.warn } :
                       { label: `${p.stock}`, bg: T.goodSoft,   fg: T.good }

          return (
            <div key={p.id} style={{
              background: T.surface, borderRadius: 16, padding: 12,
              border: `1px solid ${T.line}`,
              opacity: inactive ? 0.7 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ProductThumb name={p.name} imageUrl={p.image_url} updatedAt={p.updated_at} size={48} radius={11} />
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => openEdit(p)}>
                  <div style={{ color: T.ink, fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{p.name}</div>
                  <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>{p.unit} · {formatCurrency(p.price)}</div>
                </div>
                <div style={{
                  minWidth: 48, padding: '6px 10px', borderRadius: 10,
                  background: chip.bg, color: chip.fg,
                  fontSize: 13, fontWeight: 700, textAlign: 'center',
                }}>{chip.label}</div>
              </div>

              <div style={{
                marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.line}`,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ color: T.ink3, fontSize: 12, fontWeight: 600 }}>Stock</div>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  background: T.surfaceAlt, borderRadius: 10, padding: 2,
                }}>
                  <div onClick={() => adjustStock(p, -1)} style={{
                    width: 28, height: 28, display: 'grid', placeItems: 'center', cursor: 'pointer',
                  }}>
                    <Ic name="minus" size={14} color={T.ink2} />
                  </div>
                  <div style={{ minWidth: 28, textAlign: 'center', fontWeight: 700, fontSize: 13, color: T.ink }}>{p.stock}</div>
                  <div onClick={() => adjustStock(p, 1)} style={{
                    width: 28, height: 28, display: 'grid', placeItems: 'center', cursor: 'pointer',
                  }}>
                    <Ic name="plus" size={14} color={T.ink2} />
                  </div>
                </div>
                <div style={{ flex: 1 }} />
                <div onClick={() => openEdit(p)} style={{
                  padding: '7px 12px', borderRadius: 10, background: T.brandSoft, color: T.brand,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <Ic name="edit" size={13} color={T.brand} /> Edit
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ height: 16 }} />
    </div>
  )
}
