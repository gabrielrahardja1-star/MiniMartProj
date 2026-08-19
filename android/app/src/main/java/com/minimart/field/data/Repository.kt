package com.minimart.field.data

import android.content.Context
import com.google.gson.Gson
import com.minimart.field.BuildConfig
import com.minimart.field.data.local.AppDatabase
import com.minimart.field.data.local.OrderEntity
import com.minimart.field.data.local.OrderLineItem
import com.minimart.field.data.local.ProductEntity
import com.minimart.field.data.local.SaleEntity
import com.minimart.field.data.local.SyncStatus
import com.minimart.field.data.local.WorkerEntity
import com.minimart.field.data.remote.ApiService
import com.minimart.field.data.remote.RetrofitClient
import com.minimart.field.data.remote.dto.CashierSaleRequest
import com.minimart.field.data.remote.dto.CashierSalesRequest
import com.minimart.field.data.remote.dto.LoginRequest
import com.minimart.field.data.remote.dto.SyncOrderItemRequest
import com.minimart.field.data.remote.dto.SyncOrderRequest
import com.minimart.field.data.remote.dto.SyncOrdersRequest
import java.util.UUID
import kotlinx.coroutines.flow.Flow

sealed class LoginResult {
    data class Success(val name: String) : LoginResult()
    data class Error(val message: String) : LoginResult()
}

sealed class SaleResult {
    data object Success : SaleResult()
    data class Error(val message: String) : SaleResult()
}

private data class SeedProduct(
    val id: Int, val name: String, val sku: String, val price: Double,
    val unit: String, val stock: Int, val category: String?,
)
private data class SeedWorker(val employee_id: String, val name: String, val balance: Double)
private data class SeedData(val products: List<SeedProduct>, val workers: List<SeedWorker>)

/**
 * Single entry point for the UI layer. Owns the local Room database and the
 * Retrofit client, and is the only place that talks to the network -
 * everything else in the UI reads/writes Room and never blocks on
 * connectivity.
 */
class Repository(context: Context) {
    val tokenStore = TokenStore(context)
    val syncMeta = SyncMeta(context)
    private val db = AppDatabase.get(context)
    private val api: ApiService = RetrofitClient.create(tokenStore)
    private val deviceId: String = DeviceId.get(context)
    private val appContext = context.applicationContext

    val orders: Flow<List<OrderEntity>> = db.orderDao().observeAll()
    val products: Flow<List<ProductEntity>> = db.productDao().observeAll()
    val cashierWorkers: Flow<List<WorkerEntity>> = db.workerDao().observeAll()
    val cashierSales: Flow<List<SaleEntity>> = db.saleDao().observeAll()

