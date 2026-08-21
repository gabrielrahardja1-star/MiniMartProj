import { API_BASE_URL, DEVICE_EMPLOYEE_ID, DEVICE_PIN } from './config'
import { getMeta, setMeta } from './db'

async function request(path, { method = 'GET', body, token, timeoutMs = 10_000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText)
      throw new Error(`${res.status}: ${detail}`)
    }
    return res.status === 204 ? null : res.json()
  } finally {
    clearTimeout(timer)
  }
}

export async function login() {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: { employee_id: DEVICE_EMPLOYEE_ID, pin: DEVICE_PIN },
  })
  await setMeta('token', data.access_token)
  return data.access_token
}

export async function ensureToken() {
  const cached = await getMeta('token')
  if (cached) return cached
  return login()
}

export async function fetchCashierMasterData() {
  let token = await ensureToken()
  try {
    return await request('/api/mobile/v1/cashier/master-data', { token })
  } catch (err) {
    if (String(err.message).startsWith('401')) {
      token = await login()
      return request('/api/mobile/v1/cashier/master-data', { token })
    }
    throw err
  }
}

export async function syncSales(sales) {
  let token = await ensureToken()
  const body = { sales }
  try {
    return await request('/api/mobile/v1/cashier/sales/sync', { method: 'POST', body, token })
  } catch (err) {
    if (String(err.message).startsWith('401')) {
      token = await login()
      return request('/api/mobile/v1/cashier/sales/sync', { method: 'POST', body, token })
    }
    throw err
  }
}

export async function topUpWorker(workerId, amount, note) {
  let token = await ensureToken()
  const body = { amount, note: note || null }
  const path = `/api/admin/workers/${workerId}/topup`
  try {
    return await request(path, { method: 'POST', body, token })
  } catch (err) {
    if (String(err.message).startsWith('401')) {
      token = await login()
      return request(path, { method: 'POST', body, token })
    }
    throw err
  }
}
