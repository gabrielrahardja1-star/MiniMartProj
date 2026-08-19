package com.minimart.field.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Wraps EncryptedSharedPreferences (Android Keystore-backed) so the JWT and
 * logged-in worker identity are never stored in plaintext on disk.
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

    fun saveSession(token: String, workerId: Int, employeeId: String, name: String, role: String) {
        prefs.edit()
            .putString(KEY_TOKEN, token)
            .putInt(KEY_WORKER_ID, workerId)
            .putString(KEY_EMPLOYEE_ID, employeeId)
            .putString(KEY_NAME, name)
            .putString(KEY_ROLE, role)
            .apply()
    }

    fun token(): String? = prefs.getString(KEY_TOKEN, null)
    fun workerId(): Int = prefs.getInt(KEY_WORKER_ID, -1)
    fun workerName(): String? = prefs.getString(KEY_NAME, null)
    fun employeeId(): String? = prefs.getString(KEY_EMPLOYEE_ID, null)
    fun role(): String? = prefs.getString(KEY_ROLE, null)
    fun isLoggedIn(): Boolean = token() != null

    fun clear() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val KEY_TOKEN = "access_token"
        private const val KEY_WORKER_ID = "worker_id"
        private const val KEY_EMPLOYEE_ID = "employee_id"
        private const val KEY_NAME = "name"
        private const val KEY_ROLE = "role"
    }
}
