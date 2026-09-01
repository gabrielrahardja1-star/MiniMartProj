import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { T, FONT } from '../../utils/theme'
import { formatCurrency, formatDateTime } from '../../utils/format'
import Ic from '../../components/Ic'
import api from '../../api'
import toast from 'react-hot-toast'

const typeStyle = {
  topup: { bg: T.goodSoft, fg: T.good, key: 'typeTopup' },
  payment: { bg: T.badSoft, fg: T.bad, key: 'typePayment' },
  refund: { bg: T.brandSoft, fg: T.brand, key: 'typeRefund' },
  reversal: { bg: T.badSoft, fg: T.bad, key: 'typeReversal' },
  adjustment_credit: { bg: T.goodSoft, fg: T.good, key: 'typeAdjustment' },
  adjustment_debit: { bg: T.badSoft, fg: T.bad, key: 'typeAdjustment' },
}

export default function WalletLedger() {
  const { t } = useTranslation()
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
      .catch(() => toast.error(t('admin.walletLedger.loadWorkersFail')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    if (!selectedId) return
    api.get(`/admin/workers/${selectedId}/transactions`)
      .then(({ data }) => setTransactions(data))
      .catch(() => toast.error(t('admin.walletLedger.loadFail')))
      .finally(() => setLoading(false))
  }, [selectedId, t])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 8, fontFamily: FONT }}>
      <div style={{ padding: '8px 20px 14px' }}>
        <div style={{ color: T.ink3, fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{t('admin.walletLedger.entries', { count: transactions.length })}</div>
        <div style={{ color: T.ink, fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>{t('admin.walletLedger.title')}</div>
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
                {t('admin.walletLedger.currentBalance')}
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
          <div style={{ color: T.ink3, textAlign: 'center', padding: 30, fontSize: 14 }}>{t('admin.common.loading')}</div>
        ) : transactions.length === 0 ? (
          <div style={{
            background: T.surface, borderRadius: 18, padding: 30,
            border: `1px dashed ${T.line}`, textAlign: 'center', color: T.ink3, fontSize: 14,
          }}>{t('admin.walletLedger.none')}</div>
        ) : transactions.map(tx => {
          const style = typeStyle[tx.type] || { bg: T.surfaceAlt, fg: T.ink2, key: null }
          const label = style.key ? t(`admin.walletLedger.${style.key}`) : tx.type
          const sign = ['payment', 'reversal', 'adjustment_debit'].includes(tx.type) ? '-' : '+'
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
                }}>{label}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.ink, fontSize: 15, fontWeight: 700 }}>
                    {sign}{formatCurrency(tx.amount)}
                  </div>
                  <div style={{ color: T.ink3, fontSize: 12, marginTop: 2 }}>
                    {formatDateTime(tx.created_at)}
                    {tx.order_id ? ` · ${t('admin.walletLedger.order', { id: tx.order_id })}` : ''}
                  </div>
                  {tx.note && <div style={{ color: T.ink2, fontSize: 12, marginTop: 6 }}>{tx.note}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: T.ink3, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{t('admin.walletLedger.after')}</div>
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
