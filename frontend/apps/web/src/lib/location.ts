const locationCache = new Map();
const sriLankaSearchFallback = [
  { label: 'Colombo, Sri Lanka', city: 'Colombo', district: 'Colombo', coordinates: [79.8612, 6.9271] },
  { label: 'Dehiwala, Sri Lanka', city: 'Dehiwala', district: 'Colombo', coordinates: [79.8653, 6.8513] },
  { label: 'Mount Lavinia, Sri Lanka', city: 'Mount Lavinia', district: 'Colombo', coordinates: [79.8636, 6.8389] },
  { label: 'Maharagama, Sri Lanka', city: 'Maharagama', district: 'Colombo', coordinates: [79.9265, 6.8474] },
  { label: 'Nugegoda, Sri Lanka', city: 'Nugegoda', district: 'Colombo', coordinates: [79.8996, 6.8656] },
  { label: 'Kandy, Sri Lanka', city: 'Kandy', district: 'Kandy', coordinates: [80.6337, 7.2906] },
  { label: 'Galle, Sri Lanka', city: 'Galle', district: 'Galle', coordinates: [80.217, 6.0535] },
  { label: 'Jaffna, Sri Lanka', city: 'Jaffna', district: 'Jaffna', coordinates: [80.0255, 9.6615] },
  { label: 'Kurunegala, Sri Lanka', city: 'Kurunegala', district: 'Kurunegala', coordinates: [80.3647, 7.4863] },
];

function getCoordinates(locationOrCoords) {
  if (Array.isArray(locationOrCoords)) {
    return locationOrCoords.length === 2 ? locationOrCoords : null;
  }

  const coords = locationOrCoords?.coordinates;
  return Array.isArray(coords) && coords.length === 2 ? coords : null;
}

function getCacheKey(locationOrCoords) {
  const coords = getCoordinates(locationOrCoords);
  if (!coords) return '';
  const [lng, lat] = coords;
  return `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
}

export function formatCoordinateText(locationOrCoords) {
  const coords = getCoordinates(locationOrCoords);
  if (!coords) return 'Location not available';
  const [lng, lat] = coords;
  return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
}

export function getFallbackLocation(locationOrCoords) {
  const coords = getCoordinates(locationOrCoords);
  if (!coords) {
    return {
      label: 'Location not available',
      shortLabel: 'Location not available',
      district: 'Sri Lanka',
      coordinates: null,
    };
  }

  return {
    label: formatCoordinateText(coords),
    shortLabel: formatCoordinateText(coords),
    district: 'Sri Lanka',
    coordinates: coords,
  };
}

export async function reverseGeocodeLocation(locationOrCoords) {
  const coords = getCoordinates(locationOrCoords);
  if (!coords) return getFallbackLocation(locationOrCoords);

  const cacheKey = getCacheKey(coords);
  if (locationCache.has(cacheKey)) return locationCache.get(cacheKey);

  const [lng, lat] = coords;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) throw new Error('Reverse geocode failed');

    const payload = await response.json();
    const district =
      payload.address?.city ||
      payload.address?.town ||
      payload.address?.state_district ||
      payload.address?.county ||
      'Sri Lanka';

    const shortLabel =
      [
        payload.address?.suburb || payload.address?.village || payload.address?.town || payload.address?.city,
        district,
      ]
        .filter(Boolean)
        .join(', ') || formatCoordinateText(coords);

    const resolved = {
      label: payload.display_name || shortLabel,
      shortLabel,
      district,
      coordinates: coords,
    };

    locationCache.set(cacheKey, resolved);
    return resolved;
  } catch {
    const fallback = getFallbackLocation(coords);
    locationCache.set(cacheKey, fallback);
    return fallback;
  }
}

function mapSearchResult(item) {
  const city =
    item.address?.city ||
    item.address?.town ||
    item.address?.village ||
    item.address?.suburb ||
    item.address?.municipality ||
    item.address?.state_district ||
    'Sri Lanka';
  const district =
    item.address?.state_district ||
    item.address?.county ||
    item.address?.city ||
    item.address?.town ||
    'Sri Lanka';

  return {
    label: item.display_name,
    city,
    district,
    coordinates: [Number(item.lon), Number(item.lat)],
  };
}

export function filterSriLankaFallbackLocations(query) {
  const text = String(query || '').trim().toLowerCase();
  if (!text) return sriLankaSearchFallback;
  return sriLankaSearchFallback.filter((item) =>
    item.label.toLowerCase().includes(text) ||
    item.city.toLowerCase().includes(text) ||
    item.district.toLowerCase().includes(text)
  );
}

export async function searchSriLankaLocations(query) {
  const text = String(query || '').trim();
  if (text.length < 2) return filterSriLankaFallbackLocations(text);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=lk&addressdetails=1&limit=8&q=${encodeURIComponent(text)}`,
      {
        headers: { Accept: 'application/json' },
      }
    );

    if (!response.ok) throw new Error('Location search failed');

    const payload = await response.json();
    const mapped = Array.isArray(payload) ? payload.map(mapSearchResult) : [];
    return mapped.length ? mapped : filterSriLankaFallbackLocations(text);
  } catch {
    return filterSriLankaFallbackLocations(text);
  }
}

export const DEFAULT_SRI_LANKA_LOCATION = sriLankaSearchFallback[0];
