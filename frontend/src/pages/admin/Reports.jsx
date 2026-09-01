import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Calendar, TrendingUp, Users, ShoppingBag, FileSpreadsheet } from 'lucide-react'
import { formatCurrency, formatMonth } from '../../utils/format'
import Button from '../../components/Button'
import PageHeader from '../../components/PageHeader'
import { SkeletonRow } from '../../components/LoadingSkeleton'
import api from '../../api'
import toast from 'react-hot-toast'

// download a protected xlsx endpoint via fetch (Button/anchor can't carry the
// bearer token); keeps the object URL alive until the browser starts the save
async function downloadXlsx(url, filename) {
  const token = localStorage.getItem('token')
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `HTTP ${res.status}`)
  const href = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { a.remove(); URL.revokeObjectURL(href) }, 2000)
}

function BarChart({ data, maxValue }) {
  if (!data.length) return null
  return (
    <div className="space-y-2 py-2">
      {data.map((r) => {
        const pct = maxValue > 0 ? (r.total_deduction / maxValue) * 100 : 0
        return (
          <div key={r.employee_id} className="flex items-center gap-3 text-sm">
            <span className="w-24 text-slate-500 text-xs truncate shrink-0">{r.name}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-7 overflow-hidden relative">
              <div
                className="h-full bg-amber-500 rounded-full flex items-center justify-end pr-2 transition-all duration-500 ease-out"
                style={{ width: `${Math.max(pct, 2)}%` }}
              >
                {pct > 25 && (
                  <span className="text-white text-xs font-bold">{formatCurrency(r.total_deduction)}</span>
                )}
              </div>
              {pct <= 25 && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 text-xs font-bold">
                  {formatCurrency(r.total_deduction)}
                </span>
              )}
            </div>
            <span className="w-6 text-xs text-slate-400 text-right shrink-0">{r.order_count}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function Reports() {
  const { t } = useTranslation()
  const [report, setReport] = useState([])
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(false)
  const [monthlyExporting, setMonthlyExporting] = useState(false)

  // Matches how `month` above is derived, and how the backend stores
  // created_at (naive UTC) — keeps the export's "day" in step with the
  // order list and spending report.
  const today = new Date().toISOString().slice(0, 10)
  const [txFrom, setTxFrom] = useState(today.slice(0, 8) + '01')
  const [txTo, setTxTo] = useState(today)
  const [txExporting, setTxExporting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get(`/admin/reports/spending?date_from=${month}-01T00:00:00`)
      setReport(data)
    } catch { toast.error(t('admin.reports.loadFail')) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [month])

  function downloadCsv() {
    const token = localStorage.getItem('token')
    const url = `/api/admin/reports/spending.csv?month=${month}`
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `spending_${month}.csv`
        a.click()
      })
      .catch(() => toast.error(t('admin.reports.exportFail')))
  }

  async function downloadMonthly() {
    setMonthlyExporting(true)
    try {
      await downloadXlsx(`/api/admin/reports/monthly.xlsx?month=${month}`, `reconciliation_${month}.xlsx`)
    } catch (err) {
      toast.error(`${t('admin.reports.exportFail')}: ${err.message}`)
    } finally {
      setMonthlyExporting(false)
    }
  }

  async function downloadTransactions() {
    if (!txFrom || !txTo) {
      toast.error(t('admin.reports.pickBoth'))
      return
    }
    if (txFrom > txTo) {
      toast.error(t('admin.reports.fromAfterTo'))
      return
    }
    setTxExporting(true)
    try {
      await downloadXlsx(
        `/api/admin/reports/transactions.xlsx?date_from=${txFrom}&date_to=${txTo}`,
        `transactions_${txFrom}_${txTo}.xlsx`,
      )
    } catch (err) {
      toast.error(`${t('admin.reports.exportFail')}: ${err.message}`)
    } finally {
      setTxExporting(false)
    }
  }

  const total = report.reduce((s, r) => s + r.total_deduction, 0)
  const totalOrders = report.reduce((s, r) => s + r.order_count, 0)
  const maxValue = Math.max(...report.map(r => r.total_deduction), 1)

  const summaryCards = [
    { icon: TrendingUp, label: t('admin.reports.totalDeductions'), value: formatCurrency(total), accent: 'border-amber-500' },
    { icon: Users, label: t('admin.reports.workers'), value: report.length, accent: 'border-blue-400' },
    { icon: ShoppingBag, label: t('admin.reports.orders'), value: totalOrders, accent: 'border-green-400' },
  ]

  return (
    <div>
      <PageHeader
        title={t('admin.reports.title')}
        subtitle={formatMonth(month)}
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="border-2 border-slate-200 focus:border-amber-400 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none transition-colors duration-150"
              />
            </div>
            <Button variant="secondary" icon={Download} onClick={downloadMonthly} loading={monthlyExporting}>
              {t('admin.reports.monthlyExcel')}
            </Button>
            <Button variant="secondary" icon={Download} onClick={downloadCsv}>{t('admin.reports.exportCsv')}</Button>
          </div>
        }
      />

      {/* Transactions export */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-slate-100">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet size={15} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">{t('admin.reports.txTitle')}</h3>
            </div>
            <p className="text-xs text-slate-400">
              {t('admin.reports.txBlurb')}
            </p>
          </div>
          <div className="flex items-end gap-2">
            <label className="flex flex-col text-xs text-slate-500 font-medium gap-1">
              {t('admin.reports.from')}
              <input
                type="date"
                value={txFrom}
                max={txTo || undefined}
                onChange={e => setTxFrom(e.target.value)}
                className="border-2 border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors duration-150 text-slate-700"
              />
            </label>
            <label className="flex flex-col text-xs text-slate-500 font-medium gap-1">
              {t('admin.reports.to')}
              <input
                type="date"
                value={txTo}
                min={txFrom || undefined}
                onChange={e => setTxTo(e.target.value)}
                className="border-2 border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors duration-150 text-slate-700"
              />
            </label>
            <Button
              variant="secondary"
              icon={Download}
              onClick={downloadTransactions}
              loading={txExporting}
            >
              {txExporting ? t('admin.common.exporting') : t('admin.common.excel')}
            </Button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {summaryCards.map(({ icon, label, value, accent }) => {
          const SummaryIcon = icon
          return (
          <div key={label} className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${accent}`}>
            <div className="flex items-center gap-2 mb-1">
              <SummaryIcon size={14} className="text-slate-400" />
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
          </div>
        )})}
      </div>

      {/* Bar chart */}
      {!loading && report.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-5 border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">{t('admin.reports.spendingByWorker')}</h3>
            <span className="text-xs text-slate-400">{t('admin.reports.ordersArrow')}</span>
          </div>
          <BarChart data={report} maxValue={maxValue} />
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {[t('admin.reports.employeeId'), t('admin.reports.name'), t('admin.reports.orders'), t('admin.reports.totalDeduction')].map(h => (
                <th key={h} className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
            ) : report.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">{t('admin.reports.noData', { month: formatMonth(month) })}</td></tr>
            ) : report.map(r => (
              <tr key={r.employee_id} className="hover:bg-amber-50/40 transition-colors duration-150">
                <td className="px-4 py-3 font-mono text-slate-500 text-xs">{r.employee_id}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                <td className="px-4 py-3 text-slate-600">{r.order_count}</td>
                <td className="px-4 py-3 font-bold text-slate-800">{formatCurrency(r.total_deduction)}</td>
              </tr>
            ))}
          </tbody>
          {report.length > 0 && (
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td colSpan={3} className="px-4 py-3 font-semibold text-slate-700 text-right">{t('admin.reports.grandTotal')}</td>
                <td className="px-4 py-3 font-bold text-slate-900">{formatCurrency(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
