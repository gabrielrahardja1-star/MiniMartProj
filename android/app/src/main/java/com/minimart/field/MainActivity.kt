package com.minimart.field

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.minimart.field.data.Repository
import com.minimart.field.ui.cashier.CashierScreen
import com.minimart.field.ui.dashboard.DashboardScreen
import com.minimart.field.ui.login.LoginScreen
import com.minimart.field.ui.orderform.OrderFormScreen
import com.minimart.field.ui.orders.OrdersScreen
import com.minimart.field.ui.theme.MiniMartFieldTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MiniMartFieldTheme {
                MiniMartNavHost()
            }
        }
    }
}

private object Routes {
    const val LOGIN = "login"
    const val DASHBOARD = "dashboard"
    const val NEW_ORDER = "new_order"
    const val ORDERS = "orders"
    const val CASHIER = "cashier"
}

@Composable
private fun MiniMartNavHost() {
    val navController: NavHostController = rememberNavController()
    val repo = Repository.get(androidx.compose.ui.platform.LocalContext.current)
    val startDestination = if (repo.tokenStore.isLoggedIn()) Routes.DASHBOARD else Routes.LOGIN

    NavHost(navController = navController, startDestination = startDestination) {
        composable(Routes.LOGIN) {
            LoginScreen(onLoggedIn = {
                navController.navigate(Routes.DASHBOARD) {
                    popUpTo(Routes.LOGIN) { inclusive = true }
                }
            })
        }
        composable(Routes.DASHBOARD) {
            val role = repo.tokenStore.role()
            DashboardScreen(
                workerName = repo.tokenStore.workerName() ?: "Worker",
                isCashier = role == "cashier" || role == "admin",
                onNewOrder = { navController.navigate(Routes.NEW_ORDER) },
                onViewOrders = { navController.navigate(Routes.ORDERS) },
                onCashierMode = { navController.navigate(Routes.CASHIER) },
            )
        }
        composable(Routes.NEW_ORDER) {
            OrderFormScreen(onOrderQueued = { navController.popBackStack() })
        }
        composable(Routes.ORDERS) {
            OrdersScreen()
        }
        composable(Routes.CASHIER) {
            CashierScreen(onSaleCompleted = { navController.popBackStack() })
        }
    }
}
