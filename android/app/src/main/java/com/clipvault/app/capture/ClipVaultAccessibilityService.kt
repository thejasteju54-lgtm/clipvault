package com.clipvault.app.capture

import android.accessibilityservice.AccessibilityService
import android.content.ClipboardManager
import android.content.Context
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class ClipVaultAccessibilityService : AccessibilityService() {

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var clipboardManager: ClipboardManager? = null

    override fun onServiceConnected() {
        super.onServiceConnected()
        clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
        Log.i("ClipVaultAccess", "ClipVault Accessibility Service connected and monitoring")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        // Intercept text selection and window state changes
        if (event.eventType == AccessibilityEvent.TYPE_VIEW_TEXT_SELECTION_CHANGED ||
            event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
        ) {
            val sourcePackage = event.packageName?.toString()

            // Skip if event originated from ClipVault itself
            if (sourcePackage == packageName) return

            // Check if clipboard has primary clip
            val cm = clipboardManager ?: return
            if (!cm.hasPrimaryClip()) return

            serviceScope.launch {
                try {
                    val primaryClip = cm.primaryClip
                    if (primaryClip != null) {
                        ClipboardHelper.ingestClipData(
                            context = applicationContext,
                            clipData = primaryClip,
                            sourceApp = sourcePackage
                        )
                    }
                } catch (e: Exception) {
                    // Silently handle any platform security restrictions
                }
            }
        }
    }

    override fun onInterrupt() {
        Log.w("ClipVaultAccess", "ClipVault Accessibility Service interrupted")
    }
}
