package com.minimart.field.data.remote

import com.minimart.field.data.remote.dto.CashierMasterDataResponse
import com.minimart.field.data.remote.dto.CashierSalesRequest
import com.minimart.field.data.remote.dto.CashierSalesResponse
import com.minimart.field.data.remote.dto.LoginRequest
import com.minimart.field.data.remote.dto.MasterDataResponse
import com.minimart.field.data.remote.dto.SyncOrdersRequest
import com.minimart.field.data.remote.dto.SyncOrdersResponse
import com.minimart.field.data.remote.dto.TokenResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface ApiService {

    @POST("api/auth/login")
    suspend fun login(@Body body: LoginRequest): Response<TokenResponse>

    @GET("api/mobile/v1/master-data")
    suspend fun masterData(): Response<MasterDataResponse>

    @POST("api/mobile/v1/orders/sync")
    suspend fun syncOrders(@Body body: SyncOrdersRequest): Response<SyncOrdersResponse>

    @GET("api/mobile/v1/cashier/master-data")
    suspend fun cashierMasterData(): Response<CashierMasterDataResponse>

    @POST("api/mobile/v1/cashier/sales/sync")
    suspend fun syncCashierSales(@Body body: CashierSalesRequest): Response<CashierSalesResponse>
}
