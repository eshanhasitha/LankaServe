import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Polygon, Popup, TileLayer, useMap } from 'react-leaflet';
import Avatar from '../../components/Avatar.tsx';
import { apiRequest } from '../../lib/api.ts';
import { useAuth } from '../../lib/auth-context.tsx';
import { reverseGeocodeLocation } from '../../lib/location.ts';
import { SERVICE_CATEGORY_OPTIONS, normalizeServiceCategory } from '../../lib/service-categories.ts';
import Skeleton from '../../components/Skeleton.tsx';

type LngLat = [number, number];

const DEFAULT_CENTER: LngLat = [79.8612, 6.9271];
const SRI_LANKA_BOUNDS = {
  minLng: 79,
  maxLng: 82.2,
  minLat: 5.5,
  maxLat: 10.2,
};

const defaultFilters: {
  category: string;
  distance: number | null;
  minRating: number;
  availableNow: boolean;
} = {
  category: 'ALL',
  distance: null,
  minRating: 0,
  availableNow: false,
};

const distanceOptions = [5, 10, 25, 50];
const ratingOptions = [
  { label: 'Any', value: 0 },
  { label: '4.0+', value: 4 },
  { label: '4.5+', value: 4.5 },
  { label: '5.0', value: 5 },
];

const heatColorStops = [
  { threshold: 0.1, color: '#38bdf8', opacity: 0.22 },
  { threshold: 0.25, color: '#22c55e', opacity: 0.28 },
  { threshold: 0.45, color: '#facc15', opacity: 0.34 },
  { threshold: 0.65, color: '#f97316', opacity: 0.4 },
  { threshold: 0.82, color: '#ef4444', opacity: 0.46 },
  { threshold: 1, color: '#b91c1c', opacity: 0.52 },
];

