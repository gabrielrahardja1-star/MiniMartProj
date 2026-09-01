import { useState, useEffect, useCallback, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { T, FONT } from '../../utils/theme'
import Ic from '../../components/Ic'
import { formatCurrency } from '../../utils/format'
import api from '../../api'
import toast from 'react-hot-toast'

// ── Category helper (mirrors Shop.jsx) ──────────────────────────────────────
const CAT_COLORS = {
  drinks: ['#BFDBFE', '#3B82F6'],
  snacks: ['#FDE68A', '#F59E0B'],
  meals:  ['#BBF7D0', '#10B981'],
  care:   ['#FBCFE8', '#EC4899'],
  gear:   ['#DDD6FE', '#7C3AED'],
  other:  ['#E2E8F0', '#64748B'],
}
const CAT_ICONS = { drinks: 'cup', snacks: 'snack', meals: 'meal', care: 'care', gear: 'helmet', other: 'box' }

function guessCategory(name = '') {
  const n = name.toLowerCase()
  if (/water|cola|drink|juice|coffee|tea|energy|power|milk|lemon|soda|gatorade|powerade/.test(n)) return 'drinks'
  if (/chip|bar|biscuit|cookie|nut|snack|muesli|cracker|popcorn/.test(n)) return 'snacks'
  if (/wrap|bowl|rice|chicken|beef|meal|lunch|crib|fruit|salad|sandwich/.test(n)) return 'meals'
  if (/sunscreen|lip|lotion|cream|care|balm|soap|sanitiser/.test(n)) return 'care'
  if (/glove|vest|cap|helmet|glasses|boot|safety|hi-vis/.test(n)) return 'gear'
  return 'other'
}

export function ProductThumb({ name, imageUrl, updatedAt, size = 44, radius = 10 }) {
  const cat = guessCategory(name)
  const [bg, fg] = CAT_COLORS[cat] || CAT_COLORS.other
  const icon = CAT_ICONS[cat] || 'box'
  if (imageUrl) {
    // updatedAt busts the browser cache so a changed photo shows up immediately
    // instead of the old bytes cached under the same URL.
    const src = updatedAt ? `${imageUrl}?v=${encodeURIComponent(updatedAt)}` : imageUrl
    return (
      <div style={{
        width: size, height: size, borderRadius: radius, flexShrink: 0,
        background: '#fff', border: `1px solid ${T.line}`, overflow: 'hidden',
        display: 'grid', placeItems: 'center',
      }}>
        <img
          src={src}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: size * 0.08 }}
          onError={e => {
            e.target.style.display = 'none'
            const p = e.target.parentNode
            p.style.background = bg
            p.style.border = 'none'
            p.innerHTML = ''
          }}
        />
      </div>
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: bg, flexShrink: 0,
      display: 'grid', placeItems: 'center',
    }}>
      <Ic name={icon} size={size * 0.42} color={fg} stroke={1.8} />
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      width: 44, height: 26, borderRadius: 999, padding: 3, cursor: 'pointer',
      background: value ? T.brand : T.line, transition: 'background 200ms ease', flexShrink: 0,
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: 999, background: '#fff',
        transform: value ? 'translateX(18px)' : 'translateX(0)',
        transition: 'transform 200ms ease',
        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
      }} />
    </div>
  )
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <div style={{ color: T.ink3, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}

const inputSt = {
  width: '100%', boxSizing: 'border-box',
  padding: '12px 14px', borderRadius: 12,
  border: `1px solid ${T.line}`, background: T.surface,
  fontSize: 15, color: T.ink, fontFamily: FONT, outline: 'none',
}

// ── Category dropdown (fixed list from GET /products/categories) ──────────────
export function CategorySelect({ value, onChange, categories = [] }) {
  const known = categories.some(c => c.key === value)
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      style={{ ...inputSt, appearance: 'none', cursor: 'pointer' }}
    >
      <option value="">— No category —</option>
      {!known && value && <option value={value}>{value} (current)</option>}
      {categories.map(c => (
        <option key={c.key} value={c.key}>
          {c.name_id}{c.name_zh ? ` · ${c.name_zh}` : ''}
        </option>
      ))}
    </select>
  )
}

