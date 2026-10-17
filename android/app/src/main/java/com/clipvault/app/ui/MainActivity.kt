package com.clipvault.app.ui

import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.*
import androidx.lifecycle.lifecycleScope
import com.clipvault.app.capture.ClipboardHelper
import com.clipvault.app.data.local.ClipVaultDatabase
import com.clipvault.app.data.local.entity.ClipboardEntity
import com.clipvault.app.ui.screens.TimelineScreen
import com.clipvault.app.ui.theme.ClipVaultTheme
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private val db by lazy { ClipVaultDatabase.getInstance(applicationContext) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            ClipVaultTheme {
                var searchQuery by remember { mutableStateOf("") }
                var selectedFilter by remember { mutableStateOf("All") }
                var items by remember { mutableStateOf<List<ClipboardEntity>>(emptyList()) }

                LaunchedEffect(searchQuery, selectedFilter) {
                    val flow = when {
                        searchQuery.isNotBlank() -> db.clipboardDao().search(searchQuery)
                        selectedFilter == "Pinned" -> db.clipboardDao().observePinned()
                        selectedFilter == "Favorites" -> db.clipboardDao().observeFavorites()
                        selectedFilter == "URLs" -> db.clipboardDao().observeByType("url")
                        selectedFilter == "Code" -> db.clipboardDao().observeByType("code")
                        selectedFilter == "Images" -> db.clipboardDao().observeByType("image")
                        selectedFilter == "Text" -> db.clipboardDao().observeByType("text")
                        else -> db.clipboardDao().observeAll()
                    }
                    flow.collectLatest { items = it }
                }

                TimelineScreen(
                    items = items,
                    searchQuery = searchQuery,
                    onSearchChange = { searchQuery = it },
                    selectedFilter = selectedFilter,
                    onFilterChange = { selectedFilter = it },
                    onTogglePin = { id, pinned ->
                        lifecycleScope.launch { db.clipboardDao().setPinned(id, pinned) }
                    },
                    onToggleFavorite = { id, fav ->
                        lifecycleScope.launch { db.clipboardDao().setFavorite(id, fav) }
                    },
                    onDelete = { id ->
                        lifecycleScope.launch { db.clipboardDao().deleteById(id) }
                    }
                )
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // Tier 4: Focus-Restoration Catch-Up Sync
        // When app gains focus, check primary clip for unrecorded copies
        val cm = getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
        if (cm?.hasPrimaryClip() == true) {
            val clip = cm.primaryClip
            lifecycleScope.launch {
                ClipboardHelper.ingestClipData(
                    context = applicationContext,
                    clipData = clip,
                    sourceApp = "ForegroundFocus"
                )
            }
        }
    }
}
