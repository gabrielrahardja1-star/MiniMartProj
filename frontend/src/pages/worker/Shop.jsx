import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { T, FONT } from '../../utils/theme'
import { formatCurrency } from '../../utils/format'
import Ic from '../../components/Ic'
import api from '../../api'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { id: 'all',    label: 'All',       icon: 'grid' },
  { id: 'drinks', label: 'Drinks',    icon: 'cup' },
  { id: 'snacks', label: 'Snacks',    icon: 'snack' },
  { id: 'meals',  label: 'Meals',     icon: 'meal' },
  { id: 'care',   label: 'Personal',  icon: 'care' },
  { id: 'gear',   label: 'Site Gear', icon: 'helmet' },
]

const CAT_COLORS = {
  drinks: ['#DCEEFB', '#3B82F6'],
  snacks: ['#FCEAD8', '#EA9854'],
  meals:  ['#E1F1E6', '#3FA56A'],
  care:   ['#F2E5F8', '#9A6BBE'],
  gear:   ['#FFE9D2', '#D6822E'],
  other:  ['#EAF2FA', '#8AA0BC'],
}

function guessCategory(name) {
  const n = name.toLowerCase()
  if (/water|cola|juice|coffee|energy|powerade|drink|beverage|tea|milk|soft/.test(n)) return 'drinks'
  if (/chip|bar|chocolate|biscuit|cracker|nut|almond|muesli|snack|crisp|candy|lolly/.test(n)) return 'snacks'
  if (/wrap|bowl|rice|pasta|sandwich|meal|lunch|salad|pie|burger|roll|bread|pack|crib/.test(n)) return 'meals'
  if (/sunscreen|lip|cream|soap|deodorant|shampoo|sanitiser|balm|lotion/.test(n)) return 'care'
  if (/glove|helmet|glasses|boot|vest|hi.vis|cap|safety|hard.hat|ear|plug/.test(n)) return 'gear'
  return 'other'
}

function ProductThumb({ cat, imageUrl, size = 96 }) {
  const [bg, fg] = CAT_COLORS[cat] || CAT_COLORS.other
  const iconMap = { drinks: 'cup', snacks: 'snack', meals: 'meal', care: 'care', gear: 'helmet', other: 'box' }
  if (imageUrl) {
    return (
      <div style={{ width: '100%', height: size, borderRadius: 12, overflow: 'hidden', background: bg }}>
        <img
          src={imageUrl}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }}
          onError={e => { e.target.style.display = 'none'; e.target.parentNode.style.display = 'grid'; e.target.parentNode.style.placeItems = 'center' }}
        />
      </div>
    )
  }
  return (
    <div style={{
      width: '100%', height: size, borderRadius: 12,
      background: bg, display: 'grid', placeItems: 'center',
    }}>
      <Ic name={iconMap[cat] || 'box'} size={size * 0.38} color={fg} stroke={1.6} />
    </div>
  )
}

