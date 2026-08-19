package com.minimart.field

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.minimart.field.ui.cashier.CashierScreen
import com.minimart.field.ui.theme.MiniMartFieldTheme

/** Single-purpose cashier tablet - no login screen, no navigation. The
 * Cashier screen is the entire app; it authenticates itself silently in
 * the background (see Repository.ensureLoggedIn()) and shows the last
 * cached product catalog immediately regardless of connectivity. */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MiniMartFieldTheme {
                CashierScreen(onSaleCompleted = {})
            }
        }
    }
}
