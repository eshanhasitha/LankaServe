import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import Avatar from '../../components/Avatar.tsx';
import { apiRequest } from '../../lib/api.ts';
import { useAuth } from '../../lib/auth-context.tsx';
import { reverseGeocodeLocation } from '../../lib/location.ts';
import { SERVICE_CATEGORY_OPTIONS, normalizeServiceCategory } from '../../lib/service-categories.ts';
import Skeleton from '../../components/Skeleton.tsx';

const DEFAULT_CENTER = [79.8612, 6.9271];
const SRI_LANKA_BOUNDS = {
  minLng: 79,
  maxLng: 82.2,
  minLat: 5.5,
  maxLat: 10.2,
};

const defaultFilters = {
  category: 'ALL',
  distance: 15,
  minRating: 4,
  availableNow: false,
};

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

function haversineDistanceKm(origin, target) {
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

function isFiniteCoordinatePair(coords) {
  return (
    Array.isArray(coords) &&
    coords.length === 2 &&
    Number.isFinite(Number(coords[0])) &&
    Number.isFinite(Number(coords[1]))
  );
}

function isWithinSriLankaBounds([lng, lat]) {
  return (
    lng >= SRI_LANKA_BOUNDS.minLng &&
    lng <= SRI_LANKA_BOUNDS.maxLng &&
    lat >= SRI_LANKA_BOUNDS.minLat &&
    lat <= SRI_LANKA_BOUNDS.maxLat
  );
}

function normalizeLngLat(coords, fallback = DEFAULT_CENTER) {
  if (!isFiniteCoordinatePair(coords)) return fallback;

  const first = [Number(coords[0]), Number(coords[1])];
  const swapped = [first[1], first[0]];
  const firstLooksLocal = isWithinSriLankaBounds(first);
  const swappedLooksLocal = isWithinSriLankaBounds(swapped);

  if (firstLooksLocal && !swappedLooksLocal) return first;
  if (!firstLooksLocal && swappedLooksLocal) return swapped;
  if (firstLooksLocal && swappedLooksLocal) return first;

  return first;
}

function FitMapToPoints({ center, points }) {
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
  const [customerCoords, setCustomerCoords] = useState(DEFAULT_CENTER);
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
      const categoryMatch = applied.category === 'ALL' || provider.category === applied.category;
      const distanceMatch = provider.distanceKm !== null ? provider.distanceKm <= applied.distance : true;
      const ratingMatch = provider.rating >= applied.minRating;
      const availableMatch = !applied.availableNow || provider.availableNow;
      return categoryMatch && distanceMatch && ratingMatch && availableMatch;
    });
  }, [applied, providers]);

  const visibleProviders = filteredProviders.length ? filteredProviders : providers;
  const mapCenter = customerCoords || DEFAULT_CENTER;
  const mapPoints = useMemo(() => {
    const providerPoints = visibleProviders
      .map((provider) => normalizeLngLat(provider?.coordinates, null))
      .filter((coords) => coords && isWithinSriLankaBounds(coords));
    const customerPoint = normalizeLngLat(customerCoords, DEFAULT_CENTER);
    return [customerPoint, ...providerPoints];
  }, [customerCoords, visibleProviders]);
  const heatZones = useMemo(() => {
    if (!visibleProviders.length) return [];

    const gridSize = 0.02;
    const buckets = new Map();

    visibleProviders.forEach((provider) => {
      const coords = provider?.coordinates;
      if (!Array.isArray(coords) || coords.length !== 2) return;
      const [lng, lat] = coords;
      const latKey = Math.round(lat / gridSize);
      const lngKey = Math.round(lng / gridSize);
      const key = `${latKey}:${lngKey}`;
      const bucket = buckets.get(key) || {
        latSum: 0,
        lngSum: 0,
        count: 0,
        weight: 0,
      };

      bucket.latSum += lat;
      bucket.lngSum += lng;
      bucket.count += 1;
      bucket.weight += Math.max(0.5, Number(provider.rating || 0) / 5);
      buckets.set(key, bucket);
    });

    const zones = Array.from(buckets.values()).map((bucket) => ({
      center: [bucket.latSum / bucket.count, bucket.lngSum / bucket.count],
      count: bucket.count,
      weight: bucket.weight,
    }));

    const maxWeight = Math.max(1, ...zones.map((zone) => zone.weight));

    return zones.map((zone) => {
      const normalized = zone.weight / maxWeight;
      return {
        ...zone,
        normalized,
        radius: 450 + normalized * 1400,
      };
    });
  }, [visibleProviders]);

  return (
    <div className="p-8 max-w-[1440px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Service Heatmap</h1>
        <p className="text-slate-500 text-sm">Explore nearby providers and service coverage in your area.</p>
      </header>

      <section className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap items-center gap-6">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Category</label>
          <select
            className="border-slate-200 rounded-lg text-sm focus:ring-[#2F4DA0] focus:border-[#2F4DA0] min-w-[180px]"
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
        </div>

        <div className="flex flex-col gap-1 flex-1 max-w-[200px]">
          <div className="flex justify-between">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Distance</label>
            <span className="text-[10px] font-bold text-[#2F4DA0]">{draft.distance}km</span>
          </div>
          <input
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#2F4DA0]"
            max="50"
            min="1"
            type="range"
            value={draft.distance}
            onChange={(event) => setDraft((prev) => ({ ...prev, distance: Number(event.target.value) }))}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Min Rating</label>
          <select
            className="border-slate-200 rounded-lg text-sm focus:ring-[#2F4DA0] focus:border-[#2F4DA0]"
            value={draft.minRating}
            onChange={(event) => setDraft((prev) => ({ ...prev, minRating: Number(event.target.value) }))}
          >
            <option value={4}>4+</option>
            <option value={4.5}>4.5+</option>
            <option value={3}>3+</option>
          </select>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <span className="text-sm font-medium text-slate-600">Available Now</span>
          <button
            className={`w-11 h-6 rounded-full relative transition-all ${draft.availableNow ? 'bg-[#2F4DA0]' : 'bg-slate-200'}`}
            type="button"
            onClick={() => setDraft((prev) => ({ ...prev, availableNow: !prev.availableNow }))}
          >
            <span className={`absolute top-[2px] h-5 w-5 rounded-full bg-white transition-all ${draft.availableNow ? 'left-[22px]' : 'left-[2px]'}`} />
          </button>
        </div>

        <button
          className="ml-auto bg-[#2F4DA0] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-800 transition-colors shadow-sm"
          onClick={() => setApplied(draft)}
          type="button"
        >
          Apply Filters
        </button>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-[560px] w-full rounded-[20px]" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
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

      <section className="rounded-[20px] border border-slate-200 overflow-hidden bg-white shadow-lg">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Real Map Preview</p>
            <p className="text-xs text-slate-400">Provider locations are rendered from saved backend coordinates.</p>
          </div>
          <p className="text-xs text-slate-500">{visibleProviders.length} providers visible</p>
        </div>
        <div className="h-[560px] w-full">
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
            {heatZones.map((zone, index) => (
              <Circle
                key={`heat-zone-${index}`}
                center={zone.center}
                radius={zone.radius}
                pathOptions={{
                  color: '#ef4444',
                  weight: 1,
                  fillColor: '#ef4444',
                  fillOpacity: 0.12 + zone.normalized * 0.28,
                }}
              />
            ))}
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Recommended Nearby</h2>
          <p className="text-sm text-slate-500">Sorted by the current API result and active filters.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {visibleProviders.map((provider) => (
            <div key={`card-${provider.id}`} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
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
                  <span className="font-medium">{provider.locationLabel}</span>
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

          {!loading && visibleProviders.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-500">
              No providers match the selected filters.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

