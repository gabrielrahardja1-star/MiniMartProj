export const ORDER_STATUS_CLASSES = {
  pending:   'bg-yellow-100 text-yellow-700',
  fulfilled: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-500',
}

export const ORDER_STATUS_KEYS = {
  pending:   'status.order.pending',
  fulfilled: 'status.order.fulfilled',
  cancelled: 'status.order.cancelled',
}

export const INVOICE_STATUS_CLASSES = {
  pending_review: 'bg-yellow-100 text-yellow-700',
  approved:       'bg-green-100 text-green-700',
  rejected:       'bg-red-100 text-red-500',
}

export const INVOICE_STATUS_KEYS = {
  pending_review: 'status.invoice.pending_review',
  approved:       'status.invoice.approved',
  rejected:       'status.invoice.rejected',
}

export const STATUS_FALLBACK = 'bg-gray-100 text-gray-500'

// Deprecated: use _KEYS with useTranslation() instead
export const ORDER_STATUS_LABELS = {
  pending:   'Pending',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
}

export const INVOICE_STATUS_LABELS = {
  pending_review: 'Pending Review',
  approved:       'Approved',
  rejected:       'Rejected',
}
