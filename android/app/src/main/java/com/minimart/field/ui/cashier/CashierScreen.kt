package com.minimart.field.ui.cashier

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.border
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.minimart.field.BuildConfig
import com.minimart.field.data.local.ProductEntity
import com.minimart.field.ui.theme.MiniMartColors

private val CardShape = RoundedCornerShape(16.dp)

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
            onDismissRequest = { viewModel.dismissSaleSuccess(); onSaleCompleted() },
            confirmButton = {
                TextButton(onClick = { viewModel.dismissSaleSuccess(); onSaleCompleted() }) { Text("OK") }
            },
            icon = { Text("✓", color = MiniMartColors.good, style = MaterialTheme.typography.headlineMedium) },
            title = { Text("Sale complete") },
            text = { Text(message) },
        )
    }

    saleError?.let { message ->
        AlertDialog(
            onDismissRequest = { viewModel.dismissSaleError() },
            confirmButton = { TextButton(onClick = { viewModel.dismissSaleError() }) { Text("OK") } },
            title = { Text("Sale failed", color = MiniMartColors.bad) },
            text = { Text(message) },
        )
    }

    Scaffold(
        containerColor = MiniMartColors.bg,
        topBar = {
            TopAppBar(
                title = { Text("Cashier — New Sale", fontWeight = FontWeight.SemiBold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MiniMartColors.brand,
                    titleContentColor = Color.White,
                ),
            )
        },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (lastSyncEpochMs == null) {
                StaleDataBanner()
            }

            Column(modifier = Modifier.weight(1f).padding(horizontal = 16.dp)) {
                Spacer(Modifier.height(12.dp))
                if (worker == null) {
                    WorkerLookup(
                        employeeIdInput = employeeIdInput,
                        lookupError = lookupError,
                        onInputChange = { viewModel.setEmployeeIdInput(it) },
                        onLookup = { viewModel.lookupWorker() },
                    )
                } else {
                    val w = worker!!
                    WorkerCard(name = w.name, employeeId = w.employeeId, balance = w.balance, onChangeWorker = { viewModel.clearWorker() })
                    Spacer(Modifier.height(12.dp))

                    if (products.isEmpty()) {
                        Text(
                            "No products cached yet. Connect to the internet once to download the catalog.",
                            color = MiniMartColors.ink2,
                            modifier = Modifier.padding(16.dp),
                        )
                    }
                    LazyVerticalGrid(
                        columns = GridCells.Adaptive(minSize = 170.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.weight(1f),
                    ) {
                        items(products) { product ->
                            ProductCard(
                                product = product,
                                quantity = cart[product.id] ?: 0,
                                onQuantityChange = { viewModel.setQuantity(product.id, it) },
                            )
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }

            if (worker != null) {
                ConfirmSaleBar(
                    total = viewModel.cartTotal(),
                    itemCount = cart.values.sum(),
                    enabled = cart.isNotEmpty() && viewModel.cartTotal() <= worker!!.balance,
                    onConfirm = { viewModel.confirmSale() },
                )
            }
        }
    }
}

@Composable
private fun StaleDataBanner() {
    Surface(color = MiniMartColors.warnSoft) {
        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp)) {
            Text(
                "⚠ Using built-in starter data — this tablet has never synced with the server. " +
                    "Balances shown may be out of date. Connect to the internet to get live data.",
                color = MiniMartColors.warn,
                style = MaterialTheme.typography.bodySmall,
            )
        }
    }
}

@Composable
private fun WorkerLookup(
    employeeIdInput: String,
    lookupError: String?,
    onInputChange: (String) -> Unit,
    onLookup: () -> Unit,
) {
    Text("Enter worker ID", style = MaterialTheme.typography.titleMedium, color = MiniMartColors.ink)
    Spacer(Modifier.height(12.dp))
    OutlinedTextField(
        value = employeeIdInput,
        onValueChange = onInputChange,
        label = { Text("Employee ID") },
        singleLine = true,
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = MiniMartColors.brand,
            focusedContainerColor = MiniMartColors.surface,
            unfocusedContainerColor = MiniMartColors.surface,
        ),
        modifier = Modifier.fillMaxWidth(),
    )
    lookupError?.let {
        Spacer(Modifier.height(8.dp))
        Text(it, color = MiniMartColors.bad, style = MaterialTheme.typography.bodySmall)
    }
    Spacer(Modifier.height(16.dp))
    Button(
        onClick = onLookup,
        enabled = employeeIdInput.isNotBlank(),
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(containerColor = MiniMartColors.brand),
        modifier = Modifier.fillMaxWidth().height(52.dp),
    ) {
        Text("Look Up Worker", fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun WorkerCard(name: String, employeeId: String, balance: Double, onChangeWorker: () -> Unit) {
    Card(
        shape = CardShape,
        colors = CardDefaults.cardColors(containerColor = MiniMartColors.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier.size(48.dp).background(MiniMartColors.brandSoft, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    name.take(1).uppercase(),
                    color = MiniMartColors.brandDeep,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleMedium,
                )
            }
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(name, style = MaterialTheme.typography.titleMedium, color = MiniMartColors.ink)
                Text("ID: $employeeId", style = MaterialTheme.typography.bodySmall, color = MiniMartColors.ink3)
                Spacer(Modifier.height(4.dp))
                Text(
                    "₱${"%,.2f".format(balance)}",
                    style = MaterialTheme.typography.titleLarge,
                    color = MiniMartColors.good,
                    fontWeight = FontWeight.Bold,
                )
            }
            TextButton(onClick = onChangeWorker) {
                Text("Change", color = MiniMartColors.brand, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

/** Mirrors the web app's Shop.jsx product card: big image up top with the
 * stock warning overlaid on it, name/unit below, price and an Add/stepper
 * control on the same row. Same shape language, same badge colors. */
@Composable
private fun ProductCard(product: ProductEntity, quantity: Int, onQuantityChange: (Int) -> Unit) {
    val lowStock = product.stock in 1..5
    val outOfStock = product.stock <= 0
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(CardShape)
            .background(MiniMartColors.surface)
            .border(1.dp, MiniMartColors.line, CardShape)
            .padding(12.dp),
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            ProductImage(imageUrl = product.imageUrl)
            if (outOfStock) {
                StockBadge("Out of stock", MiniMartColors.badSoft, MiniMartColors.bad, Modifier.align(Alignment.TopEnd))
            } else if (lowStock) {
                StockBadge("${product.stock} left", MiniMartColors.warnSoft, MiniMartColors.warn, Modifier.align(Alignment.TopEnd))
            }
        }
        Spacer(Modifier.height(8.dp))
        Text(
            product.name,
            color = MiniMartColors.ink,
            fontWeight = FontWeight.SemiBold,
            style = MaterialTheme.typography.bodyMedium,
            maxLines = 2,
        )
        product.nameZh?.takeIf { it.isNotBlank() }?.let {
            Text(it, color = MiniMartColors.ink3, style = MaterialTheme.typography.bodySmall)
        }
        Text(product.unit, color = MiniMartColors.ink3, style = MaterialTheme.typography.bodySmall)

        Spacer(Modifier.height(10.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "₱${"%,.0f".format(product.price)}",
                color = MiniMartColors.ink,
                fontWeight = FontWeight.Bold,
                style = MaterialTheme.typography.titleMedium,
            )
            if (quantity > 0) {
                QuantityStepper(quantity, outOfStock, product.stock, onQuantityChange)
            } else {
                Surface(
                    color = MiniMartColors.brandSoft,
                    shape = RoundedCornerShape(12.dp),
                    onClick = { if (!outOfStock) onQuantityChange(1) },
                    enabled = !outOfStock,
                ) {
                    Text(
                        "Add",
                        color = MiniMartColors.brand,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.labelLarge,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun ProductImage(imageUrl: String?) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .clip(RoundedCornerShape(12.dp))
            .background(MiniMartColors.surfaceAlt),
        contentAlignment = Alignment.Center,
    ) {
        if (imageUrl.isNullOrBlank()) {
            Text("📦", style = MaterialTheme.typography.headlineMedium)
        } else {
            // image_url from the server is relative (e.g. /uploads/products/x.png);
            // resolve it against the same host the app talks to for everything else.
            val fullUrl = BuildConfig.API_BASE_URL.trimEnd('/') + imageUrl
            AsyncImage(
                model = fullUrl,
                contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Modifier.fillMaxSize().padding(10.dp),
            )
        }
    }
}

@Composable
private fun StockBadge(label: String, bg: Color, fg: Color, modifier: Modifier = Modifier) {
    Surface(color = bg, shape = RoundedCornerShape(999.dp), modifier = modifier.padding(6.dp)) {
        Text(
            label,
            color = fg,
            fontWeight = FontWeight.Bold,
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
        )
    }
}

@Composable
private fun QuantityStepper(quantity: Int, outOfStock: Boolean, stock: Int, onQuantityChange: (Int) -> Unit) {
    Row(
        modifier = Modifier.clip(RoundedCornerShape(12.dp)).background(MiniMartColors.brand),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(
            onClick = { onQuantityChange(quantity - 1) },
            colors = IconButtonDefaults.iconButtonColors(contentColor = Color.White),
            modifier = Modifier.size(32.dp),
        ) {
            Text("−", fontWeight = FontWeight.Bold)
        }
        Text(
            quantity.toString(),
            color = Color.White,
            fontWeight = FontWeight.Bold,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.width(20.dp),
            textAlign = TextAlign.Center,
        )
        IconButton(
            onClick = { onQuantityChange(quantity + 1) },
            enabled = !outOfStock && quantity < stock,
            colors = IconButtonDefaults.iconButtonColors(contentColor = Color.White, disabledContentColor = Color.White.copy(alpha = 0.4f)),
            modifier = Modifier.size(32.dp),
        ) {
            Text("+", fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun ConfirmSaleBar(total: Double, itemCount: Int, enabled: Boolean, onConfirm: () -> Unit) {
    Surface(color = MiniMartColors.surface, shadowElevation = 8.dp) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            HorizontalDivider(color = MiniMartColors.line)
            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text("Total", style = MaterialTheme.typography.titleMedium, color = MiniMartColors.ink2)
                Text(
                    "₱${"%,.2f".format(total)}",
                    style = MaterialTheme.typography.titleLarge,
                    color = MiniMartColors.ink,
                    fontWeight = FontWeight.Bold,
                )
            }
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = onConfirm,
                enabled = enabled,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MiniMartColors.brand,
                    disabledContainerColor = MiniMartColors.surfaceAlt,
                ),
                modifier = Modifier.fillMaxWidth().height(56.dp),
            ) {
                Text("Confirm Sale ($itemCount items)", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}