// ── FulfillSheet ─────────────────────────────────────────────────────────────
function FulfillSheet({ order, open, onClose, onAdvance }) {
  const { t } = useTranslation()
  const [checked, setChecked] = useState({})
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecked({})
    }
  }, [open, order?.id])

  if (!order) return null

  const STATUS_META = {
    pending:   { label: t('admin.dashboard.statusPending'),   color: '#A06B0E', bg: '#FDEFD1' },
    fulfilled: { label: t('admin.dashboard.statusFulfilled'), color: '#0E7A4D', bg: '#D6F3E6' },
    cancelled: { label: t('admin.dashboard.statusCancelled'), color: '#991B1B', bg: '#FCE0E0' },
  }
  const meta = STATUS_META[order.status] || STATUS_META.pending
  const items = order.items || []
  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const checkedQty = items.reduce((s, i, idx) => s + (checked[idx] ? i.quantity : 0), 0)
  const allChecked = items.length > 0 && items.every((_, i) => checked[i])

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(12,35,64,0.45)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 220ms ease', zIndex: 50,
      }} />
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        background: T.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        zIndex: 60, maxHeight: '92%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(12,35,64,0.18)', fontFamily: FONT,
      }}>
        <div style={{ display: 'grid', placeItems: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 3, background: T.line }} />
        </div>

        <div style={{ padding: '8px 20px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ color: T.ink, fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>{t('admin.fulfill.title', { id: order.id })}</div>
            <div style={{
              padding: '4px 10px', borderRadius: 999,
              background: meta.bg, color: meta.color,
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
            }}>{meta.label}</div>
          </div>
          <div style={{ color: T.ink2, fontSize: 14, marginTop: 4 }}>
            {order.worker_name} · {order.worker_employee_id}
          </div>
        </div>

        {order.status === 'pending' && items.length > 0 && (
          <div style={{ padding: '0 20px 14px' }}>
            <div style={{ background: T.surface, borderRadius: 16, padding: 14, border: `1px solid ${T.line}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ color: T.ink3, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{t('admin.fulfill.pickingProgress')}</div>
                <div style={{ color: T.ink, fontSize: 13, fontWeight: 700 }}>{checkedQty}/{totalQty}</div>
              </div>
              <div style={{ height: 8, background: T.surfaceAlt, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{
                  width: `${totalQty ? (checkedQty / totalQty) * 100 : 0}%`, height: '100%',
                  background: `linear-gradient(90deg, ${T.brandSoft}, ${T.brand})`,
                  borderRadius: 8, transition: 'width 250ms ease',
                }} />
              </div>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.length === 0 ? (
            <div style={{ color: T.ink3, textAlign: 'center', padding: 20, fontSize: 14 }}>{t('admin.fulfill.noItems')}</div>
          ) : items.map((it, i) => {
            const isChecked = !!checked[i]
            return (
              <div key={i}
                onClick={() => order.status === 'pending' && setChecked(c => ({ ...c, [i]: !c[i] }))}
                style={{
                  background: T.surface, borderRadius: 14, padding: 12,
                  border: `1px solid ${isChecked ? T.brand : T.line}`,
                  display: 'flex', alignItems: 'center', gap: 12,
                  cursor: order.status === 'pending' ? 'pointer' : 'default',
                  opacity: isChecked ? 0.6 : 1, transition: 'all 200ms ease',
                }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 8,
                  border: `2px solid ${isChecked ? T.brand : T.line}`,
                  background: isChecked ? T.brand : T.surface,
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  {isChecked && <Ic name="check" size={14} color="#fff" stroke={3} />}
                </div>
                <ProductThumb name={it.product_name} size={42} radius={10} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: T.ink, fontSize: 14, fontWeight: 600,
                    textDecoration: isChecked ? 'line-through' : 'none',
                  }}>{it.product_name}</div>
                  <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>{it.quantity} × {formatCurrency(it.unit_price)}</div>
                </div>
                <div style={{
                  padding: '4px 10px', borderRadius: 8, background: T.surfaceAlt,
                  color: T.ink2, fontWeight: 700, fontSize: 13, flexShrink: 0,
                }}>×{it.quantity}</div>
              </div>
            )
          })}
        </div>

        <div style={{
          background: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '16px 20px 34px', boxShadow: '0 -4px 20px rgba(12,35,64,0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: T.ink3, fontSize: 13 }}>{t('admin.fulfill.orderTotal')}</span>
            <span style={{ color: T.ink, fontSize: 16, fontWeight: 700 }}>{formatCurrency(order.total)}</span>
          </div>
          {order.status === 'pending' && (
            <div onClick={() => allChecked && onAdvance(order.id, onClose)} style={{
              padding: 16, borderRadius: 16,
              background: allChecked ? T.brand : T.surfaceAlt,
              color: allChecked ? '#fff' : T.ink3,
              fontSize: 15, fontWeight: 700, textAlign: 'center',
              cursor: allChecked ? 'pointer' : 'default',
            }}>
              {allChecked ? t('admin.fulfill.markReady') : t('admin.fulfill.pickAll', { done: checkedQty, total: totalQty })}
            </div>
          )}
          {order.status === 'fulfilled' && (
            <div onClick={onClose} style={{
              padding: 16, borderRadius: 16, background: T.surfaceAlt, color: T.ink2,
              fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: 'pointer',
            }}>{t('admin.fulfill.close')}</div>
          )}
        </div>
      </div>
    </>
  )
}

// ── EditProductSheet ─────────────────────────────────────────────────────────
function EditProductSheet({ product, open, onClose, onSaved, categories = [] }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  useEffect(() => {
    if (product) {
      setDraft({ ...product })
    }
  }, [product, open])

  if (!draft) return null

  async function uploadImage(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post(`/admin/products/${draft.id}/image`, form)
      setDraft(res.data)
      onSaved()
      toast.success(t('admin.editProduct.photoUpdated'))
    } catch (err) {
      toast.error(err.response?.data?.detail || t('admin.editProduct.photoFail'))
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    const sku = (draft.sku || '').trim()
    if (!sku) { toast.error(t('admin.editProduct.sku')); return }
    setSaving(true)
    try {
      await api.put(`/admin/products/${draft.id}`, {
        name: draft.name,
        name_zh: (draft.name_zh || '').trim(),
        sku,
        unit: draft.unit,
        price: draft.price,
        stock: draft.stock,
        category: draft.category || '',
        sub_category: (draft.sub_category || '').trim(),
        is_active: draft.is_active,
      })
      toast.success(t('admin.editProduct.updated'))
      onSaved()
      onClose()
    } catch (err) {
      const detail = err.response?.status === 409
        ? t('admin.editProduct.skuTaken')
        : (err.response?.data?.detail || t('admin.editProduct.saveFail'))
      toast.error(detail)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(12,35,64,0.45)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 220ms ease', zIndex: 50,
      }} />
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        background: T.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        zIndex: 60, maxHeight: '92%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(12,35,64,0.18)', fontFamily: FONT,
      }}>
        <div style={{ display: 'grid', placeItems: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 3, background: T.line }} />
        </div>

        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: T.ink, fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>{t('admin.editProduct.title')}</div>
          <div onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 12, background: T.surface,
            border: `1px solid ${T.line}`, display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}>
            <Ic name="close" size={18} color={T.ink2} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: T.surface, borderRadius: 16, padding: 14, border: `1px solid ${T.line}` }}>
            <ProductThumb name={draft.name} imageUrl={draft.image_url} updatedAt={draft.updated_at} size={56} radius={12} />
            <div style={{ flex: 1, color: T.ink3, fontSize: 12 }}>{t('admin.editProduct.productId', { id: draft.id })}</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: 'none' }}
              onChange={uploadImage}
            />
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              style={{
                padding: '8px 12px', borderRadius: 10, background: T.brandSoft, color: T.brand,
                fontSize: 12, fontWeight: 700, cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.6 : 1,
              }}
            >{uploading ? t('admin.editProduct.uploading') : t('admin.editProduct.changePhoto')}</div>
          </div>

          <Field label={t('admin.editProduct.name')}>
            <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} style={inputSt} />
          </Field>
          <Field label={t('admin.editProduct.nameZh')}>
            <input value={draft.name_zh || ''} onChange={e => setDraft({ ...draft, name_zh: e.target.value })}
              style={inputSt} placeholder="中文名称" />
          </Field>

          <Field label={t('admin.editProduct.sku')}>
            <input value={draft.sku || ''}
              onChange={e => setDraft({ ...draft, sku: e.target.value.toUpperCase() })}
              style={{ ...inputSt, fontWeight: 700, letterSpacing: 0.5 }} placeholder="MM-001" />
            <div style={{ color: T.ink3, fontSize: 11, marginTop: 4 }}>{t('admin.editProduct.skuHint')}</div>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label={t('admin.editProduct.unit')}>
              <input value={draft.unit} onChange={e => setDraft({ ...draft, unit: e.target.value })} style={inputSt} />
            </Field>
            <Field label={t('admin.editProduct.price')}>
              <input type="number" step="0.10" value={draft.price}
                onChange={e => setDraft({ ...draft, price: parseFloat(e.target.value) || 0 })}
                style={inputSt} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label={t('admin.editProduct.category')}>
              <CategorySelect value={draft.category} categories={categories}
                onChange={v => setDraft({ ...draft, category: v })} />
            </Field>
            <Field label={t('admin.editProduct.subCategory')}>
              <input value={draft.sub_category || ''} onChange={e => setDraft({ ...draft, sub_category: e.target.value })}
                style={inputSt} />
            </Field>
          </div>

          <Field label={t('admin.editProduct.stockOnHand')}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: 6,
            }}>
              <div onClick={() => setDraft({ ...draft, stock: Math.max(0, draft.stock - 1) })} style={{
                width: 40, height: 40, display: 'grid', placeItems: 'center', cursor: 'pointer',
                background: T.surfaceAlt, borderRadius: 10,
              }}>
                <Ic name="minus" size={16} color={T.ink2} />
              </div>
              <input type="number" value={draft.stock}
                onChange={e => setDraft({ ...draft, stock: parseInt(e.target.value) || 0 })}
                style={{ ...inputSt, border: 'none', textAlign: 'center', fontSize: 18, fontWeight: 700, padding: '0 8px' }} />
              <div onClick={() => setDraft({ ...draft, stock: draft.stock + 1 })} style={{
                width: 40, height: 40, display: 'grid', placeItems: 'center', cursor: 'pointer',
                background: T.surfaceAlt, borderRadius: 10,
              }}>
                <Ic name="plus" size={16} color={T.ink2} />
              </div>
            </div>
          </Field>

          <div style={{
            background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, padding: 14,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: T.ink, fontSize: 14, fontWeight: 700 }}>{t('admin.editProduct.showToWorkers')}</div>
              <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>
                {draft.is_active ? t('admin.editProduct.visibleInShop') : t('admin.editProduct.hiddenFromShop')}
              </div>
            </div>
            <Toggle value={draft.is_active} onChange={v => setDraft({ ...draft, is_active: v })} />
          </div>
        </div>

        <div style={{
          background: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '16px 20px 34px', boxShadow: '0 -4px 20px rgba(12,35,64,0.05)',
          display: 'flex', gap: 10,
        }}>
          <div onClick={onClose} style={{
            flex: 1, padding: 16, borderRadius: 16,
            background: T.surfaceAlt, color: T.ink2,
            fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: 'pointer',
          }}>{t('admin.common.cancel')}</div>
          <div onClick={save} style={{
            flex: 2, padding: 16, borderRadius: 16,
            background: saving ? T.brandSoft : T.brand, color: saving ? T.brand : '#fff',
            fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: saving ? 'default' : 'pointer',
          }}>{saving ? t('admin.common.saving') : t('admin.common.save')}</div>
        </div>
      </div>
    </>
  )
}

// ── AddProductSheet ───────────────────────────────────────────────────────────
const emptyDraft = { name: '', name_zh: '', sku: '', unit: '', price: '', category: '', sub_category: '' }

function AddProductSheet({ open, onClose, onCreated, categories = [] }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(emptyDraft)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setDraft(emptyDraft)
      setPhotoFile(null)
      setPhotoPreview(null)
    }
  }, [open])

  function pickPhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function save() {
    const name = draft.name.trim()
    const price = parseFloat(draft.price)
    if (!name) {
      toast.error(t('admin.editProduct.chooseName'))
      return
    }
    if (!(price > 0)) {
      toast.error(t('admin.editProduct.choosePrice'))
      return
    }
    setSaving(true)
    try {
      const res = await api.post('/admin/products/', {
        name,
        name_zh: draft.name_zh.trim() || null,
        sku: draft.sku.trim() || null,
        price,
        stock: 0,
        unit: draft.unit.trim() || 'unit',
        category: draft.category.trim() || null,
        sub_category: draft.sub_category.trim() || null,
      })
      if (photoFile) {
        const form = new FormData()
        form.append('file', photoFile)
        try {
          await api.post(`/admin/products/${res.data.id}/image`, form)
        } catch (err) {
          toast.error(err.response?.data?.detail || t('admin.editProduct.photoFail'))
          onCreated()
          onClose()
          return
        }
      }
      toast.success(t('admin.editProduct.added'))
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || t('admin.editProduct.addFail'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(12,35,64,0.45)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 220ms ease', zIndex: 50,
      }} />
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        background: T.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        zIndex: 60, maxHeight: '92%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(12,35,64,0.18)', fontFamily: FONT,
      }}>
        <div style={{ display: 'grid', placeItems: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 3, background: T.line }} />
        </div>

        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: T.ink, fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>{t('admin.editProduct.addTitle')}</div>
          <div onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 12, background: T.surface,
            border: `1px solid ${T.line}`, display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}>
            <Ic name="close" size={18} color={T.ink2} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: T.surface, borderRadius: 16, padding: 14, border: `1px solid ${T.line}` }}>
            <div style={{
              width: 56, height: 56, borderRadius: 12, flexShrink: 0,
              background: photoPreview ? '#fff' : T.surfaceAlt,
              border: `1px solid ${T.line}`, overflow: 'hidden',
              display: 'grid', placeItems: 'center',
            }}>
              {photoPreview ? (
                <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} />
              ) : (
                <Ic name="box" size={22} color={T.ink3} />
              )}
            </div>
            <div style={{ flex: 1, color: T.ink3, fontSize: 12 }}>{photoFile ? photoFile.name : t('admin.editProduct.noPhoto')}</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: 'none' }}
              onChange={pickPhoto}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '8px 12px', borderRadius: 10, background: T.brandSoft, color: T.brand,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >{photoPreview ? t('admin.editProduct.change') : t('admin.editProduct.choosePhoto')}</div>
          </div>

          <Field label={t('admin.editProduct.name')}>
            <input autoFocus value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} style={inputSt} />
          </Field>
          <Field label={t('admin.editProduct.nameZhOptional')}>
            <input value={draft.name_zh} onChange={e => setDraft({ ...draft, name_zh: e.target.value })} style={inputSt} placeholder="中文名称" />
          </Field>
          <Field label={t('admin.editProduct.skuOptional')}>
            <input value={draft.sku} onChange={e => setDraft({ ...draft, sku: e.target.value.toUpperCase() })} style={inputSt} placeholder="MM-001" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label={t('admin.editProduct.unit')}>
              <input value={draft.unit} onChange={e => setDraft({ ...draft, unit: e.target.value })} style={inputSt} placeholder="pcs" />
            </Field>
            <Field label={t('admin.editProduct.price')}>
              <input type="number" step="0.10" value={draft.price}
                onChange={e => setDraft({ ...draft, price: e.target.value })}
                style={inputSt} placeholder="0" />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label={t('admin.editProduct.category')}>
              <CategorySelect value={draft.category} categories={categories}
                onChange={v => setDraft({ ...draft, category: v })} />
            </Field>
            <Field label={t('admin.editProduct.subCategory')}>
              <input value={draft.sub_category} onChange={e => setDraft({ ...draft, sub_category: e.target.value })} style={inputSt} />
            </Field>
          </div>
          <div style={{ color: T.ink3, fontSize: 12 }}>
            {t('admin.editProduct.stockStartsZero')}
          </div>
        </div>

        <div style={{
          background: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '16px 20px 34px', boxShadow: '0 -4px 20px rgba(12,35,64,0.05)',
          display: 'flex', gap: 10,
        }}>
          <div onClick={onClose} style={{
            flex: 1, padding: 16, borderRadius: 16,
            background: T.surfaceAlt, color: T.ink2,
            fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: 'pointer',
          }}>{t('admin.common.cancel')}</div>
          <div onClick={save} style={{
            flex: 2, padding: 16, borderRadius: 16,
            background: saving ? T.brandSoft : T.brand, color: saving ? T.brand : '#fff',
            fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: saving ? 'default' : 'pointer',
          }}>{saving ? t('admin.common.saving') : t('admin.editProduct.addTitle')}</div>
        </div>
      </div>
    </>
  )
}

// ── InvoiceSheet ──────────────────────────────────────────────────────────────
function InvoiceSheet({ invoice, open, onClose, onResolved }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  if (!invoice) return null

  async function resolve(action) {
    setBusy(true)
    try {
      await api.post(`/invoices/${invoice.id}/${action}`)
      toast.success(action === 'approve' ? t('admin.invoices.approved') : t('admin.invoices.rejected'))
      onResolved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || (action === 'approve' ? t('admin.invoices.approveFail') : t('admin.invoices.rejectFail')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(12,35,64,0.45)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 220ms ease', zIndex: 50,
      }} />
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        background: T.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        zIndex: 60, maxHeight: '88%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(12,35,64,0.18)', fontFamily: FONT,
      }}>
        <div style={{ display: 'grid', placeItems: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 3, background: T.line }} />
        </div>
        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: T.ink3, fontSize: 12, fontWeight: 600 }}>{t('admin.invoices.review')}</div>
            <div style={{ color: T.ink, fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
              {invoice.supplier_name || invoice.filename}
            </div>
          </div>
          <div onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 12, background: T.surface,
            border: `1px solid ${T.line}`, display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}>
            <Ic name="close" size={18} color={T.ink2} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: T.surface, borderRadius: 16, padding: 14, border: `1px solid ${T.line}` }}>
            {[
              { label: t('admin.invoices.supplier'), value: invoice.supplier_name || '—' },
              { label: t('admin.invoices.uploadedAt'), value: invoice.uploaded_at ? new Date(invoice.uploaded_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
              { label: t('admin.invoices.itemsLabel'), value: t('admin.invoices.lineItems', { count: invoice.items?.length ?? 0 }) },
            ].map(({ label, value }, i) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                marginBottom: i < 2 ? 8 : 0,
              }}>
                <span style={{ color: T.ink3, fontSize: 13 }}>{label}</span>
                <span style={{ color: T.ink, fontSize: 14, fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{
            background: T.surface, borderRadius: 16, padding: 30, border: `1px dashed ${T.line}`,
            textAlign: 'center', color: T.ink3, fontSize: 13,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}>
            <Ic name="doc" size={28} color={T.ink3} />
            <div>{t('admin.invoices.pdfLabel', { name: invoice.filename })}</div>
          </div>
        </div>

        <div style={{
          background: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '16px 20px 34px', boxShadow: '0 -4px 20px rgba(12,35,64,0.05)',
          display: 'flex', gap: 10,
        }}>
          <div onClick={() => !busy && resolve('reject')} style={{
            flex: 1, padding: 16, borderRadius: 16, background: T.badSoft, color: T.bad,
            fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}>{t('admin.invoices.reject')}</div>
          <div onClick={() => !busy && resolve('approve')} style={{
            flex: 2, padding: 16, borderRadius: 16, background: T.good, color: '#fff',
            fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}>{t('admin.invoices.approveSheet')}</div>
        </div>
      </div>
    </>
  )
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
function AdminTabBar({ active, pendingCount }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const tabs = [
    { id: 'dashboard', path: '/admin/dashboard', icon: 'home',    label: t('admin.nav.dashboard') },
    { id: 'orders',    path: '/admin/orders',    icon: 'orders',  label: t('admin.nav.orders'), badge: pendingCount },
    { id: 'cashier',   path: '/admin/cashier',   icon: 'cart',    label: t('admin.nav.cashier') },
    { id: 'inventory', path: '/admin/inventory', icon: 'box',     label: t('admin.nav.inventory') },
    { id: 'workers',   path: '/admin/workers',   icon: 'users',   label: t('admin.nav.workers') },
    { id: 'profile',   path: '/admin/profile',   icon: 'profile', label: t('admin.nav.me') },
  ]
  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0,
      paddingBottom: 24, paddingTop: 8,
      background: 'rgba(244,248,252,0.90)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: `1px solid ${T.line}`, zIndex: 20, fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 2px' }}>
        {tabs.map(t => {
          const isActive = active === t.id
          return (
            <div key={t.id} onClick={() => navigate(t.path)} style={{
              flex: 1, padding: '6px 0', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 3, position: 'relative', cursor: 'pointer', minWidth: 0,
            }}>
              <div style={{ position: 'relative' }}>
                <Ic name={t.icon} size={23} color={isActive ? T.brand : T.ink3} stroke={isActive ? 2 : 1.7} />
                {t.badge > 0 && (
                  <div style={{
                    position: 'absolute', top: -4, right: -8,
                    minWidth: 16, height: 16, padding: '0 4px',
                    background: T.bad, color: '#fff',
                    borderRadius: 999, fontSize: 10, fontWeight: 700,
                    display: 'grid', placeItems: 'center',
                    border: `2px solid ${T.bg}`,
                  }}>{t.badge > 9 ? '9+' : t.badge}</div>
                )}
              </div>
              <span style={{
                fontSize: 9.5, fontWeight: 600, color: isActive ? T.brand : T.ink3,
                whiteSpace: 'nowrap', letterSpacing: -0.2,
              }}>{t.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── AdminLayout ───────────────────────────────────────────────────────────────
export default function AdminLayout() {
  const location = useLocation()
  const { t } = useTranslation()
  const [pendingCount, setPendingCount] = useState(0)
  const [fulfillOrder, setFulfillOrder] = useState(null)
  const [editProduct, setEditProduct] = useState(null)
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [reviewInvoice, setReviewInvoice] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [categories, setCategories] = useState([])

  const activeTab = location.pathname.split('/')[2] || 'dashboard'
  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    api.get('/products/categories').then(r => setCategories(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    async function loadCount() {
      try {
        const res = await api.get('/admin/orders/', { params: { status: 'pending' } })
        setPendingCount(res.data.length)
      } catch { /* ignore */ }
    }
    loadCount()
  }, [refreshKey])

  // Poll every 15 seconds so new orders appear automatically
  useEffect(() => {
    const id = setInterval(() => refresh(), 15_000)
    return () => clearInterval(id)
  }, [refresh])

  async function advanceOrder(orderId, onClose) {
    try {
      await api.put(`/admin/orders/${orderId}/fulfill`)
      toast.success(t('admin.fulfill.markedFulfilled'))
      refresh()
      if (onClose) onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || t('admin.fulfill.fulfillFail'))
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      background: T.bg, fontFamily: FONT, overflow: 'hidden',
    }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 82 }}>
        <Outlet context={{ openFulfill: setFulfillOrder, openEdit: setEditProduct, openAddProduct: () => setAddProductOpen(true), openInvoice: setReviewInvoice, refreshKey, refresh, categories }} />
      </div>

      <AdminTabBar active={activeTab} pendingCount={pendingCount} />

      <FulfillSheet
        order={fulfillOrder}
        open={!!fulfillOrder}
        onClose={() => setFulfillOrder(null)}
        onAdvance={advanceOrder}
      />
      <EditProductSheet
        product={editProduct}
        open={!!editProduct}
        onClose={() => setEditProduct(null)}
        onSaved={refresh}
        categories={categories}
      />
      <AddProductSheet
        open={addProductOpen}
        onClose={() => setAddProductOpen(false)}
        onCreated={refresh}
        categories={categories}
      />
      <InvoiceSheet
        invoice={reviewInvoice}
        open={!!reviewInvoice}
        onClose={() => setReviewInvoice(null)}
        onResolved={refresh}
      />
    </div>
  )
}
