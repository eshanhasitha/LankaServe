import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { apiRequest } from '../../lib/api.ts';
import { useAuth } from '../../lib/auth-context.tsx';
import { reverseGeocodeLocation } from '../../lib/location.ts';
import { SERVICE_CATEGORY_OPTIONS, normalizeServiceCategory } from '../../lib/service-categories.ts';
import Skeleton from '../../components/Skeleton.tsx';

const DEFAULT_LOCATION = {
  label: 'Colombo, Sri Lanka',
  district: 'Colombo',
  coordinates: [79.8612, 6.9271],
};

const FALLBACK_CITIES = [
  { label: 'Colombo, Sri Lanka', district: 'Colombo', coordinates: [79.8612, 6.9271] },
  { label: 'Kandy, Sri Lanka', district: 'Kandy', coordinates: [80.6337, 7.2906] },
  { label: 'Galle, Sri Lanka', district: 'Galle', coordinates: [80.217, 6.0535] },
  { label: 'Jaffna, Sri Lanka', district: 'Jaffna', coordinates: [80.0255, 9.6615] },
  { label: 'Kurunegala, Sri Lanka', district: 'Kurunegala', coordinates: [80.3647, 7.4863] },
  { label: 'Batticaloa, Sri Lanka', district: 'Batticaloa', coordinates: [81.6936, 7.7102] },
];

