package com.minimart.field.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Wraps EncryptedSharedPreferences (Android Keystore-backed) so the JWT and
 * logged-in worker identity are never stored in plaintext on disk.
 *
 * Keeps two things apart: the *active session* (KEY_TOKEN - cleared on
 * logout) and the *offline-login cache* (employee id, bcrypt pin hash, last
 * known token/name/role/worker id - survives logout). The cache is what lets
 * a worker log back in on this device with just their real PIN when there's
 * no signal, verified locally instead of against the server.
 */
class TokenStore(context: Context) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs = EncryptedSharedPreferences.create(
        context,
        "minimart_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    /** Call after any successful login, online or offline-verified. */
    fun saveSession(
        token: String,
        workerId: Int,
        employeeId: String,
        name: String,
        role: String,
        pinHash: String? = null,
    ) {
        prefs.edit()
            .putString(KEY_TOKEN, token)
            .putString(KEY_LAST_TOKEN, token)
            .putInt(KEY_WORKER_ID, workerId)
            .putString(KEY_EMPLOYEE_ID, employeeId)
            .putString(KEY_NAME, name)
            .putString(KEY_ROLE, role)
            .apply {
                // Only overwrite the cached hash if we actually got a fresh
                // one - an offline re-login doesn't have one to give.
                if (pinHash != null) putString(KEY_PIN_HASH, pinHash)
            }
            .apply()
    }

    fun token(): String? = prefs.getString(KEY_TOKEN, null)
    fun workerId(): Int = prefs.getInt(KEY_WORKER_ID, -1)
    fun workerName(): String? = prefs.getString(KEY_NAME, null)
    fun employeeId(): String? = prefs.getString(KEY_EMPLOYEE_ID, null)
    fun role(): String? = prefs.getString(KEY_ROLE, null)
    fun isLoggedIn(): Boolean = token() != null

    /** The employee ID, bcrypt PIN hash and last-issued token from this
     * device's last successful online login, if any - lets the login screen
     * verify a PIN locally and restore a session when the server can't be
     * reached. Survives [logout]. */
    fun cachedEmployeeId(): String? = prefs.getString(KEY_EMPLOYEE_ID, null)
    fun cachedPinHash(): String? = prefs.getString(KEY_PIN_HASH, null)
    fun cachedLastToken(): String? = prefs.getString(KEY_LAST_TOKEN, null)

    /** Ends the active session (isLoggedIn() becomes false, login screen
     * shows again) but deliberately keeps the offline-login cache so the
     * same worker can still get back in without a network connection. */
    fun logout() {
        prefs.edit().remove(KEY_TOKEN).apply()
    }

    companion object {
        private const val KEY_TOKEN = "access_token"
        private const val KEY_LAST_TOKEN = "last_access_token"
        private const val KEY_WORKER_ID = "worker_id"
        private const val KEY_EMPLOYEE_ID = "employee_id"
        private const val KEY_NAME = "name"
        private const val KEY_ROLE = "role"
        private const val KEY_PIN_HASH = "pin_hash"
    }
}
