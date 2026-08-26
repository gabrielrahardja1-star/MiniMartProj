// Mirrors android/app/build.gradle.kts buildConfigField values.
// The desktop till authenticates as a fixed device identity, same as the
// Android tablet — see conversation decision: no per-cashier login.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://76.13.19.246:8000'
export const DEVICE_EMPLOYEE_ID = import.meta.env.VITE_DEVICE_EMPLOYEE_ID || 'ADMIN001'
export const DEVICE_PIN = import.meta.env.VITE_DEVICE_PIN || '0000'

export const LOW_STOCK_THRESHOLD = 5
export const SYNC_INTERVAL_MS = 60_000

// updatedAt (a product's last-modified timestamp) is appended as a cache-busting
// query param so the browser re-fetches the image whenever the photo actually
// changes, instead of serving a stale cached copy from the same URL path.
export function resolveImageUrl(imageUrl, updatedAt) {
  if (!imageUrl) return null
  const bust = updatedAt ? `?v=${encodeURIComponent(updatedAt)}` : ''
  if (/^https?:\/\//.test(imageUrl)) return `${imageUrl}${bust}`
  return `${API_BASE_URL}${imageUrl}${bust}`
}
