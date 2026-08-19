package com.minimart.field.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight

/** Mirrors the web app's palette (frontend/src/utils/theme.js) so the
 * cashier tablet reads as the same product, not a bare-default Material
 * app. This is a fixed kiosk device, always in the light brand theme -
 * no dark-mode branch, since consistency here matters more than following
 * the OS setting. */
object MiniMartColors {
    val bg = Color(0xFFF4F8FC)
    val surface = Color(0xFFFFFFFF)
    val surfaceAlt = Color(0xFFEAF2FA)
    val ink = Color(0xFF0C2340)
    val ink2 = Color(0xFF445A77)
    val ink3 = Color(0xFF8AA0BC)
    val line = Color(0xFFE1EAF3)
    val brand = Color(0xFF3B82F6)
    val brandDeep = Color(0xFF1E5BC6)
    val brandSoft = Color(0xFFDCE8F8)
    val good = Color(0xFF10B981)
    val warn = Color(0xFFF59E0B)
    val bad = Color(0xFFEF4444)
    val goodSoft = Color(0xFFD6F3E6)
    val warnSoft = Color(0xFFFDEFD1)
    val badSoft = Color(0xFFFCE0E0)
}

private val MiniMartLightColors = lightColorScheme(
    primary = MiniMartColors.brand,
    onPrimary = Color.White,
    primaryContainer = MiniMartColors.brandSoft,
    onPrimaryContainer = MiniMartColors.brandDeep,
    secondary = MiniMartColors.brandDeep,
    background = MiniMartColors.bg,
    onBackground = MiniMartColors.ink,
    surface = MiniMartColors.surface,
    onSurface = MiniMartColors.ink,
    surfaceVariant = MiniMartColors.surfaceAlt,
    onSurfaceVariant = MiniMartColors.ink2,
    outline = MiniMartColors.line,
    outlineVariant = MiniMartColors.line,
    error = MiniMartColors.bad,
    onError = Color.White,
    errorContainer = MiniMartColors.badSoft,
    onErrorContainer = MiniMartColors.bad,
    tertiary = MiniMartColors.good,
    tertiaryContainer = MiniMartColors.goodSoft,
    onTertiaryContainer = MiniMartColors.good,
)

private val MiniMartTypography = Typography().let { base ->
    base.copy(
        headlineMedium = base.headlineMedium.copy(fontWeight = FontWeight.SemiBold),
        titleLarge = base.titleLarge.copy(fontWeight = FontWeight.SemiBold),
        titleMedium = base.titleMedium.copy(fontWeight = FontWeight.SemiBold),
    )
}

@Composable
fun MiniMartFieldTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = MiniMartLightColors, typography = MiniMartTypography, content = content)
}
