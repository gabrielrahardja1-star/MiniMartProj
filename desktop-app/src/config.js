// Mirrors android/app/build.gradle.kts buildConfigField values.
// The desktop till authenticates as a fixed device identity, same as the
// Android tablet — see conversation decision: no per-cashier login.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://76.13.19.246:8000'
export const DEVICE_EMPLOYEE_ID = import.meta.env.VITE_DEVICE_EMPLOYEE_ID || 'ADMIN001'
export const DEVICE_PIN = import.meta.env.VITE_DEVICE_PIN || '0000'

export const LOW_STOCK_THRESHOLD = 5
export const SYNC_INTERVAL_MS = 60_000

export function resolveImageUrl(imageUrl) {
  if (!imageUrl) return null
  if (/^https?:\/\//.test(imageUrl)) return imageUrl
  return `${API_BASE_URL}${imageUrl}`
}
