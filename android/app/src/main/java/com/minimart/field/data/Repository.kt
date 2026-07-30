package com.minimart.field.data

import android.content.Context
import com.minimart.field.data.local.AppDatabase
import com.minimart.field.data.local.OrderEntity
import com.minimart.field.data.local.OrderLineItem
import com.minimart.field.data.local.ProductEntity
import com.minimart.field.data.local.SyncStatus
import com.minimart.field.data.remote.ApiService
import com.minimart.field.data.remote.RetrofitClient
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

/**
 * Single entry point for the UI layer. Owns the local Room database and the
 * Retrofit client, and is the only place that talks to the network -
 * everything else in the UI reads/writes Room and never blocks on
 * connectivity.
 */
class Repository(context: Context) {
    val tokenStore = TokenStore(context)
    private val db = AppDatabase.get(context)
    private val api: ApiService = RetrofitClient.create(tokenStore)
    private val deviceId: String = DeviceId.get(context)

    val orders: Flow<List<OrderEntity>> = db.orderDao().observeAll()
    val products: Flow<List<ProductEntity>> = db.productDao().observeAll()

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

    fun logout() = tokenStore.clear()

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
