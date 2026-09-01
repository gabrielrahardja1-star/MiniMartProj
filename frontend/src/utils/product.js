export function getProductName(product, language) {
  if (!product) return ''
  if (language?.startsWith('zh') && product.name_zh) return product.name_zh
  return product.name
}

// A product with this many units on hand or fewer is treated as "low stock"
// everywhere in the app. Mirror of LOW_STOCK_THRESHOLD in app/routers/admin.py.
export const LOW_STOCK_THRESHOLD = 30

export function isLowStock(stock) {
  return stock > 0 && stock <= LOW_STOCK_THRESHOLD
}
