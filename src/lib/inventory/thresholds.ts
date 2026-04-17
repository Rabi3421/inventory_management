export interface LowStockThresholdProduct {
  availableQty?: number | null;
  lowStockAlertQty?: number | null;
}

export function getEffectiveLowStockThreshold(product: LowStockThresholdProduct, globalThreshold = 20) {
  const override = product.lowStockAlertQty;
  if (typeof override === 'number' && Number.isFinite(override) && override >= 0) {
    return override;
  }

  return globalThreshold;
}

export function isOutOfStock(product: LowStockThresholdProduct) {
  return (product.availableQty ?? 0) <= 0;
}

export function isLowStock(product: LowStockThresholdProduct, globalThreshold = 20) {
  const quantity = product.availableQty ?? 0;
  if (quantity <= 0) return false;
  return quantity <= getEffectiveLowStockThreshold(product, globalThreshold);
}

export function getInventoryStockStatus(product: LowStockThresholdProduct, globalThreshold = 20) {
  if (isOutOfStock(product)) return 'out-of-stock' as const;
  if (isLowStock(product, globalThreshold)) return 'low-stock' as const;
  return 'in-stock' as const;
}