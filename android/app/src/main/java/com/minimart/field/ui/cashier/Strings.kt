package com.minimart.field.ui.cashier

/** Cashier tablets serve both Indonesian and Chinese-speaking staff (see
 * the product catalog's name_zh field) - this lets whoever's on shift
 * flip the UI chrome to a language they're comfortable with via the
 * button in the top bar. Not persisted across restarts on purpose: it's
 * a one-tap toggle, not a per-user setting, since anyone can be cashier
 * on a given shift. */
enum class Lang(val code: String) {
    EN("EN"), ZH("中文"), ID("ID");

    fun next(): Lang = entries[(ordinal + 1) % entries.size]
}

data class CashierStrings(
    val title: String,
    val enterWorkerId: String,
    val employeeId: String,
    val lookUpWorker: String,
    val change: String,
    val noProductsCached: String,
    val add: String,
    val total: String,
    val confirmSale: String,
    val saleComplete: String,
    val saleFailed: String,
    val ok: String,
    val staleBanner: String,
    val outOfStock: String,
    val left: String,
    val idLabel: String,
)

fun strings(lang: Lang): CashierStrings = when (lang) {
    Lang.EN -> CashierStrings(
        title = "Cashier — New Sale",
        enterWorkerId = "Enter worker ID",
        employeeId = "Employee ID",
        lookUpWorker = "Look Up Worker",
        change = "Change",
        noProductsCached = "No products cached yet. Connect to the internet once to download the catalog.",
        add = "Add",
        total = "Total",
        confirmSale = "Confirm Sale",
        saleComplete = "Sale complete",
        saleFailed = "Sale failed",
        ok = "OK",
        staleBanner = "⚠ Using built-in starter data — this tablet has never synced with the server. " +
            "Balances shown may be out of date. Connect to the internet to get live data.",
        outOfStock = "Out of stock",
        left = "left",
        idLabel = "ID",
    )
    Lang.ZH -> CashierStrings(
        title = "收银 — 新订单",
        enterWorkerId = "输入员工编号",
        employeeId = "员工编号",
        lookUpWorker = "查找员工",
        change = "更换",
        noProductsCached = "尚未缓存商品，请连接网络下载商品目录。",
        add = "添加",
        total = "总计",
        confirmSale = "确认销售",
        saleComplete = "销售完成",
        saleFailed = "销售失败",
        ok = "确定",
        staleBanner = "⚠ 正在使用内置初始数据 — 此平板尚未与服务器同步，显示的余额可能不是最新的。请连接网络获取实时数据。",
        outOfStock = "缺货",
        left = "剩余",
        idLabel = "编号",
    )
    Lang.ID -> CashierStrings(
        title = "Kasir — Penjualan Baru",
        enterWorkerId = "Masukkan ID pekerja",
        employeeId = "ID Karyawan",
        lookUpWorker = "Cari Pekerja",
        change = "Ganti",
        noProductsCached = "Belum ada produk tersimpan. Sambungkan ke internet untuk mengunduh katalog.",
        add = "Tambah",
        total = "Total",
        confirmSale = "Konfirmasi Penjualan",
        saleComplete = "Penjualan berhasil",
        saleFailed = "Penjualan gagal",
        ok = "OK",
        staleBanner = "⚠ Menggunakan data awal bawaan — tablet ini belum pernah tersinkron dengan server. " +
            "Saldo yang ditampilkan mungkin tidak terbaru. Sambungkan ke internet untuk data langsung.",
        outOfStock = "Stok habis",
        left = "tersisa",
        idLabel = "ID",
    )
}