function heatStyle(value: number) {
  const normalized = Math.max(0, Math.min(1, value));
  return heatColorStops.find((stop) => normalized <= stop.threshold) || heatColorStops[heatColorStops.length - 1];
}
const providerPin = (online) =>
  L.divIcon({
    className: 'customer-heatmap-provider-pin',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:999px;background:${online ? '#2F4DA0' : '#64748b'};border:3px solid white;box-shadow:0 12px 24px rgba(15,23,42,0.18);">
        <div style="width:8px;height:8px;border-radius:999px;background:white;"></div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

const customerPin = L.divIcon({
  className: 'customer-heatmap-user-pin',
  html: `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:999px;background:#ef4444;border:3px solid white;box-shadow:0 12px 24px rgba(239,68,68,0.24);">
      <span style="width:8px;height:8px;border-radius:999px;background:white;display:block;"></span>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function haversineDistanceKm(origin: LngLat | null, target: LngLat | null) {
  if (!origin || !target) return null;

  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const [originLng, originLat] = origin;
  const [targetLng, targetLat] = target;
  const earthRadiusKm = 6371;

  const latDelta = toRadians(targetLat - originLat);
  const lngDelta = toRadians(targetLng - originLng);
  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(toRadians(originLat)) *
      Math.cos(toRadians(targetLat)) *
      Math.sin(lngDelta / 2) *
      Math.sin(lngDelta / 2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function isFiniteCoordinatePair(coords: unknown): coords is LngLat {
  return (
    Array.isArray(coords) &&
    coords.length === 2 &&
    Number.isFinite(Number(coords[0])) &&
    Number.isFinite(Number(coords[1]))
  );
}

function isWithinSriLankaBounds(coords: unknown) {
  if (!isFiniteCoordinatePair(coords)) return false;
  const [lng, lat] = coords;
  return (
    lng >= SRI_LANKA_BOUNDS.minLng &&
    lng <= SRI_LANKA_BOUNDS.maxLng &&
    lat >= SRI_LANKA_BOUNDS.minLat &&
    lat <= SRI_LANKA_BOUNDS.maxLat
  );
}

function normalizeLngLat(coords: unknown, fallback: LngLat | null = DEFAULT_CENTER): LngLat | null {
  if (!isFiniteCoordinatePair(coords)) return fallback;

  const first: LngLat = [Number(coords[0]), Number(coords[1])];
  const swapped: LngLat = [first[1], first[0]];
  const firstLooksLocal = isWithinSriLankaBounds(first);
  const swappedLooksLocal = isWithinSriLankaBounds(swapped);

  if (firstLooksLocal && !swappedLooksLocal) return first;
  if (!firstLooksLocal && swappedLooksLocal) return swapped;
  if (firstLooksLocal && swappedLooksLocal) return first;

  return first;
}

function FitMapToPoints({ center, points }: { center: LngLat | null; points: LngLat[] }) {
  const map = useMap();

  useEffect(() => {
    if (!Array.isArray(center) || center.length !== 2) return;
    const validPoints = points.filter(isFiniteCoordinatePair);

    if (!validPoints.length) {
      map.flyTo([center[1], center[0]], 11, { duration: 0.8 });
      return;
    }

    if (validPoints.length === 1) {
      map.flyTo([validPoints[0][1], validPoints[0][0]], 11, { duration: 0.8 });
      return;
    }

    const bounds = L.latLngBounds(validPoints.map(([lng, lat]) => [lat, lng]));
    map.fitBounds(bounds.pad(0.2), { maxZoom: 12, animate: true, duration: 0.8 });
  }, [center, map, points]);

  return null;
}

export default function CustomerHeatmapPage() {
  const { accessToken } = useAuth();
  const [providers, setProviders] = useState([]);
  const [draft, setDraft] = useState(defaultFilters);
  const [applied, setApplied] = useState(defaultFilters);
  const [customerCoords, setCustomerCoords] = useState<LngLat>(DEFAULT_CENTER);
  const [customerLocationLabel, setCustomerLocationLabel] = useState('Your saved location');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadCustomerLocation() {
      try {
        const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
        const response = await apiRequest('/users/me', { headers });
        if (!mounted) return;
        const me = response?.data || {};
        const coordinates = normalizeLngLat(me?.location?.coordinates, DEFAULT_CENTER);
        setCustomerCoords(coordinates);
        setCustomerLocationLabel([me?.city || '', me?.district || ''].filter(Boolean).join(', ') || 'Your saved location');
      } catch {
        if (!mounted) return;
        setCustomerCoords(DEFAULT_CENTER);
        setCustomerLocationLabel('Your saved location');
      }
    }

    loadCustomerLocation();
    return () => {
      mounted = false;
    };
  }, [accessToken]);

  useEffect(() => {
    let mounted = true;

    async function loadProviders() {
      try {
        setLoading(true);
        setError('');
        const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
        const categoryQuery =
          applied.category !== 'ALL' ? `?limit=100&category=${encodeURIComponent(applied.category)}` : '?limit=100';
        const response = await apiRequest(`/providers${categoryQuery}`, { headers });
        if (!mounted) return;

        const items = Array.isArray(response?.data) ? response.data : [];
        const mapped = await Promise.all(
          items.map(async (item) => {
            const user = item?.userId || {};
            const coordinates = normalizeLngLat(item?.location?.coordinates, DEFAULT_CENTER);
            const locationInfo = await reverseGeocodeLocation({ ...(item?.location || {}), coordinates });
            const rating = Number(item?.stats?.averageRating || 0);
            const distanceKm = haversineDistanceKm(customerCoords, coordinates);

            return {
              id: String(item?._id || user?._id || coordinates.join(',')),
              userId: String(user?._id || item?.userId || ''),
              name: user?.name || 'Provider',
              role: normalizeServiceCategory(item?.categories?.[0] || 'General') || 'General',
              category: normalizeServiceCategory(item?.categories?.[0] || 'General') || 'General',
              rating,
              distanceKm,
              availableNow: item?.availability === 'online',
              avatar: user?.profileImage || '',
              coordinates,
              locationLabel: locationInfo.shortLabel,
              completedJobs: Number(item?.stats?.completedJobs || 0),
            };
          })
        );

        if (!mounted) return;
        setProviders(mapped);
      } catch (loadError) {
        if (!mounted) return;
        setProviders([]);
        setError(loadError.message || 'Failed to load providers');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProviders();
    return () => {
      mounted = false;
    };
  }, [accessToken, applied.category, customerCoords]);

  const filteredProviders = useMemo(() => {
    return providers.filter((provider) => {
      const selectedCategory = normalizeServiceCategory(applied.category);
      const categoryMatch = applied.category === 'ALL' || provider.category === selectedCategory;
      const distanceMatch =
        applied.distance && provider.distanceKm !== null ? provider.distanceKm <= applied.distance : true;
      const ratingMatch = provider.rating >= applied.minRating;
      const availableMatch = !applied.availableNow || provider.availableNow;
      return categoryMatch && distanceMatch && ratingMatch && availableMatch;
    });
  }, [applied, providers]);

  const visibleProviders = filteredProviders;
  const mapCenter = customerCoords || DEFAULT_CENTER;
  const heatPoints = useMemo(() => {
    return visibleProviders
      .map((provider) => normalizeLngLat(provider?.coordinates, null))
      .filter((coords): coords is LngLat => Boolean(coords && isWithinSriLankaBounds(coords)));
  }, [visibleProviders]);

  const mapPoints = useMemo(() => {
    const customerPoint = normalizeLngLat(customerCoords, DEFAULT_CENTER);
    return [customerPoint, ...heatPoints];
  }, [customerCoords, heatPoints]);

  const heatCells = useMemo(() => {
    if (!visibleProviders.length) return [];

    const points = visibleProviders
      .map((provider) => normalizeLngLat(provider?.coordinates, null))
      .filter((coords): coords is LngLat => Boolean(coords && isWithinSriLankaBounds(coords)));

    if (!points.length) return [];

    const latValues = points.map(([, lat]) => lat);
    const lngValues = points.map(([lng]) => lng);
    const latPadding = 0.18;
    const lngPadding = 0.18;
    const minLat = Math.max(SRI_LANKA_BOUNDS.minLat, Math.min(...latValues) - latPadding);
    const maxLat = Math.min(SRI_LANKA_BOUNDS.maxLat, Math.max(...latValues) + latPadding);
    const minLng = Math.max(SRI_LANKA_BOUNDS.minLng, Math.min(...lngValues) - lngPadding);
    const maxLng = Math.min(SRI_LANKA_BOUNDS.maxLng, Math.max(...lngValues) + lngPadding);
    const rows = 34;
    const cols = 34;
    const latStep = (maxLat - minLat) / rows;
    const lngStep = (maxLng - minLng) / cols;
    const spread = Math.max(latStep, lngStep) * 5.5;
    const cells = [];
    let maxDensity = 0;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const lat = minLat + latStep * (row + 0.5);
        const lng = minLng + lngStep * (col + 0.5);
        const density = points.reduce((sum, [pointLng, pointLat]) => {
          const lngDistance = (lng - pointLng) * Math.cos((lat * Math.PI) / 180);
          const latDistance = lat - pointLat;
          const distanceSq = lngDistance * lngDistance + latDistance * latDistance;
          return sum + Math.exp(-distanceSq / (2 * spread * spread));
        }, 0);

        if (density > maxDensity) maxDensity = density;
        cells.push({
          id: `${row}-${col}`,
          bounds: [
            [minLat + latStep * row, minLng + lngStep * col],
            [minLat + latStep * row, minLng + lngStep * (col + 1)],
            [minLat + latStep * (row + 1), minLng + lngStep * (col + 1)],
            [minLat + latStep * (row + 1), minLng + lngStep * col],
          ],
          density,
        });
      }
    }

    return cells
      .map((cell) => ({ ...cell, normalized: maxDensity ? cell.density / maxDensity : 0 }))
      .filter((cell) => cell.normalized >= 0.08);
  }, [visibleProviders]);
return (
    <div className="mx-auto max-w-[1440px] space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Service Heatmap</h1>
        <p className="text-sm text-slate-500">Explore nearby providers and service coverage in your area.</p>
      </header>

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Filters</h2>
            <p className="text-xs text-slate-400">Filter the providers shown on the heatmap.</p>
          </div>
          <button
            className="self-start rounded-full px-3 py-1.5 text-xs font-bold text-[#2F4DA0] transition-colors hover:bg-blue-50 sm:self-auto"
            type="button"
            onClick={() => {
              setDraft(defaultFilters);
              setApplied(defaultFilters);
            }}
          >
            Clear All
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(180px,1fr)_minmax(240px,1.4fr)_minmax(220px,1fr)_auto_auto] lg:items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</label>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-[#2F4DA0] focus:ring-2 focus:ring-[#2F4DA0]/20"
                value={draft.category}
                onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))}
              >
                <option value="ALL">All Categories</option>
                {SERVICE_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                expand_more
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Distance</label>
              <span className="text-xs font-bold text-[#2F4DA0]">
                {draft.distance ? `Within ${draft.distance} km` : 'All distances'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {distanceOptions.map((value) => (
                <button
                  key={value}
                  className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition-all ${
                    draft.distance === value
                      ? 'border-[#2F4DA0] bg-[#2F4DA0] text-white shadow-sm'
                      : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                  }`}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, distance: prev.distance === value ? null : value }))}
                >
                  {value}km
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Min Rating</label>
            <div className="grid grid-cols-4 gap-2">
              {ratingOptions.map((option) => (
                <button
                  key={option.value}
                  className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition-all ${
                    draft.minRating === option.value
                      ? 'border-yellow-200 bg-yellow-50 text-yellow-600'
                      : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                  }`}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, minRating: option.value }))}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <button
            className={`flex h-[42px] items-center justify-between gap-3 rounded-xl border px-3 text-sm font-semibold transition-all ${
              draft.availableNow
                ? 'border-[#2F4DA0] bg-blue-50 text-[#2F4DA0]'
                : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
            }`}
            type="button"
            onClick={() => setDraft((prev) => ({ ...prev, availableNow: !prev.availableNow }))}
          >
            <span>Available Now</span>
            <span
              className={`relative h-5 w-9 rounded-full transition-colors ${
                draft.availableNow ? 'bg-[#2F4DA0]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-[2px] h-4 w-4 rounded-full bg-white transition-all ${
                  draft.availableNow ? 'left-[18px]' : 'left-[2px]'
                }`}
              />
            </span>
          </button>

          <button
            className="h-[42px] rounded-xl bg-[#2F4DA0] px-6 text-sm font-bold text-white shadow-sm transition-all hover:shadow-lg active:scale-[0.98]"
            onClick={() => setApplied(draft)}
            type="button"
          >
            Apply Filters
          </button>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-[320px] w-full rounded-[20px] sm:h-[420px] xl:h-[560px]" />
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex gap-3 items-center">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!loading ? (
        <>
          <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-lg">
            <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Real Map Preview</p>
                <p className="text-xs text-slate-400">Provider locations are rendered from saved backend coordinates.</p>
              </div>
              <p className="text-xs text-slate-500">{visibleProviders.length} providers visible</p>
            </div>
            <div className="h-[360px] w-full sm:h-[460px] xl:h-[560px]">
              <MapContainer
                center={[mapCenter[1], mapCenter[0]]}
                className="h-full w-full"
                scrollWheelZoom
                zoom={11}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitMapToPoints center={mapCenter} points={mapPoints} />
                                {heatCells.map((cell) => {
                  const style = heatStyle(cell.normalized);
                  return (
                    <Polygon
                      key={`heat-cell-${cell.id}`}
                      positions={cell.bounds}
                      pathOptions={{
                        color: style.color,
                        fillColor: style.color,
                        fillOpacity: style.opacity,
                        opacity: 0,
                        stroke: false,
                        weight: 0,
                      }}
                    />
                  );
                })}
                {customerCoords ? (
                  <Marker icon={customerPin} position={[customerCoords[1], customerCoords[0]]}>
                    <Popup>{customerLocationLabel}</Popup>
                  </Marker>
                ) : null}
                {visibleProviders.map((provider) => (
                  <Marker
                    key={provider.id}
                    icon={providerPin(provider.availableNow)}
                    position={[provider.coordinates[1], provider.coordinates[0]]}
                  >
                    <Popup>
                      <div className="min-w-[200px] space-y-2">
                        <div className="flex items-center gap-3">
                          <Avatar src={provider.avatar} name={provider.name} className="w-10 h-10" />
                          <div>
                            <p className="text-sm font-bold text-slate-900">{provider.name}</p>
                            <p className="text-xs text-slate-500">{provider.role}</p>
                          </div>
                        </div>
                        <div className="text-xs text-slate-600 space-y-1">
                          <p>{provider.locationLabel}</p>
                          <p>Rating: {provider.rating.toFixed(1)}</p>
                          <p>{provider.completedJobs}+ jobs completed</p>
                          {provider.distanceKm !== null ? <p>{provider.distanceKm.toFixed(1)} km away</p> : null}
                        </div>
                        <Link
                          className="block w-full rounded-lg bg-[#2F4DA0] px-3 py-2 text-center text-xs font-bold text-white"
                          to={`/customer/providers/${provider.userId || provider.id}`}
                          state={{ providerName: provider.name }}
                        >
                          View Profile
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </section>

          <section>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold">Recommended Nearby</h2>
              <p className="text-sm text-slate-500">Sorted by the current API result and active filters.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visibleProviders.map((provider) => (
                <div key={`card-${provider.id}`} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar src={provider.avatar} name={provider.name} className="w-12 h-12" />
                    <div>
                      <h4 className="font-bold text-sm">{provider.name}</h4>
                      <p className="text-xs text-slate-500">{provider.role}</p>
                    </div>
                  </div>
                  <div className="mb-4 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Rating</span>
                      <span className="font-bold">{provider.rating.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Location</span>
                      <span className="max-w-[65%] truncate text-right font-medium">{provider.locationLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Distance</span>
                      <span className="font-medium">{provider.distanceKm !== null ? `${provider.distanceKm.toFixed(1)} km` : 'Unknown'}</span>
                    </div>
                  </div>
                  <Link
                    className="block w-full bg-[#2F4DA0] text-white text-xs font-bold py-2.5 rounded-xl hover:opacity-90 transition-opacity text-center"
                    to={`/customer/providers/${provider.userId || provider.id}`}
                    state={{ providerName: provider.name }}
                  >
                    View Profile
                  </Link>
                </div>
              ))}

              {visibleProviders.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-slate-100 bg-white p-8 text-center text-slate-500 sm:p-10">
                  No providers match the selected filters.
                </div>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}




