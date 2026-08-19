package com.minimart.field.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters

@Database(
    entities = [ProductEntity::class, OrderEntity::class, WorkerEntity::class, SaleEntity::class],
    version = 3,
    exportSchema = false,
)
@TypeConverters(OrderConverters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun productDao(): ProductDao
    abstract fun orderDao(): OrderDao
    abstract fun workerDao(): WorkerDao
    abstract fun saleDao(): SaleDao

    companion object {
        @Volatile private var instance: AppDatabase? = null

        fun get(context: Context): AppDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "minimart_field.db",
                )
                    // No migration written yet for the cashier tables (v1 -> v2);
                    // acceptable to wipe local data pre-launch. Revisit before
                    // this ships with real queued orders on devices.
                    .fallbackToDestructiveMigration()
                    .build().also { instance = it }
            }
    }
}
