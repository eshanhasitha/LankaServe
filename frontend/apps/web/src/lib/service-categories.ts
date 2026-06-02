export const SERVICE_CATEGORIES = [
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Painting',
  'Cleaning',
  'Gardening',
  'AC Repair',
  'Appliance Repair',
  'Masonry',
  'Other',
];

export const SERVICE_CATEGORY_OPTIONS = SERVICE_CATEGORIES.map((category) => ({
  value: category,
  label: category,
}));

export function normalizeServiceCategory(category) {
  const value = String(category || '').trim().toLowerCase();

  if (!value) return '';
  if (value === 'electrician') return 'Electrical';
  if (value === 'ac tech' || value === 'ac technician') return 'AC Repair';
  if (value === 'plumber') return 'Plumbing';
  if (value === 'carpenter') return 'Carpentry';
  if (value === 'cleaner') return 'Cleaning';

  const matched = SERVICE_CATEGORIES.find((item) => item.toLowerCase() === value);
  if (matched) return matched;

  return String(category)
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
