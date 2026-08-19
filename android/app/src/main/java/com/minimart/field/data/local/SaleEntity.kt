package com.minimart.field.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * A locally-queued cashier sale: a worker walks up, the cashier rings up
 * items, and the sale is deducted from that worker's cached balance
 * immediately (offline-authoritative) - the server re-deducts for real
 * once this syncs. `clientRecordId` is the idempotency key, same pattern
 * as [OrderEntity].
 */
@Entity(tableName = "cashier_sales")
data class SaleEntity(
    @PrimaryKey val clientRecordId: String,
    val workerEmployeeId: String,
    val workerName: String,
    val items: List<OrderLineItem>,
    val total: Double,
    val createdAtEpochMs: Long,
    val syncStatus: SyncStatus,
    val retryCount: Int = 0,
    val lastError: String? = null,
    val serverOrderId: Int? = null,
    val lastSyncAttemptEpochMs: Long? = null,
)
