package com.minimart.field.ui.orderform

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.IconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.Scaffold
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import java.time.LocalDate

@Composable
fun OrderFormScreen(viewModel: OrderFormViewModel = viewModel(), onOrderQueued: () -> Unit) {
    val products by viewModel.products.collectAsState()
    val cart by viewModel.cart.collectAsState()
    val submitted by viewModel.submitted.collectAsState()

    if (submitted) {
        viewModel.resetSubmitted()
        onOrderQueued()
    }

    Scaffold(topBar = { TopAppBar(title = { Text("New Order") }) }) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (products.isEmpty()) {
                Text(
                    "No products cached yet. Connect to the internet once to download the catalog.",
                    modifier = Modifier.padding(16.dp),
                )
            }
            LazyColumn(modifier = Modifier.weight(1f)) {
                items(products) { product ->
                    val qty = cart[product.id] ?: 0
                    Card(modifier = Modifier.fillMaxWidth().padding(8.dp)) {
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
                                    Icon(Icons.Filled.Remove, contentDescription = "Decrease")
                                }
                                Text(qty.toString())
                                IconButton(onClick = { viewModel.setQuantity(product.id, qty + 1) }) {
                                    Icon(Icons.Filled.Add, contentDescription = "Increase")
                                }
                            }
                        }
                    }
                }
            }
            Button(
                onClick = {
                    val tomorrow = LocalDate.now().plusDays(1).toString()
                    viewModel.submitOrder(pickupDate = tomorrow, pickupSlot = "12:00")
                },
                enabled = cart.isNotEmpty(),
                modifier = Modifier.fillMaxWidth().padding(16.dp),
            ) {
                Text("Save Order (${cart.values.sum()} items) — saved locally, syncs automatically")
            }
        }
    }
}
