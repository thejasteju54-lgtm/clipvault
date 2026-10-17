package com.clipvault.app.capture

import android.app.Activity
import android.content.ClipData
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class ShareReceiverActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (intent?.action == Intent.ACTION_SEND) {
            val text = intent.getStringExtra(Intent.EXTRA_TEXT)
            val uri = intent.getParcelableExtra<android.net.Uri>(Intent.EXTRA_STREAM)

            val clipData = when {
                text != null -> ClipData.newPlainText("Shared Text", text)
                uri != null -> ClipData.newUri(contentResolver, "Shared Image", uri)
                else -> null
            }

            if (clipData != null) {
                CoroutineScope(Dispatchers.Main).launch {
                    val saved = ClipboardHelper.ingestClipData(
                        context = applicationContext,
                        clipData = clipData,
                        sourceApp = callingPackage ?: "SystemShare"
                    )
                    if (saved) {
                        Toast.makeText(applicationContext, "Saved to ClipVault", Toast.LENGTH_SHORT).show()
                    }
                    finish()
                }
                return
            }
        }
        finish()
    }
}
