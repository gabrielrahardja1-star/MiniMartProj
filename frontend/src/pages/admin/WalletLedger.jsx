import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { T, FONT } from '../../utils/theme'
import { formatCurrency, formatDateTime } from '../../utils/format'
import Ic from '../../components/Ic'
import api from '../../api'
import toast from 'react-hot-toast'

const typeStyle = {
  topup: { bg: T.goodSoft, fg: T.good, label: 'Top-up' },
  payment: { bg: T.badSoft, fg: T.bad, label: 'Payment' },
  refund: { bg: T.brandSoft, fg: T.brand, label: 'Refund' },
  reversal: { bg: T.badSoft, fg: T.bad, label: 'Reversal' },
}

export default function WalletLedger() {
  const navigate = useNavigate()
  const [workers, setWorkers] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  const workerList = useMemo(() => workers.filter(w => w.role === 'worker'), [workers])
  const selectedWorker = workerList.find(w => String(w.id) === String(selectedId))

  useEffect(() => {
    api.get('/admin/workers/')
      .then(({ data }) => {
        const list = data.filter(w => w.role === 'worker')
        setWorkers(data)
        if (list[0]) setSelectedId(String(list[0].id))
      })
      .catch(() => toast.error('Failed to load workers'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedId) return
    api.get(`/admin/workers/${selectedId}/transactions`)
      .then(({ data }) => setTransactions(data))
      .catch(() => toast.error('Failed to load ledger'))
      .finally(() => setLoading(false))
  }, [selectedId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 8, fontFamily: FONT }}>
      <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <div onClick={() => navigate('/admin/profile')} style={{ cursor: 'pointer', display: 'flex' }}>
              <Ic name="back" size={20} color={T.ink3} />
            </div>
            <div style={{ color: T.ink3, fontSize: 13, fontWeight: 500 }}>{transactions.length} entries</div>
          </div>
          <div style={{ color: T.ink, fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>Wallet ledger</div>
        </div>
      </div>

      <div style={{ padding: '0 20px 14px' }}>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '13px 14px',
            borderRadius: 14, border: `1px solid ${T.line}`, background: T.surface,
            color: T.ink, fontSize: 14, fontWeight: 600, fontFamily: FONT, outline: 'none',
          }}
        >
          {workerList.map(w => (
            <option key={w.id} value={w.id}>{w.employee_id} · {w.name}</option>
          ))}
        </select>
      </div>

      {selectedWorker && (
        <div style={{ padding: '0 20px 14px' }}>
          <div style={{
            background: T.surface, borderRadius: 18, padding: 16,
            border: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ color: T.ink3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Current balance
              </div>
              <div style={{ color: T.ink, fontSize: 22, fontWeight: 700, marginTop: 3 }}>
                {formatCurrency(selectedWorker.balance || 0)}
              </div>
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: 14, background: T.brandSoft,
              display: 'grid', placeItems: 'center',
            }}>
              <Ic name="wallet" size={22} color={T.brand} />
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ color: T.ink3, textAlign: 'center', padding: 30, fontSize: 14 }}>Loading…</div>
        ) : transactions.length === 0 ? (
          <div style={{
            background: T.surface, borderRadius: 18, padding: 30,
            border: `1px dashed ${T.line}`, textAlign: 'center', color: T.ink3, fontSize: 14,
          }}>No wallet transactions yet.</div>
        ) : transactions.map(tx => {
          const style = typeStyle[tx.type] || { bg: T.surfaceAlt, fg: T.ink2, label: tx.type }
          const sign = ['payment', 'reversal'].includes(tx.type) ? '-' : '+'
          return (
            <div key={tx.id} style={{
              background: T.surface, borderRadius: 16, padding: 14,
              border: `1px solid ${T.line}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  padding: '4px 9px', borderRadius: 999,
                  background: style.bg, color: style.fg,
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3,
                }}>{style.label}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.ink, fontSize: 15, fontWeight: 700 }}>
                    {sign}{formatCurrency(tx.amount)}
                  </div>
                  <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>
                    {formatDateTime(tx.created_at)}
                    {tx.order_id ? ` · Order #${tx.order_id}` : ''}
                  </div>
                  {tx.note && <div style={{ color: T.ink2, fontSize: 12, marginTop: 6 }}>{tx.note}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: T.ink3, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>After</div>
                  <div style={{ color: T.ink2, fontSize: 13, fontWeight: 700 }}>{formatCurrency(tx.balance_after)}</div>
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
