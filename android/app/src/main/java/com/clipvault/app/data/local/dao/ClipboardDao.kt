package com.clipvault.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.clipvault.app.data.local.entity.ClipboardEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ClipboardDao {

    @Query("SELECT * FROM clipboard_items ORDER BY captured_at DESC")
    fun observeAll(): Flow<List<ClipboardEntity>>

    @Query("SELECT * FROM clipboard_items WHERE content_type = :type ORDER BY captured_at DESC")
    fun observeByType(type: String): Flow<List<ClipboardEntity>>

    @Query("SELECT * FROM clipboard_items WHERE is_pinned = 1 ORDER BY captured_at DESC")
    fun observePinned(): Flow<List<ClipboardEntity>>

    @Query("SELECT * FROM clipboard_items WHERE is_favorite = 1 ORDER BY captured_at DESC")
    fun observeFavorites(): Flow<List<ClipboardEntity>>

    @Query("""
        SELECT * FROM clipboard_items 
        WHERE plain_text LIKE '%' || :query || '%' 
           OR detected_url LIKE '%' || :query || '%'
        ORDER BY captured_at DESC
    """)
    fun search(query: String): Flow<List<ClipboardEntity>>

    @Query("SELECT * FROM clipboard_items WHERE content_hash = :hash LIMIT 1")
    suspend fun getByHash(hash: String): ClipboardEntity?

    @Query("SELECT * FROM clipboard_items WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): ClipboardEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: ClipboardEntity): Long

    @Update
    suspend fun update(entity: ClipboardEntity)

    @Query("UPDATE clipboard_items SET captured_at = :newTimestamp WHERE id = :id")
    suspend fun touchTimestamp(id: String, newTimestamp: Long)

    @Query("UPDATE clipboard_items SET is_pinned = :pinned WHERE id = :id")
    suspend fun setPinned(id: String, pinned: Boolean)

    @Query("UPDATE clipboard_items SET is_favorite = :favorite WHERE id = :id")
    suspend fun setFavorite(id: String, favorite: Boolean)

    @Query("DELETE FROM clipboard_items WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("SELECT COUNT(*) FROM clipboard_items")
    suspend fun getCount(): Int

    @Query("SELECT COUNT(*) FROM clipboard_items WHERE sync_status = 'pending_sync'")
    fun observePendingSyncCount(): Flow<Int>
}
