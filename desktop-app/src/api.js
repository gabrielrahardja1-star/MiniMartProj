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

export async function refundOrder(orderId) {
  let token = await ensureToken()
  const path = `/api/admin/orders/${orderId}/refund`
  try {
    return await request(path, { method: 'POST', token })
  } catch (err) {
    if (String(err.message).startsWith('401')) {
      token = await login()
      return request(path, { method: 'POST', token })
    }
    throw err
  }
}

export async function reverseTopUp(transactionId) {
  let token = await ensureToken()
  const path = `/api/admin/wallet-transactions/${transactionId}/reverse`
  try {
    return await request(path, { method: 'POST', token })
  } catch (err) {
    if (String(err.message).startsWith('401')) {
      token = await login()
      return request(path, { method: 'POST', token })
    }
    throw err
  }
}

export async function fetchAdminProducts() {
  let token = await ensureToken()
  const path = '/api/admin/products/'
  try {
    return await request(path, { token })
  } catch (err) {
    if (String(err.message).startsWith('401')) {
      token = await login()
      return request(path, { token })
    }
    throw err
  }
}

export async function createProduct(payload) {
  let token = await ensureToken()
  const path = '/api/admin/products/'
  try {
    return await request(path, { method: 'POST', body: payload, token })
  } catch (err) {
    if (String(err.message).startsWith('401')) {
      token = await login()
      return request(path, { method: 'POST', body: payload, token })
    }
    throw err
  }
}

export async function updateProductStock(productId, newStock) {
  let token = await ensureToken()
  const body = { stock: newStock }
  const path = `/api/admin/products/${productId}`
  try {
    return await request(path, { method: 'PUT', body, token })
  } catch (err) {
    if (String(err.message).startsWith('401')) {
      token = await login()
      return request(path, { method: 'PUT', body, token })
    }
    throw err
  }
}

export async function updateProductPrice(productId, newPrice) {
  let token = await ensureToken()
  const body = { price: newPrice }
  const path = `/api/admin/products/${productId}`
  try {
    return await request(path, { method: 'PUT', body, token })
  } catch (err) {
    if (String(err.message).startsWith('401')) {
      token = await login()
      return request(path, { method: 'PUT', body, token })
    }
    throw err
  }
}

async function uploadImage(productId, file, token) {
  const form = new FormData()
  form.append('file', file)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/products/${productId}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      signal: controller.signal,
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText)
      throw new Error(`${res.status}: ${detail}`)
    }
    return res.json()
  } finally {
    clearTimeout(timer)
  }
}

export async function uploadProductImage(productId, file) {
  let token = await ensureToken()
  try {
    return await uploadImage(productId, file, token)
  } catch (err) {
    if (String(err.message).startsWith('401')) {
      token = await login()
      return uploadImage(productId, file, token)
    }
    throw err
  }
}