const locationPin = L.divIcon({
  className: 'customer-job-location-pin',
  html: `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:999px;background:#ef4444;box-shadow:0 10px 18px rgba(239,68,68,0.28);border:3px solid white;">
      <span style="width:8px;height:8px;border-radius:999px;background:white;display:block;"></span>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function mapSearchResult(item) {
  const lon = Number(item.lon);
  const lat = Number(item.lat);
  const district =
    item.address?.city ||
    item.address?.town ||
    item.address?.state_district ||
    item.address?.county ||
    'Sri Lanka';

  return {
    label: item.display_name,
    district,
    coordinates: [lon, lat],
  };
}

function RecenterMap({ coordinates }) {
  const map = useMap();

  useEffect(() => {
    if (Array.isArray(coordinates) && coordinates.length === 2) {
      map.flyTo([coordinates[1], coordinates[0]], Math.max(map.getZoom(), 11), {
        duration: 0.8,
      });
    }
  }, [coordinates, map]);

  return null;
}

function ClickToPick({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng);
    },
  });

  return null;
}

function LocationMap({ coordinates, onSelect }) {
  const center: [number, number] = Array.isArray(coordinates) && coordinates.length === 2
    ? [Number(coordinates[1]), Number(coordinates[0])]
    : [DEFAULT_LOCATION.coordinates[1], DEFAULT_LOCATION.coordinates[0]];

  return (
    <MapContainer
      center={center}
      className="h-[320px] w-full"
      scrollWheelZoom
      zoom={10}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker icon={locationPin} position={center} />
      <RecenterMap coordinates={coordinates} />
      <ClickToPick onSelect={onSelect} />
    </MapContainer>
  );
}

export default function CustomerPostServicePage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const editJobId = routeLocation.state?.editJobId || '';
  const preferredProviderId = routeLocation.state?.preferredProviderId || '';
  const preferredProviderName = routeLocation.state?.preferredProviderName || '';
  const preferredCategory = routeLocation.state?.preferredCategory || '';
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [address, setAddress] = useState(DEFAULT_LOCATION.label);
  const [selectedLocation, setSelectedLocation] = useState(DEFAULT_LOCATION);
  const [suggestions, setSuggestions] = useState(FALLBACK_CITIES);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fallbackSuggestions = useMemo(() => {
    const query = address.trim().toLowerCase();
    if (!query) return FALLBACK_CITIES;
    return FALLBACK_CITIES.filter((city) => city.label.toLowerCase().includes(query) || city.district.toLowerCase().includes(query));
  }, [address]);

  useEffect(() => {
    if (editJobId) return;
    if (preferredCategory && !category) {
      setCategory(normalizeServiceCategory(preferredCategory));
    }
  }, [category, editJobId, preferredCategory]);

  useEffect(() => {
    const query = address.trim();

    if (query.length < 2) {
      setSuggestions(fallbackSuggestions);
      setSuggestionsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setSuggestionsLoading(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=lk&addressdetails=1&limit=6&q=${encodeURIComponent(query)}`,
          {
            signal: controller.signal,
            headers: {
              Accept: 'application/json',
            },
          }
        );

        if (!response.ok) throw new Error('Search failed');
        const payload = await response.json();
        const mapped = Array.isArray(payload) ? payload.map(mapSearchResult) : [];
        setSuggestions(mapped.length ? mapped : fallbackSuggestions);
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setSuggestions(fallbackSuggestions);
        }
      } finally {
        setSuggestionsLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [address, fallbackSuggestions]);

  useEffect(() => {
    let mounted = true;

    async function loadJobForEdit() {
      if (!editJobId) return;

      try {
        setLoading(true);
        setError('');
        const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
        const response = await apiRequest(`/jobs/${editJobId}`, { headers });
        if (!mounted) return;

        const nextJob = response?.data;
        if (!nextJob) return;

        setTitle(nextJob.title || '');
        setCategory(normalizeServiceCategory(nextJob.category || ''));
        setDescription(nextJob.description || '');
        setBudget(String(nextJob.price ?? ''));

        const coords = Array.isArray(nextJob.location?.coordinates) && nextJob.location.coordinates.length === 2
          ? nextJob.location.coordinates
          : DEFAULT_LOCATION.coordinates;

        try {
          const resolved = await reverseGeocodeLocation(coords);
          if (!mounted) return;
          setSelectedLocation(resolved);
          setAddress(resolved.label);
        } catch {
          if (!mounted) return;
          const fallbackLocation = {
            label: `Selected location (${coords[1].toFixed(5)}, ${coords[0].toFixed(5)})`,
            district: 'Sri Lanka',
            coordinates: coords,
          };
          setSelectedLocation(fallbackLocation);
          setAddress(fallbackLocation.label);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError.message || 'Failed to load job for editing');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadJobForEdit();
    return () => {
      mounted = false;
    };
  }, [accessToken, editJobId]);

  function applyLocation(location) {
    setSelectedLocation(location);
    setAddress(location.label);
    setShowSuggestions(false);
  }

  async function handleMapSelect(latlng) {
    const resolved = await reverseGeocodeLocation([latlng.lng, latlng.lat]);
    setSelectedLocation(resolved);
    setAddress(resolved.label);
    setShowSuggestions(false);
  }

  function onClear() {
    setTitle('');
    setCategory('');
    setDescription('');
    setBudget('');
    setAddress(DEFAULT_LOCATION.label);
    setSelectedLocation(DEFAULT_LOCATION);
    setSuggestions(FALLBACK_CITIES);
    setShowSuggestions(false);
    setError('');
    setSuccess('');
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);

    try {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      await apiRequest(editJobId ? `/jobs/${editJobId}` : '/jobs', {
        method: editJobId ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          location: { type: 'Point', coordinates: selectedLocation.coordinates },
          images: [],
          price: Number(budget) || 0,
          preferredProviderId: preferredProviderId || null,
        }),
      });

      setSuccess(editJobId ? 'Service request updated successfully.' : 'Service request submitted successfully.');
      window.setTimeout(() => navigate('/customer/my-jobs'), 800);
    } catch (submitError) {
      setError(submitError.message || 'Failed to submit request');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-8 pb-16">
      <div className="max-w-[900px] mx-auto">
        <header className="mb-8 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-slate-900">{editJobId ? 'Edit Service Request' : 'Post a Service'}</h1>
          <p className="text-slate-500 mt-1">
            {editJobId
              ? 'Update your job details and resubmit the request.'
              : preferredProviderName
              ? `You are creating a direct hiring request for ${preferredProviderName}.`
              : 'Describe your service requirement and connect with verified providers.'}
          </p>
        </header>

        <div className="bg-white rounded-[18px] shadow-sm border border-slate-100 overflow-hidden">
          <form className="p-8 space-y-6" onSubmit={onSubmit}>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            ) : null}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="job-title">Job Title <span className="text-red-500">*</span></label>
              <input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2F4DA0] focus:border-transparent outline-none transition-all" id="job-title" onChange={(event) => setTitle(event.target.value)} placeholder="e.g., Fix leaking kitchen sink" required type="text" value={title} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="category">Service Category <span className="text-red-500">*</span></label>
              <div className="relative">
                <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2F4DA0] focus:border-transparent outline-none transition-all appearance-none pr-10" id="category" onChange={(event) => setCategory(event.target.value)} required value={category}>
                  <option value="" disabled>Select a category</option>
                  {SERVICE_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                  <span className="material-symbols-outlined text-xl">expand_more</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="description">Description <span className="text-red-500">*</span></label>
              <textarea className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2F4DA0] focus:border-transparent outline-none transition-all min-h-[140px] resize-none" id="description" onChange={(event) => setDescription(event.target.value)} placeholder="Describe the problem or requirement in detail..." required value={description} />
            </div>

            <div className="w-full md:w-1/2">
              <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="budget">Estimated Budget (LKR)</label>
              <div className="relative justify-between">
                <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 text-sm font-medium">LKR</span>
                <input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2F4DA0] focus:border-transparent outline-none transition-all pl-14" id="budget" onChange={(event) => setBudget(event.target.value)} placeholder="0.00" type="number" value={budget} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="address">Service Location <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                    <span className="material-symbols-outlined text-lg">location_on</span>
                  </span>
                  <input
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2F4DA0] focus:border-transparent outline-none transition-all pl-11"
                    id="address"
                    onBlur={() => window.setTimeout(() => setShowSuggestions(false), 120)}
                    onChange={(event) => {
                      setAddress(event.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Type a Sri Lankan city, town, or district"
                    required
                    type="text"
                    value={address}
                  />
                </div>

                {showSuggestions && (suggestions.length > 0 || suggestionsLoading) ? (
                  <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                    {suggestionsLoading ? (
                      <div className="px-4 py-3 text-sm text-slate-500">Searching Sri Lanka locations...</div>
                    ) : null}
                    {suggestions.map((location) => (
                      <button
                        key={`${location.label}-${location.coordinates.join(',')}`}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                        onMouseDown={() => applyLocation(location)}
                        type="button"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 line-clamp-1">{location.label}</p>
                            <p className="text-xs text-slate-400">District: {location.district}</p>
                          </div>
                          <span className="material-symbols-outlined text-slate-300">north_east</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Real Map Preview</p>
                    <p className="text-xs text-slate-400">Search a Sri Lanka location or click on the map to drop the service pin.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-500">{selectedLocation.district}</p>
                    <p className="text-[11px] text-slate-400">
                      {selectedLocation.coordinates[1].toFixed(4)}, {selectedLocation.coordinates[0].toFixed(4)}
                    </p>
                  </div>
                </div>

                <LocationMap coordinates={selectedLocation.coordinates} onSelect={handleMapSelect} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Upload Images (Optional)</label>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100/50 transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-slate-400 text-4xl mb-2">image</span>
                <p className="text-sm text-slate-500 font-medium">Click or drag images to upload</p>
                <p className="text-xs text-slate-400 mt-1">Up to 5 images, max 5MB each</p>
              </div>
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

            <div className="flex flex-col items-end gap-3 pt-4">
              <div className="flex items-center gap-3">
                <button className="px-6 h-12 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all text-sm" onClick={onClear} type="button">Clear</button>
                <button className="px-8 h-12 rounded-[12px] bg-[#2F4DA0] text-white font-semibold hover:bg-blue-800 transition-all shadow-md shadow-blue-200 text-sm disabled:opacity-70" disabled={busy} type="submit">
                  {busy ? (editJobId ? 'Saving...' : 'Submitting...') : (editJobId ? 'Submit Request' : 'Submit Request')}
                </button>
              </div>
              <p className="text-xs text-slate-400 italic">Your request will be visible to nearby verified providers.</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

