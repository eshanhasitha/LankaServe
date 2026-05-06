import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api.ts';
import { reverseGeocodeLocation } from '../../lib/location.ts';
import { SERVICE_CATEGORY_OPTIONS, normalizeServiceCategory } from '../../lib/service-categories.ts';
import { useAuth } from '../../lib/auth-context.tsx';
import Skeleton from '../../components/Skeleton.tsx';
import Avatar from '../../components/Avatar.tsx';

const defaultFilters = {
  query: '',
  category: 'ALL',
  distance: 50,
  minRating: 0,
  experience: 'ANY',
  availableNow: false,
  topRated: false,
  reliableBadge: false,
};

function normalizeCategory(value) {
  const normalized = normalizeServiceCategory(value);
  return normalized ? normalized.toUpperCase() : 'GENERAL';
}

function formatCategoryLabel(value) {
  return normalizeServiceCategory(value) || 'General';
}

function formatExperience(years) {
  const value = Number(years || 0);
  if (value <= 0) return 'Experience not specified';
  return `${value}+ Years Experience`;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

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

export default function CustomerFindProvidersPage() {
  const { accessToken } = useAuth();
  const [draft, setDraft] = useState(defaultFilters);
  const [applied, setApplied] = useState(defaultFilters);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customerCoords, setCustomerCoords] = useState(null);
  const [customerLocationLabel, setCustomerLocationLabel] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadCustomerLocation() {
      try {
        const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
        const response = await apiRequest('/users/me', { headers });
        if (!mounted) return;
        const me = response?.data || {};
        const coordinates =
          Array.isArray(me?.location?.coordinates) && me.location.coordinates.length === 2
            ? me.location.coordinates
            : null;
        setCustomerCoords(coordinates);
        setCustomerLocationLabel([me?.city || '', me?.district || ''].filter(Boolean).join(', '));
      } catch {
        if (!mounted) return;
        setCustomerCoords(null);
        setCustomerLocationLabel('');
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

        const categoryQuery =
          applied.category !== 'ALL' ? `?limit=100&category=${encodeURIComponent(applied.category)}` : '?limit=100';

        const response = await apiRequest(`/providers${categoryQuery}`);
        const items = Array.isArray(response?.data) ? response.data : [];

        const mapped = await Promise.all(
          items.map(async (item) => {
            const coordinates =
              Array.isArray(item?.location?.coordinates) && item.location.coordinates.length === 2
                ? item.location.coordinates
                : null;
            const locationInfo = await reverseGeocodeLocation(item?.location);
            const distanceKm = coordinates && customerCoords ? haversineDistanceKm(customerCoords, coordinates) : null;
            const rating = Number(item?.stats?.averageRating || 0);
            const completedJobs = Number(item?.stats?.completedJobs || 0);
            const years = Number(item?.yearsExperience || 0);
            const responseMinutes = Number(item?.stats?.avgResponseTimeMinutes || 0);
            const name = item?.userId?.name || 'Provider';

            return {
              id: String(item?.userId?._id || item?.userId || item?._id),
              slug: slugify(name),
              name,
              category: normalizeCategory(item?.categories?.[0] || 'General'),
              categoryLabel: formatCategoryLabel(item?.categories?.[0] || 'General'),
              rating,
              jobsLabel: completedJobs ? `${completedJobs}+ Jobs Completed` : 'New provider',
              locationLabel: locationInfo.shortLabel,
              experienceLabel: formatExperience(years),
              years,
              image: item?.userId?.profileImage,
              online: item?.availability === 'online',
              stars: Math.max(1, Math.min(5, Math.round(rating || 1))),
              topRated: rating >= 4.5,
              reliableBadge: Boolean(item?.verified),
              distanceKm,
              distanceLabel: distanceKm !== null ? `${Math.round(distanceKm)} km away` : '',
              responseLabel:
                responseMinutes > 0 && Number.isFinite(responseMinutes)
                  ? responseMinutes < 60
                    ? `${responseMinutes} mins avg response`
                    : `${Math.round(responseMinutes / 60)} hrs avg response`
                  : 'Response time not available',
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
  }, [applied.category, customerCoords]);

  const filteredProviders = useMemo(() => {
    return providers.filter((provider) => {
      const query = applied.query.trim().toLowerCase();
      const categoryMatch =
        applied.category === 'ALL' || normalizeCategory(provider.category) === normalizeCategory(applied.category);
      const queryMatch =
        !query ||
        provider.name.toLowerCase().includes(query) ||
        provider.categoryLabel.toLowerCase().includes(query) ||
        provider.locationLabel.toLowerCase().includes(query);
      const distanceMatch =
        customerCoords && provider.distanceKm !== null ? provider.distanceKm <= applied.distance : true;
      const ratingMatch = provider.rating >= applied.minRating;
      const experienceMatch =
        applied.experience === 'ANY' ||
        (applied.experience === '1-3' && provider.years >= 1 && provider.years <= 3) ||
        (applied.experience === '3-5' && provider.years >= 3 && provider.years <= 5) ||
        (applied.experience === '5+' && provider.years >= 5);
      const onlineMatch = !applied.availableNow || provider.online;
      const topRatedMatch = !applied.topRated || provider.topRated;
      const reliableBadgeMatch = !applied.reliableBadge || provider.reliableBadge;

      return (
        categoryMatch &&
        queryMatch &&
        distanceMatch &&
        ratingMatch &&
        experienceMatch &&
        onlineMatch &&
        topRatedMatch &&
        reliableBadgeMatch
      );
    });
  }, [applied, customerCoords, providers]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3 bg-white shadow-sm rounded-full px-5 focus-within:ring-2 focus-within:ring-[#2F4DA0] transition-all">
        <span className="material-symbols-outlined text-2xl text-slate-400 shrink-0">search</span>
        <input
          className="flex-1 py-4 bg-transparent text-base placeholder:text-slate-400 outline-none border-0"
          placeholder="Search providers by name or skill..."
          type="text"
          value={draft.query}
          onChange={(event) => setDraft((prev) => ({ ...prev, query: event.target.value }))}
        />
      </div>

      <div className="flex gap-8 items-start">
        <aside className="w-[280px] flex-shrink-0 sticky top-[calc(70px+2rem)]">
          <div className="bg-white rounded-[16px] p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-slate-800">Filters</h2>
              <button
                className="text-[#2F4DA0] text-xs font-semibold hover:underline"
                type="button"
                onClick={() => {
                  setDraft(defaultFilters);
                  setApplied(defaultFilters);
                }}
              >
                Reset
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
              <select
                className="w-full border border-slate-200 rounded-xl text-sm focus:ring-[#2F4DA0] focus:border-[#2F4DA0] outline-none"
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

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Distance</label>
                <span className="text-xs font-bold text-[#2F4DA0]">{draft.distance}km</span>
              </div>
              <input
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#2F4DA0] disabled:opacity-40"
                disabled={!customerCoords}
                max="50"
                min="0"
                type="range"
                value={draft.distance}
                onChange={(event) => setDraft((prev) => ({ ...prev, distance: Number(event.target.value) }))}
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>0km</span>
                <span>{customerCoords ? customerLocationLabel || 'Saved customer location' : 'Set your location in Settings'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Minimum Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border ${value <= draft.minRating ? 'bg-yellow-50 text-yellow-500 border-yellow-200' : 'bg-slate-50 text-slate-300 border-slate-100'}`}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, minRating: value }))}
                  >
                    <span className="material-symbols-outlined text-base">star</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Experience</label>
              <select
                className="w-full border border-slate-200 rounded-xl text-sm focus:ring-[#2F4DA0] focus:border-[#2F4DA0] outline-none"
                value={draft.experience}
                onChange={(event) => setDraft((prev) => ({ ...prev, experience: event.target.value }))}
              >
                <option value="ANY">Any Experience</option>
                <option value="1-3">1-3 Years</option>
                <option value="3-5">3-5 Years</option>
                <option value="5+">5+ Years</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-semibold text-slate-700">Available Now</span>
              <button
                className={`w-10 h-5 rounded-full relative transition-all ${draft.availableNow ? 'bg-[#2F4DA0]' : 'bg-slate-300'}`}
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, availableNow: !prev.availableNow }))}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${draft.availableNow ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verification</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    className="w-4 h-4 rounded text-[#2F4DA0] focus:ring-[#2F4DA0] border-slate-300"
                    checked={draft.topRated}
                    type="checkbox"
                    onChange={(event) => setDraft((prev) => ({ ...prev, topRated: event.target.checked }))}
                  />
                  <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">Top Rated</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    className="w-4 h-4 rounded text-[#2F4DA0] focus:ring-[#2F4DA0] border-slate-300"
                    checked={draft.reliableBadge}
                    type="checkbox"
                    onChange={(event) => setDraft((prev) => ({ ...prev, reliableBadge: event.target.checked }))}
                  />
                  <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">Reliable Badge</span>
                </label>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button
                className="w-full bg-[#2F4DA0] text-white font-bold py-3 rounded-xl hover:shadow-lg transition-all active:scale-[0.98]"
                type="button"
                onClick={() => setApplied(draft)}
              >
                Apply Filters
              </button>
              <button
                className="w-full border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition-all"
                type="button"
                onClick={() => {
                  setDraft(defaultFilters);
                  setApplied(defaultFilters);
                }}
              >
                Clear All
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 space-y-4">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="bg-white rounded-[16px] p-6 shadow-sm border border-slate-100 space-y-4">
                  <Skeleton className="w-full h-48 rounded-xl" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-3/4" />
                  <div className="flex gap-3">
                    <Skeleton className="h-9 flex-1 rounded-lg" />
                    <Skeleton className="h-9 flex-1 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <div key={provider.id} className="bg-white rounded-[16px] p-6 shadow-sm hover:shadow-md transition-all group border border-slate-100">
                <div className="relative mb-4">
                  <div className="w-full h-48 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden">
                    {provider.image ? (
                      <img alt={provider.name} className="w-full h-full object-cover" src={provider.image} />
                    ) : (
                      <Avatar name={provider.name} className="w-20 h-20 text-3xl" />
                    )}
                  </div>
                  <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-[#2F4DA0] text-[10px] font-bold uppercase tracking-wider rounded shadow-sm">
                    {provider.categoryLabel}
                  </div>
                  <div className={`absolute bottom-3 right-3 w-4 h-4 ${provider.online ? 'bg-emerald-500' : 'bg-slate-300'} border-2 border-white rounded-full`} />
                </div>

                <div className="space-y-1 mb-4">
                  <h3 className="font-bold text-lg group-hover:text-[#2F4DA0] transition-colors">{provider.name}</h3>
                  <div className="flex items-center gap-1 text-yellow-400">
                    {[0, 1, 2, 3, 4].map((idx) => (
                      <span key={idx} className="material-symbols-outlined text-sm">
                        {idx < provider.stars ? 'star' : 'star_outline'}
                      </span>
                    ))}
                    <span className="text-xs font-bold text-slate-700 ml-1">{provider.rating.toFixed(1)}</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="material-symbols-outlined text-sm">verified_user</span>
                    <span className="text-xs font-medium">{provider.jobsLabel}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    <span className="text-xs font-medium">{provider.distanceLabel || provider.locationLabel}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="material-symbols-outlined text-sm">history_edu</span>
                    <span className="text-xs font-medium">{provider.experienceLabel}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Link
                    className="flex-1 border border-slate-200 text-slate-600 text-xs font-bold py-2.5 rounded-lg hover:bg-slate-50 transition-all text-center"
                    to={`/customer/providers/${provider.id}`}
                    state={{ providerName: provider.name }}
                  >
                    View Profile
                  </Link>
                  <Link
                    className="flex-1 bg-[#2F4DA0] text-white text-xs font-bold py-2.5 rounded-lg hover:shadow-lg transition-all text-center"
                    to="/customer/messages"
                    state={{ providerId: provider.id, providerName: provider.name, providerAvatar: provider.image }}
                  >
                    Contact
                  </Link>
                </div>
              </div>
            ))}

            {!loading && filteredProviders.length === 0 && (
              <div className="col-span-full bg-white border border-slate-100 rounded-2xl p-10 text-center text-slate-500">
                No providers match the selected filters.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

