import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../../lib/api.ts';
import Avatar from '../../components/Avatar.tsx';
import Skeleton from '../../components/Skeleton.tsx';
import { useAuth } from '../../lib/auth-context.tsx';

function slugify(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function StarRow({ rating, count, percent }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-3 text-slate-700 font-semibold">{rating}</span>
      <span className="material-symbols-outlined text-sm text-amber-400">star</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-amber-400" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-10 text-right text-slate-400 font-medium">{percent}%</span>
    </div>
  );
}

function getReviewTone(rating) {
  const value = Number(rating || 0);
  if (value >= 4) {
    return {
      label: 'Positive',
      className: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    };
  }
  if (value >= 3) {
    return {
      label: 'Neutral',
      className: 'bg-amber-50 text-amber-600 border border-amber-100',
    };
  }
  return {
    label: 'Negative',
    className: 'bg-rose-50 text-rose-600 border border-rose-100',
  };
}

export default function CustomerProviderProfilePage() {
  const { providerId } = useParams();
  const { accessToken } = useAuth();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError('');

        const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
        const providersResponse = await apiRequest('/providers?limit=100', { headers }).catch(() => ({ data: [] }));
        const items = Array.isArray(providersResponse?.data) ? providersResponse.data : [];
        const match = items.find((item) => {
          const userId = String(item?.userId?._id || item?.userId || '');
          const profileId = String(item?._id || '');
          const slug = slugify(item?.userId?.name);
          return userId === providerId || profileId === providerId || slug === providerId;
        });

        if (!match) {
          if (!mounted) return;
          setProfile(null);
          setReviews([]);
          return;
        }

        const resolvedProviderId = String(match?.userId?._id || match?.userId || match?._id);
        const [profileResponse, reviewsResponse, meResponse] = await Promise.all([
          apiRequest(`/providers/${resolvedProviderId}`, { headers }).catch(() => ({ data: null })),
          apiRequest(`/reviews/provider/${resolvedProviderId}?limit=5`, { headers }).catch(() => ({ data: [] })),
          accessToken ? apiRequest('/users/me', { headers }).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
        ]);

        if (!mounted) return;

        const data = profileResponse?.data;
        if (!data) {
          setProfile(null);
          setReviews([]);
          return;
        }

        setProfile({
          id: resolvedProviderId,
          name: data?.userId?.name || 'Provider',
          title: data?.categories?.[0] || 'General Service',
          categories: Array.isArray(data?.categories) ? data.categories : [],
          experience: `${Number(data?.yearsExperience || 0)}+ Years`,
          location: [data?.district, data?.city].filter(Boolean).join(', ') || 'Sri Lanka',
          rating: Number(data?.stats?.averageRating || 0),
          totalReviews: Number(data?.totalReviews || 0),
          completedJobs: Number(data?.stats?.completedJobs || 0),
          responseTime: data?.stats?.avgResponseTimeMinutes && data.stats.avgResponseTimeMinutes < 60 ? '< 1 Hour' : '< 3 Hours',
          avatar: data?.userId?.profileImage || '',
          bio: data?.bio || '',
          verified: Boolean(data?.verified),
          availability: data?.availabilityDetails || { status: 'Unavailable', schedule: [] },
          ratingBreakdown: Array.isArray(data?.ratingBreakdown) ? data.ratingBreakdown : [],
        });

        const loadedReviews = Array.isArray(reviewsResponse?.data) ? reviewsResponse.data : [];
        setReviews(
          loadedReviews.map((item, index) => ({
            id: item?._id || `review-${index}`,
            name: 'Customer',
            ago: item?.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recently',
            text: item?.comment || 'No comment',
            rating: Number(item?.rating || 0),
          })),
        );

        const me = meResponse?.data || {};
        setFavorites(Array.isArray(me?.favorites) ? me.favorites.map(String) : []);
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError?.message || 'Failed to load provider profile.');
        setProfile(null);
        setReviews([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      mounted = false;
    };
  }, [providerId, accessToken]);

  const isSaved = useMemo(() => {
    if (!profile?.id) return false;
    return favorites.includes(String(profile.id));
  }, [favorites, profile?.id]);

  async function toggleFavorite() {
    if (!accessToken || !profile?.id || savingFavorite) return;
    try {
      setSavingFavorite(true);
      const headers = { Authorization: `Bearer ${accessToken}` };
      if (isSaved) {
        const response = await apiRequest(`/users/favorites/${profile.id}`, { method: 'DELETE', headers });
        setFavorites(Array.isArray(response?.data) ? response.data.map(String) : []);
      } else {
        const response = await apiRequest(`/users/favorites/${profile.id}`, { method: 'POST', headers });
        setFavorites(Array.isArray(response?.data) ? response.data.map(String) : []);
      }
    } finally {
      setSavingFavorite(false);
    }
  }

  async function shareProfile() {
    if (!profile) return;
    const shareData = {
      title: profile.name,
      text: `${profile.name} - ${profile.title}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // fall through to clipboard copy
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // no-op
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-[1440px] mx-auto space-y-6">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Skeleton className="w-[140px] h-[140px] rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-72" />
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="space-y-3 min-w-[220px]">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8 space-y-6">
            <Skeleton className="h-56 w-full rounded-2xl" />
            <Skeleton className="h-56 w-full rounded-2xl" />
          </div>
          <div className="col-span-4 space-y-6">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-52 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 max-w-[1440px] mx-auto space-y-4">
        <p className="text-sm text-red-600">{error || 'Provider profile is unavailable.'}</p>
        <Link className="text-sm font-semibold text-[#2F4DA0] hover:underline" to="/customer/find-providers">
          Back to Providers
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1440px] mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="relative">
            <Avatar src={profile.avatar} name={profile.name} className="w-[140px] h-[140px] border-4 border-slate-50 shadow-md" />
            {profile.verified ? <div className="absolute bottom-1 right-3 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full" /> : null}
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-slate-900">{profile.name}</h2>
              {profile.verified ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full border border-emerald-100">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  Verified
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-6 text-slate-600 text-sm font-medium">
              <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-lg text-slate-400">home_repair_service</span>{profile.title}</div>
              <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-lg text-slate-400">history_edu</span>{profile.experience}</div>
              <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-lg text-slate-400">location_on</span>{profile.location}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex text-amber-400">
                <span className="material-symbols-outlined">star</span>
              </div>
              <span className="text-sm font-bold">{profile.rating.toFixed(1)}</span>
              <span className="text-sm text-slate-400 font-medium">({profile.totalReviews} reviews)</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 min-w-[220px]">
          <Link
            className="w-full bg-[#2F4DA0] text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-blue-200 transition-all active:scale-[0.98] text-center"
            to="/customer/post-service"
            state={{ preferredProviderId: profile.id, preferredProviderName: profile.name, preferredCategory: profile.title }}
          >
            Hire Now
          </Link>
          <Link
            className="w-full border-2 border-slate-200 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition-all text-center"
            to="/customer/messages"
            state={{ providerId: profile.id, providerName: profile.name, providerAvatar: profile.avatar }}
          >
            Message
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 text-center"><p className="text-2xl font-bold text-slate-900 mb-1">{profile.completedJobs}+</p><p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Completed Jobs</p></div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 text-center"><p className="text-2xl font-bold text-slate-900 mb-1">{profile.rating.toFixed(1)}/5.0</p><p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Avg Rating</p></div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 text-center"><p className="text-2xl font-bold text-slate-900 mb-1">{profile.responseTime}</p><p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Response Time</p></div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-8 space-y-6">
          <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">About</h3>
            <p className="text-slate-600 leading-relaxed">
              {profile.bio || 'No provider bio available.'}
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Customer Reviews</h3>
            </div>
            {reviews.length ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={review.name} className="w-10 h-10" />
                        <div><p className="text-sm font-bold text-slate-900">{review.name}</p><p className="text-xs text-slate-500">{review.ago}</p></div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex text-amber-400">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <span key={`${review.id}-${value}`} className="material-symbols-outlined text-sm">{value <= review.rating ? 'star' : 'star_outline'}</span>
                          ))}
                        </div>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${getReviewTone(review.rating).className}`}>
                          {getReviewTone(review.rating).label}
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">{review.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 text-sm text-slate-500">
                No reviews available yet.
              </div>
            )}
          </section>
        </div>

        <div className="col-span-4 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-5">Rating Breakdown</h3>
            <div className="space-y-4">
              {profile.ratingBreakdown.map((item) => (
                <StarRow key={`breakdown-${item.rating}`} rating={item.rating} count={item.count} percent={item.percent} />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4">Availability</h3>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between mb-5">
              <span className="text-emerald-700 font-bold text-sm">Status</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
                {profile.availability.status}
              </span>
            </div>
            <div className="space-y-3">
              {profile.availability.schedule.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium">{item.label}</span>
                  <span className={`font-semibold ${item.hours.toLowerCase() === 'closed' ? 'text-slate-400' : 'text-slate-700'}`}>{item.hours}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-3 gap-3">
              <button type="button" onClick={shareProfile} className="rounded-xl bg-slate-50 px-3 py-4 text-center hover:bg-slate-100 transition-colors">
                <span className="material-symbols-outlined text-slate-500">share</span>
                <p className="text-xs font-semibold text-slate-500 mt-2">Share</p>
              </button>
              <button
                type="button"
                onClick={toggleFavorite}
                disabled={!accessToken || savingFavorite}
                className="rounded-xl bg-slate-50 px-3 py-4 text-center hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-slate-500">{isSaved ? 'bookmark_added' : 'bookmark'}</span>
                <p className="text-xs font-semibold text-slate-500 mt-2">{isSaved ? 'Saved' : 'Save'}</p>
              </button>
              <a
                href={`mailto:support@lankaserve.com?subject=Report Provider ${encodeURIComponent(profile.name)}`}
                className="rounded-xl bg-slate-50 px-3 py-4 text-center hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-rose-500">report</span>
                <p className="text-xs font-semibold text-slate-500 mt-2">Report</p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

