export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export function formatMoney(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function shortId(value) {
  if (!value) return '—';
  const text = String(value);
  return text.length > 8 ? `#${text.slice(-6)}` : `#${text}`;
}