export default function Shop() {
  const { openCart } = useOutletContext()
  const { items: cartItems, add, updateQty } = useCart()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    api.get('/products/')
      .then(r => setProducts(r.data))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false))
  }, [])

  const withCat = products.map(p => ({ ...p, cat: guessCategory(p.name) }))

  // Only show category chips that have at least one matching product
  const availableCats = new Set(withCat.map(p => p.cat))
  const visibleCategories = CATEGORIES.filter(c => c.id === 'all' || availableCats.has(c.id))

  const filtered = withCat.filter(p =>
    (cat === 'all' || p.cat === cat) &&
    (q === '' || p.name.toLowerCase().includes(q.toLowerCase()))
  )

  function handleAdd(p) {
    add(p)
    if (navigator.vibrate) navigator.vibrate(10)
  }

  return (
    <div style={{ background: T.bg, fontFamily: FONT, paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 12px' }}>
        <div style={{ color: T.ink, fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>Shop</div>
        <div style={{ color: T.ink3, fontSize: 13, marginTop: 2 }}>
          {products.length} items available
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '0 20px 14px' }}>
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
              fontSize: 15, color: T.ink, fontFamily: FONT,
            }}
          />
          {q && (
            <button
              onClick={() => setQ('')}
              style={{ display: 'grid', placeItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Ic name="close" size={16} color={T.ink3} />
            </button>
          )}
        </div>
      </div>

      {/* Category chips */}
      <div style={{ padding: '0 0 14px' }}>
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto',
          padding: '4px 20px', scrollbarWidth: 'none',
        }}>
          {visibleCategories.map(c => {
            const active = cat === c.id
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 14px', borderRadius: 999,
                  background: active ? T.ink : T.surface,
                  border: `1px solid ${active ? T.ink : T.line}`,
                  color: active ? '#fff' : T.ink2,
                  fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                  flexShrink: 0, cursor: 'pointer', fontFamily: FONT,
                }}
              >
                <Ic name={c.icon} size={15} color={active ? '#fff' : T.ink2} />
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Product grid */}
      {loading ? (
        <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              background: T.surface, borderRadius: 18, height: 220,
              border: `1px solid ${T.line}`, animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: T.ink3 }}>
          <Ic name="search" size={36} color={T.line} />
          <div style={{ marginTop: 12, fontSize: 15 }}>
            {q ? `No results for "${q}"` : 'No products in this category'}
          </div>
          {q && (
            <button
              onClick={() => setQ('')}
              style={{
                marginTop: 12, padding: '10px 20px', borderRadius: 12,
                background: T.brandSoft, color: T.brand,
                border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: FONT,
              }}
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {filtered.map(p => {
            const inCart = cartItems.find(c => c.product_id === p.id)
            const lowStock = p.stock > 0 && p.stock <= 5
            const outOfStock = p.stock === 0
            return (
              <div key={p.id} style={{
                background: T.surface, borderRadius: 18, overflow: 'hidden',
                border: `1px solid ${T.line}`, display: 'flex', flexDirection: 'column',
                opacity: outOfStock ? 0.5 : 1,
              }}>
                {/* Thumbnail */}
                <div style={{ position: 'relative', padding: '12px 12px 6px' }}>
                  <ProductThumb cat={p.cat} imageUrl={p.image_url} size={96} />
                  {lowStock && !outOfStock && (
                    <div style={{
                      position: 'absolute', top: 18, right: 18,
                      background: T.warnSoft, color: T.warn,
                      fontSize: 10, fontWeight: 700,
                      padding: '4px 8px', borderRadius: 999, letterSpacing: 0.3,
                    }}>{p.stock} LEFT</div>
                  )}
                  {outOfStock && (
                    <div style={{
                      position: 'absolute', top: 18, right: 18,
                      background: T.badSoft, color: T.bad,
                      fontSize: 10, fontWeight: 700,
                      padding: '4px 8px', borderRadius: 999,
                    }}>OUT</div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ color: T.ink, fontSize: 14, fontWeight: 600, lineHeight: 1.25 }}>{p.name}</div>
                  <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>{p.unit}</div>

                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ color: T.ink, fontSize: 16, fontWeight: 700 }}>{formatCurrency(p.price)}</div>

                    {inCart ? (
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        background: T.brand, borderRadius: 12, padding: 2,
                      }}>
                        <button
                          onClick={() => updateQty(p.id, inCart.quantity - 1)}
                          style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', border: 'none', background: 'transparent', cursor: 'pointer' }}
                        >
                          <Ic name="minus" size={16} color="#fff" />
                        </button>
                        <div style={{ minWidth: 18, textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                          {inCart.quantity}
                        </div>
                        <button
                          onClick={() => handleAdd(p)}
                          style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', border: 'none', background: 'transparent', cursor: 'pointer' }}
                        >
                          <Ic name="plus" size={16} color="#fff" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => !outOfStock && handleAdd(p)}
                        disabled={outOfStock}
                        style={{
                          padding: '7px 12px', borderRadius: 12,
                          background: T.brandSoft, color: T.brand,
                          fontSize: 13, fontWeight: 700,
                          border: 'none', cursor: outOfStock ? 'not-allowed' : 'pointer',
                          fontFamily: FONT,
                        }}
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
