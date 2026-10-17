package com.clipvault.app

import android.app.Application
import com.clipvault.app.data.local.ClipVaultDatabase

class ClipVaultApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        // Pre-initialize database to establish WAL journal mode
        ClipVaultDatabase.getInstance(this)
    }
}
