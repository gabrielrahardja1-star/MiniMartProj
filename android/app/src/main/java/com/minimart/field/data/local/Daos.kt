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

    @Query("SELECT COUNT(*) FROM products")
    suspend fun count(): Int

    @Query("UPDATE products SET stock = MAX(stock - :quantity, 0) WHERE id = :productId")
    suspend fun decrementStock(productId: Int, quantity: Int)

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

@Dao
interface WorkerDao {
    @Query("SELECT * FROM cashier_workers ORDER BY name")
    fun observeAll(): Flow<List<WorkerEntity>>

    @Query("SELECT * FROM cashier_workers WHERE employeeId = :employeeId")
    suspend fun getByEmployeeId(employeeId: String): WorkerEntity?

    @Query("SELECT COUNT(*) FROM cashier_workers")
    suspend fun count(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(workers: List<WorkerEntity>)

    @Query("UPDATE cashier_workers SET balance = :balance WHERE employeeId = :employeeId")
    suspend fun updateBalance(employeeId: String, balance: Double)

    @Query("DELETE FROM cashier_workers")
    suspend fun clear()
}

@Dao
interface SaleDao {
    @Query("SELECT * FROM cashier_sales ORDER BY createdAtEpochMs DESC")
    fun observeAll(): Flow<List<SaleEntity>>

    @Query("SELECT * FROM cashier_sales WHERE syncStatus = :status ORDER BY createdAtEpochMs")
    suspend fun getByStatus(status: SyncStatus): List<SaleEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(sale: SaleEntity)

    @Query(
        "UPDATE cashier_sales SET syncStatus = :status, serverOrderId = :serverOrderId, " +
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
        "UPDATE cashier_sales SET syncStatus = :status, retryCount = retryCount + 1, " +
            "lastSyncAttemptEpochMs = :attemptedAt WHERE clientRecordId = :id"
    )
    suspend fun markAttempt(id: String, status: SyncStatus, attemptedAt: Long)
}
