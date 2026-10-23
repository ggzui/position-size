export function parsePastedPrice(text) {
  if (typeof text !== 'string') return null;
  const price = text.trim().replaceAll('，', ',');
  if (!/^(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(price)) return null;
  const value = Number(price.replaceAll(',', ''));
  return Number.isFinite(value) && value > 0 ? String(value) : null;
}
