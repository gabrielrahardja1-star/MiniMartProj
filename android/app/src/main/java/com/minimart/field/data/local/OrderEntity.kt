package com.minimart.field.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverter
import androidx.room.TypeConverters
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

enum class SyncStatus { PENDING, UPLOADING, SYNCED, FAILED }

data class OrderLineItem(val productId: Int, val productName: String, val quantity: Int, val unitPrice: Double)

class OrderConverters {
    private val gson = Gson()

    @TypeConverter
    fun fromItems(items: List<OrderLineItem>): String = gson.toJson(items)

    @TypeConverter
    fun toItems(json: String): List<OrderLineItem> {
        val type = object : TypeToken<List<OrderLineItem>>() {}.type
        return gson.fromJson(json, type) ?: emptyList()
    }

    @TypeConverter
    fun fromStatus(status: SyncStatus): String = status.name

    @TypeConverter
    fun toStatus(value: String): SyncStatus = SyncStatus.valueOf(value)
}

/**
 * A locally-queued order. `clientRecordId` is the device-generated
 * idempotency key sent to the server so retried uploads never create
 * duplicate orders. Rows are never deleted on failure — only their status
 * and retryCount change — so nothing entered by a worker is ever lost.
 */
@Entity(tableName = "orders")
@TypeConverters(OrderConverters::class)
data class OrderEntity(
    @PrimaryKey val clientRecordId: String,
    val items: List<OrderLineItem>,
    val pickupDate: String, // yyyy-MM-dd
    val pickupSlot: String,
    val total: Double,
    val createdAtEpochMs: Long,
    val syncStatus: SyncStatus,
    val retryCount: Int = 0,
    val lastError: String? = null,
    val serverOrderId: Int? = null,
    val lastSyncAttemptEpochMs: Long? = null,
)
