import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { T, FONT } from '../../utils/theme'
import { formatCurrency } from '../../utils/format'
import Ic from '../../components/Ic'
import api from '../../api'
import toast from 'react-hot-toast'

// ── Shared field components (must be outside WorkerSheet to avoid remount) ───
const inputSt = {
  width: '100%', boxSizing: 'border-box',
  padding: '12px 14px', borderRadius: 12,
  border: `1px solid ${T.line}`, background: T.surface,
  fontSize: 15, color: T.ink, fontFamily: FONT, outline: 'none',
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ color: T.ink3, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}

// ── Add / Edit Worker sheet ───────────────────────────────────────────────────
function WorkerSheet({ worker, open, onClose, onSaved }) {
  const isEdit = !!worker
  const [form, setForm] = useState({ employee_id: '', name: '', pin: '', pin_confirm: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(worker
        ? { employee_id: worker.employee_id, name: worker.name, pin: '', pin_confirm: '' }
        : { employee_id: '', name: '', pin: '', pin_confirm: '' }
      )
    }
  }, [open, worker])

  async function save() {
    if (!form.name.trim()) return toast.error('Name is required')
    if (!isEdit && !form.employee_id.trim()) return toast.error('Employee ID is required')
    if (!isEdit && !form.pin) return toast.error('PIN is required')
    if (form.pin && form.pin !== form.pin_confirm) return toast.error('PINs do not match')
    if (form.pin && !/^\d{4,8}$/.test(form.pin)) return toast.error('PIN must be 4–8 digits')

    setSaving(true)
    try {
      if (isEdit) {
        const payload = { name: form.name }
        if (form.pin) payload.pin = form.pin
        await api.patch(`/admin/workers/${worker.id}`, payload)
        toast.success('Worker updated')
      } else {
        await api.post('/admin/workers/', {
          employee_id: form.employee_id.trim().toUpperCase(),
          name: form.name.trim(),
          pin: form.pin,
        })
        toast.success('Worker created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save')
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
          <div style={{ color: T.ink, fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
            {isEdit ? 'Edit worker' : 'Add worker'}
          </div>
          <div onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 12, background: T.surface,
            border: `1px solid ${T.line}`, display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}>
            <Ic name="close" size={18} color={T.ink2} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Full name">
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Jordan Reyes"
              style={inputSt}
            />
          </Field>

          <Field label="Employee ID">
            <input
              value={form.employee_id}
              onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
              placeholder="e.g. W001"
              disabled={isEdit}
              style={{ ...inputSt, opacity: isEdit ? 0.5 : 1 }}
            />
          </Field>

          <Field label={isEdit ? 'New PIN (leave blank to keep)' : 'PIN (4–8 digits)'}>
            <input
              type="password"
              inputMode="numeric"
              value={form.pin}
              onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
              placeholder="••••"
              maxLength={8}
              style={inputSt}
            />
          </Field>

          {(form.pin || !isEdit) && (
            <Field label="Confirm PIN">
              <input
                type="password"
                inputMode="numeric"
                value={form.pin_confirm}
                onChange={e => setForm(f => ({ ...f, pin_confirm: e.target.value.replace(/\D/g, '') }))}
                placeholder="••••"
                maxLength={8}
                style={{
                  ...inputSt,
                  borderColor: form.pin && form.pin_confirm && form.pin !== form.pin_confirm ? T.bad : T.line,
                }}
              />
            </Field>
          )}

          <div style={{
            background: T.surfaceAlt, borderRadius: 14, padding: '10px 14px',
            color: T.ink3, fontSize: 13, lineHeight: 1.5,
          }}>
            Workers log in with their Employee ID and PIN on the login screen.
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
          }}>Cancel</div>
          <div onClick={save} style={{
            flex: 2, padding: 16, borderRadius: 16,
            background: saving ? T.brandSoft : T.brand, color: saving ? T.brand : '#fff',
            fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: saving ? 'default' : 'pointer',
          }}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create worker'}</div>
        </div>
      </div>
    </>
  )
}

