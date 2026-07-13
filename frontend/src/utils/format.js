export function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function formatMonth(yyyyMM) {
  const [year, month] = yyyyMM.split('-')
  return new Date(year, month - 1).toLocaleString('en-AU', { month: 'long', year: 'numeric' })
}

export function formatSlotLabel(slot) {
  return slot === '12:00' ? '12:00 PM' : slot === '17:00' ? '5:00 PM' : slot
}
