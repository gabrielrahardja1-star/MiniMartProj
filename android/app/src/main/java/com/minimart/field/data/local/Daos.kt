package com.minimart.field.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {
    @Query("SELECT * FROM products ORDER BY name")
    fun observeAll(): Flow<List<ProductEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(products: List<ProductEntity>)

    @Query("DELETE FROM products")
    suspend fun clear()
}

@Dao
interface OrderDao {
    @Query("SELECT * FROM orders ORDER BY createdAtEpochMs DESC")
    fun observeAll(): Flow<List<OrderEntity>>

    @Query("SELECT * FROM orders WHERE syncStatus = :status ORDER BY createdAtEpochMs")
    suspend fun getByStatus(status: SyncStatus): List<OrderEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(order: OrderEntity)

    @Update
    suspend fun update(order: OrderEntity)

    @Query(
        "UPDATE orders SET syncStatus = :status, serverOrderId = :serverOrderId, " +
            "lastError = :error, lastSyncAttemptEpochMs = :attemptedAt WHERE clientRecordId = :id"
    )
    suspend fun markResult(
        id: String,
        status: SyncStatus,
        serverOrderId: Int?,
        error: String?,
        attemptedAt: Long,
    )

    @Query(
        "UPDATE orders SET syncStatus = :status, retryCount = retryCount + 1, " +
            "lastSyncAttemptEpochMs = :attemptedAt WHERE clientRecordId = :id"
    )
    suspend fun markAttempt(id: String, status: SyncStatus, attemptedAt: Long)
}
