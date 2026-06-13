import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../lib/auth-context.tsx';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../lib/api.ts';
import Avatar from '../../components/Avatar.tsx';
import Skeleton from '../../components/Skeleton.tsx';

const ACTIVE_STATUSES = new Set(['pending', 'accepted', 'arrived', 'ongoing']);

function jobStatusLabel(status: string) {
  const s = String(status || '').toLowerCase();
  if (s === 'ongoing') return 'Ongoing Work';
  if (s === 'accepted') return 'Accepted';
  if (s === 'arrived') return 'On Site';
  return 'Awaiting Offers';
}

function jobStatusClass(status: string) {
  const s = String(status || '').toLowerCase();
  if (s === 'ongoing') return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
  if (s === 'accepted') return 'bg-blue-50 text-[#2F4DA0] border border-blue-100';
  if (s === 'arrived') return 'bg-cyan-50 text-cyan-600 border border-cyan-100';
  return 'bg-amber-50 text-amber-600 border border-amber-100';
}

function formatPostedDate(isoString: string) {
  if (!isoString) return 'Posted recently';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Posted recently';
  return `Posted ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function normalizeCategory(value: any) {
  return String(value || '').trim().toLowerCase();
}

export default function CustomerDashboardPage() {
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.name?.split(' ')[0] || 'User';
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
            title: job.title || 'Untitled Request',
            dateText: formatPostedDate(job.createdAt),
            hasProvider: Boolean(job.providerId),
          }));
        setActiveJobs(active);

        const requestCategories = Array.from(
          new Set(
            all.map((job) => normalizeCategory(job?.category)).filter(Boolean)
          )
        );

        const providerItems = Array.isArray(providersResponse?.data) ? providersResponse.data : [];
        const matchedProviders = providerItems
          .map((provider) => {
            const providerCategories = Array.isArray(provider?.categories)
              ? provider.categories.map((item) => normalizeCategory(item)).filter(Boolean)
              : [];
            const matchCount = providerCategories.filter((cat) => requestCategories.includes(cat)).length;
            const rating = Number(provider?.stats?.averageRating || 0);
            return {
              id: String(provider?.userId?._id || provider?.userId || provider?._id),
              name: provider?.userId?.name || 'Verified Professional',
              profileImage: provider?.userId?.profileImage || '',
              categoryLabel: provider?.categories?.[0] || 'General Trade',
              city: provider?.city || '',
              district: provider?.district || '',
              rating,
              completedJobs: Number(provider?.stats?.completedJobs || 0),
              verified: Boolean(provider?.verified),
              matchCount,
            };
          })
          .filter((prov) => prov.matchCount > 0 || prov.rating >= 4.5)
          .sort((a, b) => b.rating - a.rating || b.completedJobs - a.completedJobs)
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
    ? `You have ${activeJobs.length} local trade booking${activeJobs.length !== 1 ? 's' : ''} active right now.`
    : 'Deploy new local service tasks with built-in QR checks and escrow protection layers.';

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8 font-['Inter']">
      
      {/* Premium Gradient Dynamic Welcome Panel */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2F4DA0] to-[#3B5998] p-6 text-white sm:p-8 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent)] pointer-events-none" />
        <div className="relative z-10 max-w-xl">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Ayubowan, {firstName}!</h1>
          <p className="text-sm text-blue-100/90 font-medium leading-relaxed">{heroSubtext}</p>
        </div>
        <div className="absolute right-12 top-1/2 -translate-y-1/2 text-white/5 select-none pointer-events-none hidden lg:block">
          <span className="material-symbols-outlined text-[120px] font-bold">qr_code_scanner</span>
        </div>
      </section>

      {/* Primary Actions Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200/60 shadow-2xs p-6 rounded-2xl flex flex-col justify-between group hover:border-[#2F4DA0] transition-all duration-200">
          <div>
            <div className="w-10 h-10 bg-blue-50 text-[#2F4DA0] rounded-xl flex items-center justify-center mb-4 border border-blue-100">
              <span className="material-symbols-outlined text-base font-bold">business_center</span>
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">My Bookings</h3>
            <p className="text-xs font-medium text-slate-400 leading-normal">Monitor your historical requests, checking timelines and current matching balances.</p>
          </div>
          <Link to="/customer/my-jobs" className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#2F4DA0] group-hover:underline">
            Manage Bookings <span className="material-symbols-outlined text-xs">arrow_forward</span>
          </Link>
        </div>

        <div className="bg-white border border-slate-200/60 shadow-2xs p-6 rounded-2xl flex flex-col justify-between group hover:border-emerald-500 transition-all duration-200">
          <div>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 border border-emerald-100">
              <span className="material-symbols-outlined text-base font-bold">add_task</span>
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Post a Request</h3>
            <p className="text-xs font-medium text-slate-400 leading-normal">Submit a brand new task outlining your targeted local coordinates and budget bounds.</p>
          </div>
          <Link to="/customer/post-service" className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 group-hover:underline">
            Request Help Now <span className="material-symbols-outlined text-xs">arrow_forward</span>
          </Link>
        </div>

        <div className="bg-white border border-slate-200/60 shadow-2xs p-6 rounded-2xl flex flex-col justify-between group hover:border-amber-500 transition-all duration-200">
          <div>
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4 border border-amber-100">
              <span className="material-symbols-outlined text-base font-bold">person_search</span>
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Find Trade Pros</h3>
            <p className="text-xs font-medium text-slate-400 leading-normal">Scan our directory nodes of authenticated electricians, mechanics, and painters near you.</p>
          </div>
          <Link to="/customer/find-providers" className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 group-hover:underline">
            Explore Experts <span className="material-symbols-outlined text-xs">arrow_forward</span>
          </Link>
        </div>
      </section>

      {/* Active Postings Widget Carousel */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-900">Active Allocations</h2>
            <p className="text-xs font-medium text-slate-400 mt-0.5">Live pipelines requesting verification updates</p>
          </div>
          <Link className="text-[#2F4DA0] text-xs font-bold uppercase tracking-wide" to="/customer/my-jobs">View All</Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-3 select-none">
          {loadingJobs ? (
            Array.from({ length: 2 }).map((_, index) => (
              <div key={`job-skeleton-${index}`} className="min-w-[280px] sm:min-w-[340px] rounded-2xl border border-slate-100 bg-white p-5 space-y-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))
          ) : activeJobs.length ? (
            activeJobs.map((job: any) => (
              <div key={job._id} className="flex flex-col min-w-[280px] sm:min-w-[340px] max-w-[340px] bg-white border border-slate-200/60 rounded-2xl p-5 shadow-2xs justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-4">
                    <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-[9px] font-bold tracking-wider text-slate-500 uppercase rounded">{job.category}</span>
                    <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-full ${jobStatusClass(job.status)}`}>{jobStatusLabel(job.status)}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm leading-snug mb-2 line-clamp-2 h-10">{job.title}</h4>
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    <span className="font-medium">{job.dateText}</span>
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {job.hasProvider ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar name="Provider" className="w-5 h-5 rounded-full ring-1 ring-slate-200" />
                        <span className="text-[11px] font-bold text-slate-600">Pro Checked-In</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-400 italic font-medium text-[11px]">
                        <span className="material-symbols-outlined text-sm animate-pulse">hourglass_top</span>
                        <span>Sourcing Offers...</span>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => navigate(`/customer/my-jobs/${job._id}`, { state: { jobTitle: job.title } })}
                    className="text-xs font-bold text-[#2F4DA0] hover:underline flex items-center"
                  >
                    Details <span className="material-symbols-outlined text-xs">chevron_right</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="w-full bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-slate-300 text-3xl">work_history</span>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No active job tokens found</p>
              <Link to="/customer/post-service" className="text-xs font-black text-[#2F4DA0] hover:underline">Launch your first request now</Link>
            </div>
          )}
        </div>
      </section>

      {/* Suggested Providers Directory List View */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Highly Rated Pros Near You</h2>
          <p className="text-xs font-medium text-slate-400 mt-0.5">Verified service specialists tracking high feedback reviews</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loadingJobs ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={`prov-skeleton-${index}`} className="bg-white border border-slate-100 p-5 rounded-2xl space-y-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))
          ) : suggestedProviders.length ? (
            suggestedProviders.map((provider: any) => (
              <div key={provider.id} className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all duration-200">
                <div>
                  <div className="flex items-start gap-3 mb-4">
                    <Avatar src={provider.profileImage} name={provider.name} className="w-12 h-12 rounded-full ring-2 ring-slate-50 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <h4 className="font-bold text-slate-900 text-xs truncate">{provider.name}</h4>
                        {provider.verified && <span className="material-symbols-outlined text-sm text-emerald-500 font-bold shrink-0">verified</span>}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5 block">{provider.categoryLabel}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs font-medium text-slate-500 border-t border-slate-50 pt-3.5 mb-5">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-amber-400">star</span>
                      <span className="font-bold text-slate-700">{provider.rating.toFixed(1)}</span>
                      <span className="text-slate-300">•</span>
                      <span>{provider.completedJobs} jobs done</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      <span className="truncate">{[provider.city, provider.district].filter(Boolean).join(', ') || 'Sri Lanka'}</span>
                    </div>
                  </div>
                </div>

                <Link to={`/customer/providers/${provider.id}`} className="w-full bg-slate-50 hover:bg-blue-50 hover:text-[#2F4DA0] text-slate-700 text-xs font-bold py-2.5 rounded-xl text-center transition-colors border border-slate-200/40 block">
                  View Profile
                </Link>
              </div>
            ))
          ) : (
            <div className="bg-white border border-slate-200/60 rounded-2xl p-6 text-xs font-medium text-slate-400 italic md:col-span-2 lg:col-span-4 text-center">
              No top provider profiles matching open filters.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}