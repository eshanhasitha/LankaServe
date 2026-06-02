import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '../lib/auth-context.tsx';
import { AnalyticsSkeleton } from '../components/AdminSkeletons.tsx';

const bucketColors = ['bg-[var(--primary)]', 'bg-blue-600', 'bg-blue-500', 'bg-blue-400', 'bg-blue-300', 'bg-blue-200'];

function percent(value, total) {
  if (!total) return 0;
  return Math.round((Number(value || 0) / Number(total)) * 1000) / 10;
}

function formatCount(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

function formatRating(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0.00';
  return num.toFixed(2);
}

function fillPercent(value, max) {
  if (!max) return 0;
  return Math.max(8, Math.round((value / max) * 100));
}

export default function AdminAnalyticsPage() {
  const { authorizedRequest } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [overview, setOverview] = useState(null);
  const [services, setServices] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [usersMap, setUsersMap] = useState(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [overviewRes, servicesRes, jobsRes, reviewsRes, usersRes] = await Promise.all([
        authorizedRequest('/analytics/overview'),
        authorizedRequest('/analytics/services'),
        authorizedRequest('/admin/jobs?page=1&limit=300'),
        authorizedRequest('/admin/reviews?page=1&limit=300'),
        authorizedRequest('/admin/users?page=1&limit=500'),
      ]);

      const jobsRows = Array.isArray(jobsRes?.data) ? jobsRes.data : [];
      const reviewRows = Array.isArray(reviewsRes?.data) ? reviewsRes.data : [];
      const usersRows = Array.isArray(usersRes?.data) ? usersRes.data : [];

      setOverview(overviewRes?.data || null);
      setServices(Array.isArray(servicesRes?.data) ? servicesRes.data : []);
      setJobs(jobsRows);
      setReviews(reviewRows);
      setUsersMap(new Map(usersRows.map((user) => [String(user._id), user])));
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest]);

  useEffect(() => {
    load();
  }, [load]);

  const computed = useMemo(() => {
    const totalJobs = Number(overview?.totalJobs || 0);
    const totalProviders = Number(overview?.totalProviders || 0);

    const topCategory = services[0]?._id || 'N/A';
    const topCategoryCount = Number(services[0]?.count || 0);
    const topCategoryPct = percent(topCategoryCount, totalJobs);

    const completedJobs = jobs.filter((job) => ['completed', 'paid'].includes(String(job?.status || '').toLowerCase())).length;
    const completionRate = percent(completedJobs, Math.max(1, jobs.length));

    const ratingAvg = reviews.length
      ? reviews.reduce((sum, row) => sum + Number(row?.rating || 0), 0) / reviews.length
      : 0;

    const starBuckets = { 5: 0, 4: 0, 3: 0, below: 0 };
    reviews.forEach((row) => {
      const r = Number(row?.rating || 0);
      if (r >= 4.5) starBuckets[5] += 1;
      else if (r >= 3.5) starBuckets[4] += 1;
      else if (r >= 2.5) starBuckets[3] += 1;
      else starBuckets.below += 1;
    });
    const totalReviews = Math.max(1, reviews.length);

    const demandBars = services.slice(0, 6).map((item, idx) => ({
      name: item?._id || 'Other',
      count: Number(item?.count || 0),
      color: bucketColors[idx] || 'bg-blue-200',
    }));

    const maxServiceCount = Math.max(1, ...demandBars.map((item) => item.count));

    const districtCounter = new Map();
    jobs.forEach((job) => {
      const customerId = String(job?.customerId || '');
      const district = String(usersMap.get(customerId)?.district || '').trim();
      if (!district) return;
      districtCounter.set(district, Number(districtCounter.get(district) || 0) + 1);
    });

    const districtRows = Array.from(districtCounter.entries())
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const maxDistrict = Math.max(1, ...districtRows.map((item) => item.count));

    return {
      topCategory,
      topCategoryPct,
      completionRate,
      ratingAvg,
      activeRegions: districtCounter.size,
      demandBars,
      maxServiceCount,
      districtRows,
      maxDistrict,
      stars: {
        five: percent(starBuckets[5], totalReviews),
        four: percent(starBuckets[4], totalReviews),
        three: percent(starBuckets[3], totalReviews),
        below: percent(starBuckets.below, totalReviews),
      },
      totalProviders,
    };
  }, [jobs, overview?.totalJobs, overview?.totalProviders, reviews, services, usersMap]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics Overview</h1>
          <p className="text-sm text-slate-500">Real-time business intelligence and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50">
            <span className="material-symbols-outlined text-lg">download</span>
            Export CSV
          </button>
          <button type="button" className="flex items-center gap-2 rounded-lg bg-(--primary) px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90">
            <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
            Export PDF
          </button>
        </div>
      </div>

      {loading ? <AnalyticsSkeleton /> : null}
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div> : null}

      {!loading && !error ? (
        <>
          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <p className="mb-1 text-sm font-medium text-slate-500">Most Demanded Category</p>
              <h3 className="text-xl font-bold text-slate-900">{computed.topCategory}</h3>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-(--primary)">{computed.topCategoryPct}% of total</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <p className="mb-1 text-sm font-medium text-slate-500">Active Regions</p>
              <h3 className="text-xl font-bold text-slate-900">{computed.activeRegions} Districts</h3>
              <div className="mt-2 flex items-center gap-2">
                <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-500"><span className="material-symbols-outlined text-xs">add</span>2 new</span>
                <span className="text-xs text-slate-400">this month</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <p className="mb-1 text-sm font-medium text-slate-500">Average Platform Rating</p>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900">{formatRating(computed.ratingAvg)}</h3>
                <span className="material-symbols-outlined fill-1 text-amber-400">star</span>
              </div>
              <div className="mt-2 flex items-center gap-1">
                <div className="flex gap-0.5">
                  <div className="h-1 w-4 rounded-full bg-amber-400" />
                  <div className="h-1 w-4 rounded-full bg-amber-400" />
                  <div className="h-1 w-4 rounded-full bg-amber-400" />
                  <div className="h-1 w-4 rounded-full bg-amber-400" />
                  <div className="h-1 w-3 rounded-full bg-slate-200" />
                </div>
                <span className="ml-1 text-[10px] font-bold text-slate-400">EXCELLENT</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <p className="mb-1 text-sm font-medium text-slate-500">Overall Completion Rate</p>
              <h3 className="text-xl font-bold text-slate-900">{computed.completionRate}%</h3>
              <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
                <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, computed.completionRate))}%` }} />
              </div>
            </div>
          </section>

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-8">
              <div className="mb-8 flex items-center justify-between">
                <h4 className="font-bold text-slate-800">Service Demand by Category</h4>
                <select className="rounded-lg border-slate-200 bg-slate-50 py-1.5 text-xs focus:border-(--primary) focus:ring-(--primary)">
                  <option>Last 30 Days</option>
                  <option>Last Quarter</option>
                </select>
              </div>
              <div className="flex h-64 items-end justify-between gap-4 px-2">
                {computed.demandBars.map((bar) => (
                  <div key={bar.name} className="flex flex-1 flex-col items-center gap-3">
                    <div className="group relative h-[85%] w-full rounded-t-lg bg-blue-100 transition-all hover:bg-blue-200" style={{ height: `${fillPercent(bar.count, computed.maxServiceCount)}%` }}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-slate-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">{formatCount(bar.count)}</div>
                      <div className={`absolute bottom-0 h-[80%] w-full rounded-t-lg ${bar.color}`} />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 lg:rotate-0">{bar.name}</span>
                  </div>
                ))}
                {!computed.demandBars.length ? <p className="text-sm text-slate-500">No demand data available.</p> : null}
              </div>
            </div>

            <div className="col-span-12 flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-4">
              <h4 className="mb-6 font-bold text-slate-800">Provider Performance Distribution</h4>
              <div className="relative flex flex-1 flex-col items-center justify-center">
                <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-14 border-slate-50">
                  <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="var(--primary)" strokeWidth="3" strokeDasharray={`${computed.stars.five} 100`} strokeLinecap="round" />
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#4F46E5" strokeWidth="3" strokeDasharray={`${computed.stars.four} 100`} strokeDashoffset={`-${computed.stars.five}`} strokeLinecap="round" />
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#94A3B8" strokeWidth="3" strokeDasharray={`${computed.stars.three} 100`} strokeDashoffset={`-${computed.stars.five + computed.stars.four}`} strokeLinecap="round" />
                  </svg>
                  <div className="text-center">
                    <span className="block text-2xl font-bold text-slate-800">{formatCount(computed.totalProviders)}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</span>
                  </div>
                </div>
                <div className="mt-8 grid w-full grid-cols-2 gap-x-8 gap-y-2">
                  <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-(--primary)" /><span className="text-xs font-medium text-slate-600">5-Star ({computed.stars.five}%)</span></div>
                  <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-indigo-600" /><span className="text-xs font-medium text-slate-600">4-Star ({computed.stars.four}%)</span></div>
                  <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-slate-400" /><span className="text-xs font-medium text-slate-600">3-Star ({computed.stars.three}%)</span></div>
                  <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-slate-200" /><span className="text-xs font-medium text-slate-600">Below ({computed.stars.below}%)</span></div>
                </div>
              </div>
            </div>

            <div className="col-span-12 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800">Jobs by District</h4>
                  <p className="text-xs text-slate-400">Regional job distribution across Sri Lanka</p>
                </div>
                <button type="button" className="text-[10px] font-bold uppercase tracking-widest text-(--primary) hover:underline">Download Full Report</button>
              </div>

              <div className="space-y-5">
                {computed.districtRows.map((row, index) => (
                  <div key={row.district} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700">{row.district}</span>
                      <span className="text-slate-500">{formatCount(row.count)} Jobs ({percent(row.count, jobs.length)}%)</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100">
                      <div className={`${index === 0 ? 'bg-(--primary)' : index === 1 ? 'bg-blue-600' : index === 2 ? 'bg-blue-500' : index === 3 ? 'bg-blue-400' : 'bg-blue-300'} h-3 rounded-full`} style={{ width: `${Math.max(6, Math.round((row.count / computed.maxDistrict) * 100))}%` }} />
                    </div>
                  </div>
                ))}
                {!computed.districtRows.length ? <p className="text-sm text-slate-500">No district data found from current jobs.</p> : null}
              </div>

              <div className="mt-8 flex items-center justify-center gap-8 border-t border-slate-50 pt-6 text-[10px] font-bold text-slate-400">
                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-(--primary)" /> High Demand</div>
                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-blue-500" /> Moderate Demand</div>
                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-blue-300" /> Low Demand</div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

