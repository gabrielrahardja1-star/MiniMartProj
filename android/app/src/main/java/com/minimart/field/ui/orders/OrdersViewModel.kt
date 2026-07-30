package com.minimart.field.ui.orders

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.minimart.field.data.Repository
import com.minimart.field.data.local.OrderEntity
import com.minimart.field.sync.SyncWorker
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class OrdersViewModel(application: Application) : AndroidViewModel(application) {
    private val repo = Repository.get(application)

    val orders: StateFlow<List<OrderEntity>> =
        repo.orders.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun syncNow() {
        SyncWorker.syncNow(getApplication())
        viewModelScope.launch { repo.refreshMasterData() }
    }
}
