package com.clipvault.app.capture

import android.content.ClipboardManager
import android.content.Context
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import android.widget.Toast
import androidx.annotation.RequiresApi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@RequiresApi(Build.VERSION_CODES.N)
class ClipVaultTileService : TileService() {

    private val tileScope = CoroutineScope(Dispatchers.Main)

    override fun onClick() {
        super.onClick()
        val cm = getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
        if (cm == null || !cm.hasPrimaryClip()) {
            Toast.makeText(this, "Clipboard is empty", Toast.LENGTH_SHORT).show()
            return
        }

        val primaryClip = cm.primaryClip
        tileScope.launch {
            val saved = ClipboardHelper.ingestClipData(
                context = applicationContext,
                clipData = primaryClip,
                sourceApp = "QuickSettingsTile"
            )
            if (saved) {
                Toast.makeText(applicationContext, "Saved to ClipVault", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(applicationContext, "Skipped or already saved", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onStartListening() {
        super.onStartListening()
        qsTile?.state = Tile.STATE_ACTIVE
        qsTile?.updateTile()
    }
}
