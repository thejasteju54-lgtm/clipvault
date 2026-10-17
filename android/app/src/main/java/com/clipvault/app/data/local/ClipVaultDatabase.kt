package com.clipvault.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.clipvault.app.data.local.dao.ClipboardDao
import com.clipvault.app.data.local.entity.ClipboardEntity

@Database(
    entities = [ClipboardEntity::class],
    version = 1,
    exportSchema = false
)
abstract class ClipVaultDatabase : RoomDatabase() {

    abstract fun clipboardDao(): ClipboardDao

    companion object {
        @Volatile
        private var INSTANCE: ClipVaultDatabase? = null

        fun getInstance(context: Context): ClipVaultDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    ClipVaultDatabase::class.java,
                    "clipvault.db"
                )
                    .setJournalMode(JournalMode.WRITE_AHEAD_LOGGING) // High-performance WAL mode
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
