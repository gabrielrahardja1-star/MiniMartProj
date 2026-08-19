package com.minimart.field.ui.cashier

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.minimart.field.data.Repository
import com.minimart.field.data.SaleResult
import com.minimart.field.data.local.OrderLineItem
import com.minimart.field.data.local.ProductEntity
import com.minimart.field.data.local.WorkerEntity
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class CashierViewModel(application: Application) : AndroidViewModel(application) {
    private val repo = Repository.get(application)

    init {
        // Picks up the worker directory (with balances) if online; the cached
        // copy from the last refresh is used otherwise.
        viewModelScope.launch { repo.refreshCashierMasterData() }
    }

    val products: StateFlow<List<ProductEntity>> =
        repo.products.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _employeeIdInput = MutableStateFlow("")
    val employeeIdInput: StateFlow<String> = _employeeIdInput

    private val _lookedUpWorker = MutableStateFlow<WorkerEntity?>(null)
    val lookedUpWorker: StateFlow<WorkerEntity?> = _lookedUpWorker

    private val _lookupError = MutableStateFlow<String?>(null)
    val lookupError: StateFlow<String?> = _lookupError

    private val _cart = MutableStateFlow<Map<Int, Int>>(emptyMap())
    val cart: StateFlow<Map<Int, Int>> = _cart

    private val _saleError = MutableStateFlow<String?>(null)
    val saleError: StateFlow<String?> = _saleError

    private val _saleCompleted = MutableStateFlow(false)
    val saleCompleted: StateFlow<Boolean> = _saleCompleted

    fun setEmployeeIdInput(value: String) {
        _employeeIdInput.value = value
    }

    fun lookupWorker() {
        val id = _employeeIdInput.value.trim()
        if (id.isEmpty()) return
        viewModelScope.launch {
            val worker = repo.findWorker(id)
            if (worker == null) {
                _lookupError.value = "No worker found for ID '$id'. Refresh the catalog while online if this worker is new."
                _lookedUpWorker.value = null
            } else {
                _lookupError.value = null
                _lookedUpWorker.value = worker
            }
        }
    }

    fun clearWorker() {
        _lookedUpWorker.value = null
        _lookupError.value = null
        _cart.value = emptyMap()
        _employeeIdInput.value = ""
    }

    fun setQuantity(productId: Int, quantity: Int) {
        _cart.value = _cart.value.toMutableMap().apply {
            if (quantity <= 0) remove(productId) else put(productId, quantity)
        }
    }

    fun cartTotal(): Double {
        val currentProducts = products.value
        return _cart.value.entries.sumOf { (productId, qty) ->
            (currentProducts.find { it.id == productId }?.price ?: 0.0) * qty
        }
    }

    /** Deducts the worker's cached balance immediately and queues the sale
     * for sync - offline is the whole point of this tablet. */
    fun confirmSale() {
        val worker = _lookedUpWorker.value ?: return
        val currentProducts = products.value
        val items = _cart.value.mapNotNull { (productId, qty) ->
            currentProducts.find { it.id == productId }?.let {
                OrderLineItem(it.id, it.name, qty, it.price)
            }
        }
        if (items.isEmpty()) return
        viewModelScope.launch {
            when (val result = repo.queueSale(worker, items)) {
                is SaleResult.Success -> {
                    _cart.value = emptyMap()
                    _lookedUpWorker.value = null
                    _employeeIdInput.value = ""
                    _saleError.value = null
                    _saleCompleted.value = true
                }
                is SaleResult.Error -> {
                    _saleError.value = result.message
                }
            }
        }
    }

    fun resetSaleCompleted() {
        _saleCompleted.value = false
    }

    fun dismissSaleError() {
        _saleError.value = null
    }
}
