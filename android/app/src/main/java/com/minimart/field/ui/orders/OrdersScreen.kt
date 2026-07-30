package com.minimart.field.ui.orders

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.minimart.field.data.local.OrderEntity
import com.minimart.field.data.local.SyncStatus

private val tabs = listOf("Pending", "Synced", "Failed")

@Composable
fun OrdersScreen(viewModel: OrdersViewModel = viewModel()) {
    val orders by viewModel.orders.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }

    val filtered = when (selectedTab) {
        0 -> orders.filter { it.syncStatus == SyncStatus.PENDING || it.syncStatus == SyncStatus.UPLOADING }
        1 -> orders.filter { it.syncStatus == SyncStatus.SYNCED }
        else -> orders.filter { it.syncStatus == SyncStatus.FAILED }
    }

    Scaffold(topBar = { TopAppBar(title = { Text("My Orders") }) }) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            TabRow(selectedTabIndex = selectedTab) {
                tabs.forEachIndexed { index, title ->
                    Tab(selected = selectedTab == index, onClick = { selectedTab = index }, text = { Text(title) })
                }
            }
            Button(
                onClick = { viewModel.syncNow() },
                modifier = Modifier.fillMaxWidth().padding(12.dp),
            ) {
                Text("Sync Now")
            }
            LazyColumn(modifier = Modifier.weight(1f)) {
                items(filtered) { order -> OrderRow(order) }
            }
        }
    }
}

@Composable
private fun OrderRow(order: OrderEntity) {
    Card(modifier = Modifier.fillMaxWidth().padding(8.dp)) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text("${order.items.size} item(s) · ₱${"%.2f".format(order.total)}")
            Text("Pickup ${order.pickupDate} ${order.pickupSlot}")
            val (label, color) = when (order.syncStatus) {
                SyncStatus.PENDING -> "Pending" to Color(0xFFF9A825)
                SyncStatus.UPLOADING -> "Uploading..." to Color(0xFF1976D2)
                SyncStatus.SYNCED -> "Synced (#${order.serverOrderId})" to Color(0xFF2E7D32)
                SyncStatus.FAILED -> "Failed (retry ${order.retryCount})" to Color(0xFFC62828)
            }
            Text(label, color = color)
            if (order.syncStatus == SyncStatus.FAILED && order.lastError != null) {
                Text(order.lastError, color = Color.Gray)
            }
        }
    }
}