    suspend fun login(employeeId: String, pin: String): LoginResult {
        return try {
            val response = api.login(LoginRequest(employeeId, pin))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                tokenStore.saveSession(body.access_token, body.id, body.employee_id, body.name, body.role)
                LoginResult.Success(body.name)
            } else {
                LoginResult.Error("Invalid employee ID or PIN")
            }
        } catch (e: Exception) {
            LoginResult.Error("Could not reach server: ${e.message}")
        }
    }

    /** No one ever types credentials on this tablet - it's a single-purpose
     * cashier device. Call this opportunistically (app start, sync worker
     * runs) to silently (re)authenticate with the identity baked into the
     * build whenever there's connectivity. Safe to call when already
     * logged in or offline - just returns the current state either way,
     * never blocks or surfaces an error to the UI. Cached products/workers
     * from the last successful sync keep the app usable regardless. */
    suspend fun ensureLoggedIn(): Boolean {
        if (tokenStore.isLoggedIn()) return true
        return login(BuildConfig.TABLET_EMPLOYEE_ID, BuildConfig.TABLET_PIN) is LoginResult.Success
    }

    /** Loads the bundled starter catalog/worker directory (assets/seed_data.json)
     * so a brand-new tablet that has never once reached the server still
     * shows something instead of an empty screen. Only fills in whichever
     * table is currently empty - never overwrites real synced data, and a
     * real sync always wins once it succeeds. Worker balances from this
     * seed are a build-time snapshot and may be stale; syncMeta tracks
     * whether a real sync has ever happened so the UI can warn about that. */
    suspend fun seedIfEmpty() {
        val needsProducts = db.productDao().count() == 0
        val needsWorkers = db.workerDao().count() == 0
        if (!needsProducts && !needsWorkers) return
        try {
            val json = appContext.assets.open("seed_data.json").bufferedReader().use { it.readText() }
            val seed = Gson().fromJson(json, SeedData::class.java)
            if (needsProducts) {
                db.productDao().upsertAll(
                    seed.products.map { ProductEntity(it.id, it.name, it.sku, it.price, it.stock, it.unit, it.category) }
                )
            }
            if (needsWorkers) {
                db.workerDao().upsertAll(seed.workers.map { WorkerEntity(it.employee_id, it.name, it.balance) })
            }
        } catch (e: Exception) {
            // Bundled seed missing or corrupt - not fatal, the app just
            // stays empty until a real sync happens.
        }
    }

    /** Refreshes the local product cache. Call when online (e.g. dashboard
     * open, pull-to-refresh, or post-sync). Safe no-op failure when offline. */
    suspend fun refreshMasterData(): Boolean {
        return try {
            val response = api.masterData()
            if (response.isSuccessful && response.body() != null) {
                val products = response.body()!!.products.map {
                    ProductEntity(it.id, it.name, it.sku, it.price, it.stock, it.unit, it.category)
                }
                db.productDao().clear()
                db.productDao().upsertAll(products)
                true
            } else false
        } catch (e: Exception) {
            false
        }
    }

    /** Saves a new order locally first, marked Pending. Never touches the
     * network - the sync worker picks it up separately. */
    suspend fun queueOrder(items: List<OrderLineItem>, pickupDate: String, pickupSlot: String) {
        val clientRecordId = "device-$deviceId-${UUID.randomUUID()}"
        val total = items.sumOf { it.unitPrice * it.quantity }
        db.orderDao().upsert(
            OrderEntity(
                clientRecordId = clientRecordId,
                items = items,
                pickupDate = pickupDate,
                pickupSlot = pickupSlot,
                total = total,
                createdAtEpochMs = System.currentTimeMillis(),
                syncStatus = SyncStatus.PENDING,
            )
        )
    }

    /** Uploads every Pending/Failed order in one batch. Each order carries
     * its own client_record_id so a partially-failed batch, or a retry of
     * an already-synced order, never creates server-side duplicates. */
    suspend fun syncPendingOrders(): Boolean {
        val dao = db.orderDao()
        val toSync = dao.getByStatus(SyncStatus.PENDING) + dao.getByStatus(SyncStatus.FAILED)
        if (toSync.isEmpty()) return true

        val now = System.currentTimeMillis()
        toSync.forEach { dao.markAttempt(it.clientRecordId, SyncStatus.UPLOADING, now) }

        return try {
            val request = SyncOrdersRequest(
                orders = toSync.map { order ->
                    SyncOrderRequest(
                        client_record_id = order.clientRecordId,
                        items = order.items.map { SyncOrderItemRequest(it.productId, it.quantity) },
                        pickup_date = order.pickupDate,
                        pickup_slot = order.pickupSlot,
                    )
                }
            )
            val response = api.syncOrders(request)
            if (!response.isSuccessful || response.body() == null) {
                toSync.forEach {
                    dao.markResult(it.clientRecordId, SyncStatus.FAILED, null, "Server error ${response.code()}", now)
                }
                return false
            }
            var allSynced = true
            response.body()!!.results.forEach { result ->
                if (result.status == "synced") {
                    dao.markResult(result.client_record_id, SyncStatus.SYNCED, result.server_order_id, null, now)
                } else {
                    allSynced = false
                    dao.markResult(result.client_record_id, SyncStatus.FAILED, null, result.error, now)
                }
            }
            allSynced
        } catch (e: Exception) {
            toSync.forEach {
                dao.markResult(it.clientRecordId, SyncStatus.FAILED, null, "No connection: ${e.message}", now)
            }
            false
        }
    }

    /** Refreshes the cached product catalog and worker directory (with
     * balances) for the cashier screen. Call when online. */
    suspend fun refreshCashierMasterData(): Boolean {
        if (!ensureLoggedIn()) return false
        return try {
            val response = api.cashierMasterData()
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val products = body.products.map {
                    ProductEntity(it.id, it.name, it.sku, it.price, it.stock, it.unit, it.category)
                }
                val workers = body.workers.map { WorkerEntity(it.employee_id, it.name, it.balance) }
                db.productDao().clear()
                db.productDao().upsertAll(products)
                db.workerDao().clear()
                db.workerDao().upsertAll(workers)
                syncMeta.markCashierSynced()
                true
            } else false
        } catch (e: Exception) {
            false
        }
    }

    suspend fun findWorker(employeeId: String): WorkerEntity? = db.workerDao().getByEmployeeId(employeeId)

    /** Rings up a sale for [worker]: deducts the cached balance and each
     * item's cached stock immediately (offline-authoritative), and queues
     * the sale for sync. Returns an error instead of queueing if the
     * cached balance can't cover it. */
    suspend fun queueSale(worker: WorkerEntity, items: List<OrderLineItem>): SaleResult {
        val total = items.sumOf { it.unitPrice * it.quantity }
        if (total > worker.balance) {
            return SaleResult.Error("Insufficient balance: ${worker.name} has ${worker.balance}, sale is $total")
        }
        val clientRecordId = "device-$deviceId-${UUID.randomUUID()}"
        db.workerDao().updateBalance(worker.employeeId, worker.balance - total)
        items.forEach { db.productDao().decrementStock(it.productId, it.quantity) }
        db.saleDao().upsert(
            SaleEntity(
                clientRecordId = clientRecordId,
                workerEmployeeId = worker.employeeId,
                workerName = worker.name,
                items = items,
                total = total,
                createdAtEpochMs = System.currentTimeMillis(),
                syncStatus = SyncStatus.PENDING,
            )
        )
        return SaleResult.Success
    }

    /** Uploads every Pending/Failed cashier sale. Server settles each sale
     * from the worker's real balance and returns the authoritative balance
     * after, which overwrites the locally-estimated one. */
    suspend fun syncPendingSales(): Boolean {
        val dao = db.saleDao()
        val toSync = dao.getByStatus(SyncStatus.PENDING) + dao.getByStatus(SyncStatus.FAILED)
        if (toSync.isEmpty()) return true
        if (!ensureLoggedIn()) return false

        val now = System.currentTimeMillis()
        toSync.forEach { dao.markAttempt(it.clientRecordId, SyncStatus.UPLOADING, now) }

        return try {
            val request = CashierSalesRequest(
                sales = toSync.map { sale ->
                    CashierSaleRequest(
                        client_record_id = sale.clientRecordId,
                        worker_employee_id = sale.workerEmployeeId,
                        items = sale.items.map { SyncOrderItemRequest(it.productId, it.quantity) },
                    )
                }
            )
            val response = api.syncCashierSales(request)
            if (!response.isSuccessful || response.body() == null) {
                toSync.forEach {
                    dao.markResult(it.clientRecordId, SyncStatus.FAILED, null, "Server error ${response.code()}", now)
                }
                return false
            }
            var allSynced = true
            response.body()!!.results.forEach { result ->
                if (result.status == "synced") {
                    dao.markResult(result.client_record_id, SyncStatus.SYNCED, result.server_order_id, null, now)
                    val sale = toSync.find { it.clientRecordId == result.client_record_id }
                    if (sale != null && result.worker_balance_after != null) {
                        db.workerDao().updateBalance(sale.workerEmployeeId, result.worker_balance_after)
                    }
                } else {
                    allSynced = false
                    dao.markResult(result.client_record_id, SyncStatus.FAILED, null, result.error, now)
                }
            }
            allSynced
        } catch (e: Exception) {
            toSync.forEach {
                dao.markResult(it.clientRecordId, SyncStatus.FAILED, null, "No connection: ${e.message}", now)
            }
            false
        }
    }

    companion object {
        @Volatile private var instance: Repository? = null
        fun get(context: Context): Repository =
            instance ?: synchronized(this) {
                instance ?: Repository(context.applicationContext).also { instance = it }
            }
    }
}

/** Stable per-install identifier used as part of the client_record_id
 * namespace (mirrors the device_id concept from the sync contract). */
object DeviceId {
    fun get(context: Context): String {
        val prefs = context.getSharedPreferences("minimart_device", Context.MODE_PRIVATE)
        var id = prefs.getString("device_id", null)
        if (id == null) {
            id = UUID.randomUUID().toString().take(8)
            prefs.edit().putString("device_id", id).apply()
        }
        return id
    }
}
