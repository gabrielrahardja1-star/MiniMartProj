package com.minimart.field.sync

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.minimart.field.data.Repository
import java.util.concurrent.TimeUnit

/** Runs whenever a network becomes available (via WorkManager constraints)
 * and pushes any Pending/Failed local orders to the server. Runs as work,
 * not a plain coroutine, so it survives app kill and device reboot. */
class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val repo = Repository.get(applicationContext)
        if (!repo.tokenStore.isLoggedIn()) return Result.success()

        val ordersSynced = repo.syncPendingOrders()
        val salesSynced = repo.syncPendingSales()
        return if (ordersSynced && salesSynced) Result.success() else Result.retry()
    }

    companion object {
        private const val PERIODIC_WORK_NAME = "minimart_periodic_sync"
        private const val ONE_TIME_WORK_NAME = "minimart_manual_sync"

        private fun networkConstraints() = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        /** Call once (e.g. app startup) to guarantee sync retries even if
         * the user never presses "Sync Now". */
        fun schedulePeriodic(context: Context) {
            val request = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
                .setConstraints(networkConstraints())
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                PERIODIC_WORK_NAME,
                androidx.work.ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
        }

        /** "Sync Now" button: runs immediately if a network is available. */
        fun syncNow(context: Context) {
            val request = OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(networkConstraints())
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                ONE_TIME_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                request,
            )
        }
    }
}