// ── Wallet top-up sheet ──────────────────────────────────────────────────────
function TopUpSheet({ worker, open, onClose, onSaved }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setAmount('')
      setNote('')
    }
  }, [open, worker?.id])

  async function save() {
    const parsed = Number(amount)
    if (!parsed || parsed <= 0) return toast.error('Enter a top-up amount')
    setSaving(true)
    try {
      await api.post(`/admin/workers/${worker.id}/topup`, { amount: parsed, note })
      toast.success('Balance topped up')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Top-up failed')
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
          <div>
            <div style={{ color: T.ink, fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>Top up wallet</div>
            <div style={{ color: T.ink3, fontSize: 13, marginTop: 2 }}>{worker?.name}</div>
          </div>
          <div onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 12, background: T.surface,
            border: `1px solid ${T.line}`, display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}>
            <Ic name="close" size={18} color={T.ink2} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            background: T.surface, borderRadius: 16, padding: 14,
            border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ color: T.ink3, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Current balance
            </div>
            <div style={{ color: T.ink, fontSize: 18, fontWeight: 700 }}>{formatCurrency(worker?.balance || 0)}</div>
          </div>

          <Field label="Cash received">
            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 50000"
              style={inputSt}
            />
          </Field>

          <Field label="Note">
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Optional"
              maxLength={255}
              style={inputSt}
            />
          </Field>
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
          }}>Cancel</div>
          <div onClick={save} style={{
            flex: 2, padding: 16, borderRadius: 16,
            background: saving ? T.brandSoft : T.brand, color: saving ? T.brand : '#fff',
            fontSize: 15, fontWeight: 700, textAlign: 'center', cursor: saving ? 'default' : 'pointer',
          }}>{saving ? 'Saving…' : 'Add balance'}</div>
        </div>
      </div>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminWorkers() {
  const navigate = useNavigate()
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editWorker, setEditWorker] = useState(null)
  const [topUpWorker, setTopUpWorker] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const res = await api.get('/admin/workers/')
      setWorkers(res.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function toggleActive(worker) {
    try {
      const res = await api.patch(`/admin/workers/${worker.id}`, { is_active: !worker.is_active })
      setWorkers(prev => prev.map(w => w.id === worker.id ? res.data : w))
      toast.success(res.data.is_active ? 'Worker activated' : 'Worker deactivated')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update')
    }
  }

  function openEdit(worker) {
    setEditWorker(worker)
    setSheetOpen(true)
  }

  function openAdd() {
    setEditWorker(null)
    setSheetOpen(true)
  }

  const workerList = workers.filter(w => w.role === 'worker')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 8 }}>
      {/* Header */}
      <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <div onClick={() => navigate('/admin/profile')} style={{ cursor: 'pointer', display: 'flex' }}>
              <Ic name="back" size={20} color={T.ink3} />
            </div>
            <div style={{ color: T.ink3, fontSize: 13, fontWeight: 500 }}>{workerList.length} workers</div>
          </div>
          <div style={{ color: T.ink, fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>Workers</div>
        </div>
        <div onClick={openAdd} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: T.brand, color: '#fff',
          padding: '10px 16px', borderRadius: 999,
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>
          <Ic name="plus" size={16} color="#fff" stroke={2.2} />
          Add
        </div>
      </div>

      {/* Worker list */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ color: T.ink3, textAlign: 'center', padding: 30, fontSize: 14 }}>Loading…</div>
        ) : workerList.length === 0 ? (
          <div style={{
            background: T.surface, borderRadius: 18, padding: 30,
            border: `1px dashed ${T.line}`, textAlign: 'center', color: T.ink3, fontSize: 14,
          }}>No workers yet. Tap Add to create the first one.</div>
        ) : workerList.map(w => {
          const initials = w.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
          return (
            <div key={w.id} style={{
              background: T.surface, borderRadius: 16, padding: 14,
              border: `1px solid ${T.line}`,
              opacity: w.is_active ? 1 : 0.6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: w.is_active
                    ? `linear-gradient(135deg, ${T.brand}, ${T.brandDeep})`
                    : T.surfaceAlt,
                  color: w.is_active ? '#fff' : T.ink3,
                  display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14,
                }}>{initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.ink, fontSize: 15, fontWeight: 700 }}>{w.name}</div>
                  <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>
                    {w.employee_id} · {formatCurrency(w.balance || 0)}
                  </div>
                </div>
                <div style={{
                  padding: '4px 10px', borderRadius: 999,
                  background: w.is_active ? T.goodSoft : T.surfaceAlt,
                  color: w.is_active ? T.good : T.ink3,
                  fontSize: 11, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase',
                }}>{w.is_active ? 'Active' : 'Inactive'}</div>
              </div>

              <div style={{
                marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.line}`,
                display: 'flex', gap: 8,
              }}>
                <div onClick={() => openEdit(w)} style={{
                  flex: 1, padding: '9px 0', borderRadius: 10,
                  background: T.brandSoft, color: T.brand,
                  fontSize: 13, fontWeight: 700, textAlign: 'center', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}>
                  <Ic name="edit" size={13} color={T.brand} /> Edit
                </div>
                <div onClick={() => setTopUpWorker(w)} style={{
                  flex: 1, padding: '9px 0', borderRadius: 10,
                  background: T.warnSoft, color: T.warn,
                  fontSize: 13, fontWeight: 700, textAlign: 'center', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}>
                  <Ic name="wallet" size={13} color={T.warn} /> Top up
                </div>
                <div onClick={() => toggleActive(w)} style={{
                  flex: 1, padding: '9px 0', borderRadius: 10,
                  background: w.is_active ? T.badSoft : T.goodSoft,
                  color: w.is_active ? T.bad : T.good,
                  fontSize: 13, fontWeight: 700, textAlign: 'center', cursor: 'pointer',
                }}>
                  {w.is_active ? 'Deactivate' : 'Activate'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ height: 16 }} />

      <WorkerSheet
        worker={editWorker}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={load}
      />
      <TopUpSheet
        worker={topUpWorker}
        open={!!topUpWorker}
        onClose={() => setTopUpWorker(null)}
        onSaved={load}
      />
    </div>
  )
}
