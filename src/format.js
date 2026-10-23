export function formatQuantity(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(value);
}

export function formatResultValue(value) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}
