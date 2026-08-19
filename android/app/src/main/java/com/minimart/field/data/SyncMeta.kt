package com.minimart.field.data

import android.content.Context

/** Tracks whether the catalog/worker directory currently on this device
 * came from a real server sync or is still the bundled starter snapshot
 * (see assets/seed_data.json) - lets the UI warn that balances shown may
 * be stale until a real sync has happened at least once. Plain (not
 * encrypted) prefs since none of this is sensitive. */
class SyncMeta(context: Context) {
    private val prefs = context.getSharedPreferences("minimart_sync_meta", Context.MODE_PRIVATE)

    fun lastCashierSyncEpochMs(): Long? {
        val value = prefs.getLong(KEY_LAST_SYNC, -1)
        return if (value == -1L) null else value
    }

    fun markCashierSynced() {
        prefs.edit().putLong(KEY_LAST_SYNC, System.currentTimeMillis()).apply()
    }

    companion object {
        private const val KEY_LAST_SYNC = "last_cashier_sync_epoch_ms"
    }
}
