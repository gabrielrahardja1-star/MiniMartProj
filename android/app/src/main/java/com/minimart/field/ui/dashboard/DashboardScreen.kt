package com.minimart.field.ui.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun DashboardScreen(
    workerName: String,
    isCashier: Boolean,
    onNewOrder: () -> Unit,
    onViewOrders: () -> Unit,
    onCashierMode: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text("Welcome, $workerName")
        androidx.compose.foundation.layout.Spacer(Modifier.padding(12.dp))
        Button(onClick = onNewOrder, modifier = Modifier.fillMaxWidth()) { Text("New Order") }
        androidx.compose.foundation.layout.Spacer(Modifier.padding(8.dp))
        Button(onClick = onViewOrders, modifier = Modifier.fillMaxWidth()) { Text("My Orders") }
        if (isCashier) {
            androidx.compose.foundation.layout.Spacer(Modifier.padding(8.dp))
            Button(onClick = onCashierMode, modifier = Modifier.fillMaxWidth()) { Text("Cashier Mode") }
        }
    }
}
