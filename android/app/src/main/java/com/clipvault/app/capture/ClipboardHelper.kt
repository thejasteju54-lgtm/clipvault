package com.clipvault.app.capture

import android.content.ClipData
import android.content.ClipDescription
import android.content.Context
import android.os.Build
import android.util.Log
import com.clipvault.app.data.local.ClipVaultDatabase
import com.clipvault.app.data.local.entity.ClipboardEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.security.MessageDigest
import java.util.UUID

object ClipboardHelper {

    private const val TAG = "ClipVaultCapture"

    /**
     * Ingests ClipData from any capture source (Accessibility, Tile, Share Sheet, or Activity resume).
     * Returns true if item was saved or updated; false if dropped (e.g. sensitive or empty).
     */
    suspend fun ingestClipData(
        context: Context,
        clipData: ClipData?,
        sourceApp: String? = null
    ): Boolean = withContext(Dispatchers.IO) {
        if (clipData == null || clipData.itemCount == 0) return@withContext false

        // 1. Android 13+ Sensitive Content Check (EXTRA_IS_SENSITIVE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val isSensitive = clipData.description?.extras?.getBoolean(
                ClipDescription.EXTRA_IS_SENSITIVE, false
            ) ?: false
            if (isSensitive) {
                Log.i(TAG, "Item flagged as EXTRA_IS_SENSITIVE dropped per security policy")
                return@withContext false
            }
        }

        val item = clipData.getItemAt(0) ?: return@withContext false
        val plainText = item.text?.toString() ?: item.uri?.toString() ?: return@withContext false
        val trimmed = plainText.trim()
        if (trimmed.isEmpty()) return@withContext false

        val htmlContent = item.htmlText

        // 2. Classify content type
        val detectedUrl = extractUrl(trimmed)
        val contentType = when {
            item.uri != null && (clipData.description?.hasMimeType("image/*") == true) -> "image"
            detectedUrl != null && (trimmed == detectedUrl || trimmed.startsWith("http")) -> "url"
            detectCode(trimmed) -> "code"
            htmlContent != null -> "rich_text"
            else -> "text"
        }

        // 3. Compute SHA-256 Content Hash
        val hash = sha256("$contentType:$trimmed")

        val dao = ClipVaultDatabase.getInstance(context).clipboardDao()

        // 4. Deduplication Check
        val existing = dao.getByHash(hash)
        if (existing != null) {
            dao.touchTimestamp(existing.id, System.currentTimeMillis())
            Log.i(TAG, "Duplicate item touched without re-insertion (id: ${existing.id})")
            return@withContext true
        }

        // 5. Atomic Insert
        val entity = ClipboardEntity(
            id = UUID.randomUUID().toString(),
            contentType = contentType,
            plainText = trimmed,
            detectedUrl = detectedUrl,
            htmlContent = htmlContent,
            contentHash = hash,
            sourceApp = sourceApp,
            capturedAt = System.currentTimeMillis(),
            syncStatus = "local"
        )

        dao.insert(entity)
        Log.i(TAG, "Successfully captured and persisted item (type: $contentType, size: ${entity.contentSizeBytes}B)")
        return@withContext true
    }

    private fun sha256(input: String): String {
        val bytes = MessageDigest.getInstance("SHA-256").digest(input.toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }

    private fun extractUrl(text: String): String? {
        val regex = Regex("https?://[^\\s<>\"]+", RegexOption.IGNORE_CASE)
        val match = regex.find(text)?.value ?: return null
        return try {
            val uri = android.net.Uri.parse(match)
            if (uri.scheme?.startsWith("http") == true) uri.toString() else null
        } catch (_: Exception) {
            null
        }
    }

    private fun detectCode(text: String): Boolean {
        val codeMarkers = listOf("fun ", "val ", "var ", "class ", "import ", "SELECT ", "const ", "function ")
        return codeMarkers.any { text.contains(it) }
    }
}
