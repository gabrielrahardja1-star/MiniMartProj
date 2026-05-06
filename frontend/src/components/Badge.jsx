import { ORDER_STATUS_CLASSES, ORDER_STATUS_LABELS, STATUS_FALLBACK } from '../utils/status'

export default function Badge({ status, map, label, className = '' }) {
  const colorMap = map ?? ORDER_STATUS_CLASSES
  const labelMap = ORDER_STATUS_LABELS
  const colorClass = colorMap[status] ?? STATUS_FALLBACK
  const text = label ?? labelMap[status] ?? status

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass} ${className}`}>
      {text}
    </span>
  )
}
