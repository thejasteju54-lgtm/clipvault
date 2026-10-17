package com.clipvault.app.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

val Terracotta = Color(0xFFC85A32)
val SootBackground = Color(0xFF121212)
val CharcoalSurface = Color(0xFF1E1E1E)
val CharcoalSurfaceVariant = Color(0xFF2A2A2A)
val BoneBackground = Color(0xFFF9F8F6)
val WhiteSurface = Color(0xFFFFFFFF)

private val DarkColorScheme = darkColorScheme(
    primary = Terracotta,
    secondary = Color(0xFFE28B6E),
    background = SootBackground,
    surface = CharcoalSurface,
    surfaceVariant = CharcoalSurfaceVariant,
    onPrimary = Color.White,
    onBackground = Color(0xFFEEEEEE),
    onSurface = Color(0xFFEEEEEE)
)

private val LightColorScheme = lightColorScheme(
    primary = Terracotta,
    secondary = Color(0xFFA64420),
    background = BoneBackground,
    surface = WhiteSurface,
    surfaceVariant = Color(0xFFEDECE8),
    onPrimary = Color.White,
    onBackground = Color(0xFF222222),
    onSurface = Color(0xFF222222)
)

@Composable
fun ClipVaultTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
