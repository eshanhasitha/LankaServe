import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../lib/auth-context.tsx';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api.ts';
import Avatar from '../../components/Avatar.tsx';
import Skeleton from '../../components/Skeleton.tsx';

const ACTIVE_STATUSES = new Set(['pending', 'accepted', 'arrived', 'ongoing']);

function jobStatusLabel(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'ongoing') return 'Ongoing';
  if (s === 'accepted') return 'Accepted';
  if (s === 'arrived') return 'Arrived';
  return 'Pending Approval';
}

function jobStatusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'ongoing') return 'bg-emerald-50 text-emerald-600';
  if (s === 'accepted') return 'bg-blue-50 text-blue-600';
  if (s === 'arrived') return 'bg-cyan-50 text-cyan-600';
  return 'bg-yellow-50 text-yellow-600';
}

function formatPostedDate(isoString) {
  if (!isoString) return 'Posted recently';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Posted recently';
  return `Posted ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function normalizeCategory(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export default function CustomerDashboardPage() {
  const { user, accessToken } = useAuth();
  const firstName = user?.name?.split(' ')[0];
  const [activeJobs, setActiveJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [suggestedProviders, setSuggestedProviders] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
        const [jobsResponse, providersResponse] = await Promise.all([
          apiRequest('/jobs?limit=20', { headers }),
          apiRequest('/providers?limit=100', { headers }).catch(() => ({ data: [] })),
        ]);
        if (!mounted) return;
        const all = Array.isArray(jobsResponse?.data) ? jobsResponse.data : [];
        const active = all
          .filter((job) => ACTIVE_STATUSES.has(String(job.status || '').toLowerCase()))
          .slice(0, 5)
          .map((job) => ({
            _id: String(job._id),
            category: job.category || 'General',
            status: job.status,
            title: job.title || 'Untitled Job',
            dateText: formatPostedDate(job.createdAt),
            hasProvider: Boolean(job.providerId),
          }));
        setActiveJobs(active);

        const requestCategories = Array.from(
          new Set(
            all
              .map((job) => normalizeCategory(job?.category))
              .filter(Boolean)
          )
        );

        const providerItems = Array.isArray(providersResponse?.data) ? providersResponse.data : [];
        const matchedProviders = providerItems
          .map((provider) => {
            const providerCategories = Array.isArray(provider?.categories)
              ? provider.categories.map((item) => normalizeCategory(item)).filter(Boolean)
              : [];
            const matchCount = providerCategories.filter((category) => requestCategories.includes(category)).length;
            const rating = Number(provider?.stats?.averageRating || 0);
            return {
              id: String(provider?.userId?._id || provider?.userId || provider?._id),
              name: provider?.userId?.name || 'Provider',
              profileImage: provider?.userId?.profileImage || '',
              categoryLabel: provider?.categories?.[0] || 'General',
              city: provider?.city || '',
              district: provider?.district || '',
              rating,
              completedJobs: Number(provider?.stats?.completedJobs || 0),
              availability: provider?.availability || 'offline',
              verified: Boolean(provider?.verified),
              matchCount,
            };
          })
          .filter((provider) => provider.matchCount > 0)
          .sort((left, right) =>
            right.matchCount - left.matchCount ||
            Number(right.verified) - Number(left.verified) ||
            right.rating - left.rating ||
            right.completedJobs - left.completedJobs
          )
          .slice(0, 4);

        setSuggestedProviders(matchedProviders);
      } catch {
        if (!mounted) return;
        setActiveJobs([]);
        setSuggestedProviders([]);
      } finally {
        if (mounted) setLoadingJobs(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [accessToken]);

  const heroSubtext = !loadingJobs && activeJobs.length > 0
    ? `You have ${activeJobs.length} active job${activeJobs.length !== 1 ? 's' : ''} in progress.`
    : 'Find the best local experts for your home services today.';

  const hasSuggestions = useMemo(() => suggestedProviders.length > 0, [suggestedProviders]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <section className="bg-linear-to-r from-[#2F4DA0] to-[#4A69BD] rounded-[18px] p-10 text-white relative overflow-hidden">
        <div className="relative z-10 max-w-lg">
          <h1 className="text-3xl font-bold mb-2">Welcome Back, {firstName}!</h1>
          <p className="text-blue-100 opacity-90">{heroSubtext}</p>
        </div>
        <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-20 hidden lg:block">
          <span className="material-symbols-outlined text-9xl">handshake</span>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="w-12 h-12 bg-blue-50 text-[#2F4DA0] rounded-xl flex items-center justify-center mb-4">
              <span className="material-symbols-outlined">history</span>
            </div>
            <h3 className="font-bold text-lg mb-1">My Jobs</h3>
            <p className="text-slate-500 text-sm">Track your ongoing and past service requests.</p>
          </div>
          <Link to="/customer/my-jobs" className="mt-4 flex items-center justify-center w-8 h-8 bg-slate-50 rounded-full group-hover:bg-[#2F4DA0] group-hover:text-white transition-all">
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <span className="material-symbols-outlined">add_task</span>
            </div>
            <h3 className="font-bold text-lg mb-1">Post a Service</h3>
            <p className="text-slate-500 text-sm">Create a new request for any help you need.</p>
          </div>
          <Link to="/customer/post-service" className="mt-4 flex items-center justify-center w-8 h-8 bg-slate-50 rounded-full group-hover:bg-[#2F4DA0] group-hover:text-white transition-all">
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-4">
              <span className="material-symbols-outlined">manage_search</span>
            </div>
            <h3 className="font-bold text-lg mb-1">Find Providers</h3>
            <p className="text-slate-500 text-sm">Browse our directory of verified professionals.</p>
          </div>
          <Link to="/customer/find-providers" className="mt-4 flex items-center justify-center w-8 h-8 bg-slate-50 rounded-full group-hover:bg-[#2F4DA0] group-hover:text-white transition-all">
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Active Jobs</h2>
          <Link className="text-[#2F4DA0] text-sm font-semibold hover:underline" to="/customer/my-jobs">View All</Link>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {loadingJobs ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={`job-skeleton-${index}`} className="min-w-[320px] bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-20 rounded" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="pt-4 border-t border-slate-50 flex justify-between">
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))
          ) : activeJobs.map((job) => (
            <div key={job._id} className="min-w-[320px] bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider rounded">{job.category}</span>
                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${jobStatusClass(job.status)}`}>{jobStatusLabel(job.status)}</span>
              </div>
              <h4 className="font-bold mb-2">{job.title}</h4>
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-4">
                <span className="material-symbols-outlined text-sm">schedule</span>
                <span>{job.dateText}</span>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  {job.hasProvider ? (
                    <>
                      <Avatar name="Provider" className="w-6 h-6" />
                      <span className="text-xs font-medium">Provider Assigned</span>
                    </>
                  ) : (
                    <>
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-xs text-slate-400">person</span>
                      </div>
                      <span className="text-xs font-medium text-slate-400 italic">Awaiting Provider</span>
                    </>
                  )}
                </div>
                <Link
                  className="text-xs font-bold text-[#2F4DA0] flex items-center gap-1"
                  to={`/customer/my-jobs/${job._id}`}
                  state={{ jobTitle: job.title }}
                >
                  View Details <span className="material-symbols-outlined text-xs">arrow_right_alt</span>
                </Link>
              </div>
            </div>
          ))}
          {!loadingJobs && activeJobs.length === 0 && (
            <div className="min-w-[320px] bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center h-[140px] gap-2">
              <span className="material-symbols-outlined text-slate-300 text-3xl">work_off</span>
              <p className="text-sm text-slate-400">No active jobs yet.</p>
              <Link className="text-xs font-bold text-[#2F4DA0] hover:underline" to="/customer/post-service">Post a Service</Link>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Suggested Providers</h2>
            <p className="text-sm text-slate-500">Matched to categories from your job requests.</p>
          </div>
          <Link className="text-[#2F4DA0] text-sm font-semibold hover:underline" to="/customer/find-providers">View All</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {loadingJobs ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={`provider-skeleton-${index}`} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-14 h-14 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ))
          ) : hasSuggestions ? (
            suggestedProviders.map((provider) => (
              <div key={provider.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                  <Avatar src={provider.profileImage} name={provider.name} className="w-14 h-14 rounded-full" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 truncate">{provider.name}</h4>
                      {provider.verified ? (
                        <span className="material-symbols-outlined text-sm text-emerald-500">verified</span>
                      ) : null}
                    </div>
                    <p className="text-sm text-slate-500">{provider.categoryLabel}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-slate-500 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-amber-400">star</span>
                    <span>{provider.rating.toFixed(1)} rating</span>
                    <span className="text-slate-300">â€¢</span>
                    <span>{provider.completedJobs}+ jobs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-slate-400">location_on</span>
                    <span>{[provider.city, provider.district].filter(Boolean).join(', ') || 'Sri Lanka'}</span>
                  </div>
                </div>
                <Link
                  to={`/customer/providers/${provider.id}`}
                  className="w-full inline-flex items-center justify-center rounded-xl bg-[#2F4DA0] text-white text-sm font-bold py-2.5 hover:opacity-90 transition-all"
                >
                  View Profile
                </Link>
              </div>
            ))
          ) : (
            <div className="md:col-span-2 xl:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-sm text-slate-500">
              No provider suggestions yet. Post more job requests to get category-based matches.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

