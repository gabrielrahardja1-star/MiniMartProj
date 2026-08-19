package com.minimart.field.data.remote.dto

data class LoginRequest(
    val employee_id: String,
    val pin: String,
)

data class TokenResponse(
    val access_token: String,
    val id: Int,
    val employee_id: String,
    val name: String,
    val role: String,
    val pin_hash: String? = null,
)

data class ProductDto(
    val id: Int,
    val name: String,
    val name_zh: String?,
    val sku: String,
    val price: Double,
    val stock: Int,
    val unit: String,
    val category: String?,
    val sub_category: String?,
    val brand: String?,
    val size: String?,
    val image_url: String?,
)

data class MasterDataResponse(
    val products: List<ProductDto>,
    val pickup_slot_options: List<String>,
    val server_time: String,
)

data class SyncOrderItemRequest(
    val product_id: Int,
    val quantity: Int,
)

data class SyncOrderRequest(
    val client_record_id: String,
    val items: List<SyncOrderItemRequest>,
    val pickup_date: String, // yyyy-MM-dd
    val pickup_slot: String,
)

data class SyncOrdersRequest(
    val orders: List<SyncOrderRequest>,
)

data class SyncOrderResult(
    val client_record_id: String,
    val status: String, // "synced" | "failed"
    val server_order_id: Int?,
    val error: String?,
)

data class SyncOrdersResponse(
    val results: List<SyncOrderResult>,
)

data class WorkerLookupDto(
    val id: Int,
    val employee_id: String,
    val name: String,
    val balance: Double,
)

data class CashierMasterDataResponse(
    val products: List<ProductDto>,
    val workers: List<WorkerLookupDto>,
    val server_time: String,
)

data class CashierSaleRequest(
    val client_record_id: String,
    val worker_employee_id: String,
    val items: List<SyncOrderItemRequest>,
)

data class CashierSalesRequest(
    val sales: List<CashierSaleRequest>,
)

data class CashierSaleResult(
    val client_record_id: String,
    val status: String, // "synced" | "failed"
    val server_order_id: Int?,
    val worker_balance_after: Double?,
    val error: String?,
)

data class CashierSalesResponse(
    val results: List<CashierSaleResult>,
)
