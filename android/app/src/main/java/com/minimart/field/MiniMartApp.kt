package com.minimart.field

import android.app.Application
import com.minimart.field.sync.SyncWorker

class MiniMartApp : Application() {
    override fun onCreate() {
        super.onCreate()
        SyncWorker.schedulePeriodic(this)
    }
}
