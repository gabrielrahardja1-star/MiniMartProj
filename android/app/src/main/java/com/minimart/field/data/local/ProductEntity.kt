package com.minimart.field.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/** Locally-cached copy of the server's product catalog, refreshed whenever
 * the app is online. Lets the order form work fully offline. */
@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey val id: Int,
    val name: String,
    val sku: String,
    val price: Double,
    val stock: Int,
    val unit: String,
    val category: String?,
)
