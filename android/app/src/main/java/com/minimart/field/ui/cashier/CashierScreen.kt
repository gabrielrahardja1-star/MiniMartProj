package com.minimart.field.ui.cashier

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CashierScreen(viewModel: CashierViewModel = viewModel(), onSaleCompleted: () -> Unit) {
    val employeeIdInput by viewModel.employeeIdInput.collectAsState()
    val worker by viewModel.lookedUpWorker.collectAsState()
    val lookupError by viewModel.lookupError.collectAsState()
    val products by viewModel.products.collectAsState()
    val cart by viewModel.cart.collectAsState()
    val saleError by viewModel.saleError.collectAsState()
    val saleSuccessMessage by viewModel.saleSuccessMessage.collectAsState()
    val lastSyncEpochMs by viewModel.lastSyncEpochMs.collectAsState()

    saleSuccessMessage?.let { message ->
        AlertDialog(
            onDismissRequest = {
                viewModel.dismissSaleSuccess()
                onSaleCompleted()
            },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.dismissSaleSuccess()
                    onSaleCompleted()
                }) { Text("OK") }
            },
            title = { Text("Sale complete") },
            text = { Text(message) },
        )
    }

    saleError?.let { message ->
        AlertDialog(
            onDismissRequest = { viewModel.dismissSaleError() },
            confirmButton = { TextButton(onClick = { viewModel.dismissSaleError() }) { Text("OK") } },
            title = { Text("Sale failed") },
            text = { Text(message) },
        )
    }

    Scaffold(topBar = { TopAppBar(title = { Text("Cashier — New Sale") }) }) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            if (lastSyncEpochMs == null) {
                Card(modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
                    Text(
                        "Using built-in starter data — this tablet has never synced with the server. " +
                            "Balances shown may be out of date. Connect to the internet to get live data.",
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(12.dp),
                    )
                }
            }
            if (worker == null) {
                Text("Enter worker ID", style = MaterialTheme.typography.titleMedium)
                OutlinedTextField(
                    value = employeeIdInput,
                    onValueChange = { viewModel.setEmployeeIdInput(it) },
                    label = { Text("Employee ID") },
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                )
                lookupError?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
                }
                Button(
                    onClick = { viewModel.lookupWorker() },
                    enabled = employeeIdInput.isNotBlank(),
                    modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
                ) {
                    Text("Look Up Worker")
                }
            } else {
                val w = worker!!
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(w.name, style = MaterialTheme.typography.titleLarge)
                        Text("ID: ${w.employeeId}")
                        Text("Balance: ₱${"%.2f".format(w.balance)}")
                        TextButton(onClick = { viewModel.clearWorker() }, modifier = Modifier.padding(top = 4.dp)) {
                            Text("Change worker")
                        }
                    }
                }

                if (products.isEmpty()) {
                    Text(
                        "No products cached yet. Connect to the internet once to download the catalog.",
                        modifier = Modifier.padding(16.dp),
                    )
                }
                LazyColumn(modifier = Modifier.weight(1f)) {
                    items(products) { product ->
                        val qty = cart[product.id] ?: 0
                        Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column {
                                    Text(product.name)
                                    Text("₱${product.price} / ${product.unit} · stock ${product.stock}")
                                }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    IconButton(onClick = { viewModel.setQuantity(product.id, qty - 1) }) {
                                        Text("−", style = MaterialTheme.typography.titleLarge)
                                    }
                                    Text(qty.toString())
                                    IconButton(onClick = { viewModel.setQuantity(product.id, qty + 1) }) {
                                        Text("+", style = MaterialTheme.typography.titleLarge)
                                    }
                                }
                            }
                        }
                    }
                }

                val total = viewModel.cartTotal()
                Text(
                    "Total: ₱${"%.2f".format(total)}",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(top = 8.dp),
                )
                Button(
                    onClick = { viewModel.confirmSale() },
                    enabled = cart.isNotEmpty() && total <= w.balance,
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                ) {
                    Text("Confirm Sale (${cart.values.sum()} items)")
                }
            }
        }
    }
}
