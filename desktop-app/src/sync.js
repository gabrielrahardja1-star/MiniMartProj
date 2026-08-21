import { fetchCashierMasterData, syncSales } from './api'
import {
  replaceProducts,
  replaceWorkers,
  getPendingSales,
  markSaleSynced,
  markSaleFailed,
  setSaleServerOrderId,
  setMeta,
} from './db'

// Pulls the latest catalog/worker-balance snapshot from the server and
// overwrites the local cache. Call whenever online (startup, periodic
// timer, and manual sync button).
export async function pullMasterData() {
  const data = await fetchCashierMasterData()
  await replaceProducts(data.products)
  await replaceWorkers(data.workers)
  await setMeta('last_pull_at', new Date().toISOString())
  return data
}

// Flushes every locally-queued sale (pending or previously failed) to the
// server. Idempotent per client_record_id, same contract as the Android
// app's SyncWorker. Returns a summary the UI can show.
export async function pushPendingSales() {
  const pending = await getPendingSales()
  if (pending.length === 0) return { synced: 0, failed: 0, total: 0 }

  const payload = pending.map((s) => ({
    client_record_id: s.client_record_id,
    worker_employee_id: s.worker_employee_id,
    items: JSON.parse(s.items_json),
  }))

  let synced = 0
  let failed = 0
  try {
    const res = await syncSales(payload)
    for (const r of res.results) {
      if (r.status === 'synced') {
        await markSaleSynced(r.client_record_id)
        await setSaleServerOrderId(r.client_record_id, r.server_order_id)
        synced++
      } else {
        await markSaleFailed(r.client_record_id, r.error || 'Server rejected sale')
        failed++
      }
    }
  } catch (err) {
    // Whole batch failed (offline / server unreachable) — leave sales as
    // pending so the next sync attempt retries them.
    failed = pending.length
    throw err
  }
  await setMeta('last_sync_at', new Date().toISOString())
  return { synced, failed, total: pending.length }
}

// Full online refresh: push what's queued, then pull the authoritative
// state back down (server balance/stock overwrite local estimates).
export async function fullSync() {
  const pushResult = await pushPendingSales()
  const data = await pullMasterData()
  return { pushResult, data }
}
