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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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

    var lang by remember { mutableStateOf(Lang.EN) }
    val s = strings(lang)

    saleSuccessMessage?.let { message ->
        AlertDialog(
            onDismissRequest = { viewModel.dismissSaleSuccess(); onSaleCompleted() },
            confirmButton = {
                TextButton(onClick = { viewModel.dismissSaleSuccess(); onSaleCompleted() }) { Text(s.ok) }
            },
            icon = { Text("✓", color = MiniMartColors.good, style = MaterialTheme.typography.headlineMedium) },
            title = { Text(s.saleComplete) },
            text = { Text(message) },
        )
    }

    saleError?.let { message ->
        AlertDialog(
            onDismissRequest = { viewModel.dismissSaleError() },
            confirmButton = { TextButton(onClick = { viewModel.dismissSaleError() }) { Text(s.ok) } },
            title = { Text(s.saleFailed, color = MiniMartColors.bad) },
            text = { Text(message) },
        )
    }

    Scaffold(
        containerColor = MiniMartColors.bg,
        topBar = {
            TopAppBar(
                title = { Text(s.title, fontWeight = FontWeight.SemiBold) },
                actions = {
                    Surface(
                        color = Color.White.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(999.dp),
                        onClick = { lang = lang.next() },
                        modifier = Modifier.padding(end = 12.dp),
                    ) {
                        Text(
                            lang.code,
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.labelLarge,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MiniMartColors.brand,
                    titleContentColor = Color.White,
                ),
            )
        },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (lastSyncEpochMs == null) {
                StaleDataBanner(text = s.staleBanner)
            }

            Column(modifier = Modifier.weight(1f).padding(horizontal = 16.dp)) {
                Spacer(Modifier.height(12.dp))
                if (worker == null) {
                    WorkerLookup(
                        strings = s,
                        employeeIdInput = employeeIdInput,
                        lookupError = lookupError,
                        onInputChange = { viewModel.setEmployeeIdInput(it) },
                        onLookup = { viewModel.lookupWorker() },
                    )
                } else {
                    val w = worker!!
                    WorkerCard(
                        strings = s,
                        name = w.name,
                        employeeId = w.employeeId,
                        balance = w.balance,
                        onChangeWorker = { viewModel.clearWorker() },
                    )
                    Spacer(Modifier.height(12.dp))

                    if (products.isEmpty()) {
                        Text(s.noProductsCached, color = MiniMartColors.ink2, modifier = Modifier.padding(16.dp))
                    }
                    LazyVerticalGrid(
                        columns = GridCells.Adaptive(minSize = 170.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.weight(1f),
                    ) {
                        items(products) { product ->
                            ProductCard(
                                strings = s,
                                lang = lang,
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
                    strings = s,
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
private fun StaleDataBanner(text: String) {
    Surface(color = MiniMartColors.warnSoft) {
        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp)) {
            Text(text, color = MiniMartColors.warn, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun WorkerLookup(
    strings: CashierStrings,
    employeeIdInput: String,
    lookupError: String?,
    onInputChange: (String) -> Unit,
    onLookup: () -> Unit,
) {
    Text(strings.enterWorkerId, style = MaterialTheme.typography.titleMedium, color = MiniMartColors.ink)
    Spacer(Modifier.height(12.dp))
    OutlinedTextField(
        value = employeeIdInput,
        onValueChange = onInputChange,
        label = { Text(strings.employeeId) },
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
        Text(strings.lookUpWorker, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun WorkerCard(strings: CashierStrings, name: String, employeeId: String, balance: Double, onChangeWorker: () -> Unit) {
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
                Text("${strings.idLabel}: $employeeId", style = MaterialTheme.typography.bodySmall, color = MiniMartColors.ink3)
                Spacer(Modifier.height(4.dp))
                Text(
                    "₱${"%,.2f".format(balance)}",
                    style = MaterialTheme.typography.titleLarge,
                    color = MiniMartColors.good,
                    fontWeight = FontWeight.Bold,
                )
            }
            TextButton(onClick = onChangeWorker) {
                Text(strings.change, color = MiniMartColors.brand, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

/** Mirrors the web app's Shop.jsx product card: big image up top with the
 * stock warning overlaid on it, name/unit below, price and an Add/stepper
 * control on the same row. Same shape language, same badge colors. */
@Composable
private fun ProductCard(
    strings: CashierStrings,
    lang: Lang,
    product: ProductEntity,
    quantity: Int,
    onQuantityChange: (Int) -> Unit,
) {
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
                StockBadge(strings.outOfStock, MiniMartColors.badSoft, MiniMartColors.bad, Modifier.align(Alignment.TopEnd))
            } else if (lowStock) {
                StockBadge("${product.stock} ${strings.left}", MiniMartColors.warnSoft, MiniMartColors.warn, Modifier.align(Alignment.TopEnd))
            }
        }
        Spacer(Modifier.height(8.dp))
        // Chinese-speaking staff get the Chinese name as the prominent
        // line (when the product has one) with the Indonesian name as a
        // subtitle; everyone else sees it the other way around.
        val primaryName = if (lang == Lang.ZH) product.nameZh?.takeIf { it.isNotBlank() } ?: product.name else product.name
        val secondaryName = if (lang == Lang.ZH) product.name.takeIf { primaryName != it } else product.nameZh?.takeIf { it.isNotBlank() }
        Text(
            primaryName,
            color = MiniMartColors.ink,
            fontWeight = FontWeight.SemiBold,
            style = MaterialTheme.typography.bodyMedium,
            maxLines = 2,
        )
        secondaryName?.let {
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
                        strings.add,
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
private fun ConfirmSaleBar(strings: CashierStrings, total: Double, itemCount: Int, enabled: Boolean, onConfirm: () -> Unit) {
    Surface(color = MiniMartColors.surface, shadowElevation = 8.dp) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            HorizontalDivider(color = MiniMartColors.line)
            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(strings.total, style = MaterialTheme.typography.titleMedium, color = MiniMartColors.ink2)
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
                Text("${strings.confirmSale} ($itemCount)", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}
