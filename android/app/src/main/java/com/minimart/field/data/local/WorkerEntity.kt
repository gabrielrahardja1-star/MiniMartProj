package com.minimart.field.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/** Locally-cached worker directory (with balance) so the cashier tablet
 * can look someone up by employee ID and check their balance offline. */
@Entity(tableName = "cashier_workers")
data class WorkerEntity(
    @PrimaryKey val employeeId: String,
    val name: String,
    val balance: Double,
)
