export function getProductName(product, language) {
  if (!product) return ''
  if (language?.startsWith('zh') && product.name_zh) return product.name_zh
  return product.name
}
