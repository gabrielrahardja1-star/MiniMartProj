package com.minimart.field.ui.orderform

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.minimart.field.data.Repository
import com.minimart.field.data.local.OrderLineItem
import com.minimart.field.data.local.ProductEntity
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.SharingStarted

class OrderFormViewModel(application: Application) : AndroidViewModel(application) {
    private val repo = Repository.get(application)

    val products: StateFlow<List<ProductEntity>> =
        repo.products.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _cart = MutableStateFlow<Map<Int, Int>>(emptyMap())
    val cart: StateFlow<Map<Int, Int>> = _cart

    private val _submitted = MutableStateFlow(false)
    val submitted: StateFlow<Boolean> = _submitted

    fun setQuantity(productId: Int, quantity: Int) {
        _cart.value = _cart.value.toMutableMap().apply {
            if (quantity <= 0) remove(productId) else put(productId, quantity)
        }
    }

    /** Saves the order to Room immediately (Pending) regardless of network
     * state - offline submission is the whole point of this screen. */
    fun submitOrder(pickupDate: String, pickupSlot: String) {
        val currentProducts = products.value
        val items = _cart.value.mapNotNull { (productId, qty) ->
            currentProducts.find { it.id == productId }?.let {
                OrderLineItem(it.id, it.name, qty, it.price)
            }
        }
        if (items.isEmpty()) return
        viewModelScope.launch {
            repo.queueOrder(items, pickupDate, pickupSlot)
            _cart.value = emptyMap()
            _submitted.value = true
        }
    }

    fun resetSubmitted() {
        _submitted.value = false
    }
}
