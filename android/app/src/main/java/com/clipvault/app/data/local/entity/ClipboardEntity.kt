package com.clipvault.app.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(
    tableName = "clipboard_items",
    indices = [
        Index(value = ["content_hash"], unique = true),
        Index(value = ["captured_at"]),
        Index(value = ["is_pinned"]),
        Index(value = ["content_type"])
    ]
)
data class ClipboardEntity(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    
    @ColumnInfo(name = "user_id")
    val userId: String = "00000000-0000-0000-0000-000000000000",
    
    @ColumnInfo(name = "device_id")
    val deviceId: String = "android-samsung-a17",
    
    @ColumnInfo(name = "device_name")
    val deviceName: String = "Samsung Galaxy A17 5G",
    
    @ColumnInfo(name = "device_sequence")
    val deviceSequence: Long = 1,
    
    @ColumnInfo(name = "content_type")
    val contentType: String = "text",
    
    @ColumnInfo(name = "plain_text")
    val plainText: String,
    
    @ColumnInfo(name = "detected_url")
    val detectedUrl: String? = null,
    
    @ColumnInfo(name = "html_content")
    val htmlContent: String? = null,
    
    @ColumnInfo(name = "content_hash")
    val contentHash: String,
    
    @ColumnInfo(name = "content_size_bytes")
    val contentSizeBytes: Long = plainText.toByteArray(Charsets.UTF_8).size.toLong(),
    
    @ColumnInfo(name = "attachment_path")
    val attachmentPath: String? = null,
    
    @ColumnInfo(name = "source_app")
    val sourceApp: String? = null,
    
    @ColumnInfo(name = "is_pinned")
    val isPinned: Boolean = false,
    
    @ColumnInfo(name = "is_favorite")
    val isFavorite: Boolean = false,
    
    @ColumnInfo(name = "tags")
    val tags: String = "[]",
    
    @ColumnInfo(name = "captured_at")
    val capturedAt: Long = System.currentTimeMillis(),
    
    @ColumnInfo(name = "sync_status")
    val syncStatus: String = "local",
    
    @ColumnInfo(name = "retention_policy")
    val retentionPolicy: String = "permanent"
)
