import { useTranslation } from 'react-i18next'
import { ORDER_STATUS_CLASSES, ORDER_STATUS_KEYS, INVOICE_STATUS_KEYS, STATUS_FALLBACK } from '../utils/status'

export default function Badge({ status, map, statusKey, label, className = '' }) {
  const { t } = useTranslation()
  const colorMap = map ?? ORDER_STATUS_CLASSES
  const colorClass = colorMap[status] ?? STATUS_FALLBACK

  let text
  if (label) {
    text = label
  } else if (statusKey) {
    text = t(statusKey)
  } else {
    // Fallback: try to infer from ORDER_STATUS_KEYS (default map)
    text = t(ORDER_STATUS_KEYS[status] ?? status)
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass} ${className}`}>
      {text}
    </span>
  )
}
