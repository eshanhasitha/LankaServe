import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../lib/api.ts';
import { useAuth } from '../../lib/auth-context.tsx';
import Skeleton from '../../components/Skeleton.tsx';

const EMPTY_ANALYTICS = {
  periodMonths: 6,
  summary: {
    averageRating: 0,
    avgResponseTimeMinutes: 0,
    successRate: 0,
    completedJobs: 0,
    totalJobs: 0,
    cancelledRate: 0,
    repeatClientRate: 0,
    responseEfficiency: 0,
  },
  trends: {
    completion: [],
    earnings: [],
    rating: [],
  },
};

function toCurrency(value) {
  return `LKR ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function buildPath(points, width = 100, height = 100) {
  if (!points.length) return '';
  if (points.length === 1) return `M0,${height - points[0]} L${width},${height - points[0]}`;
  const step = width / (points.length - 1);
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${(step * index).toFixed(2)},${(height - point).toFixed(2)}`)
    .join(' ');
}

function normalizePoints(values, maxHeight = 90) {
  if (!values.length) return [];
  const max = Math.max(1, ...values);
  return values.map((value) => (Number(value || 0) / max) * maxHeight);
}

export default function ProviderAnalyticsPage() {
  const { accessToken } = useAuth();
  const [periodMonths, setPeriodMonths] = useState(6);
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadAnalytics() {
      if (!accessToken) return;
      setLoading(true);
      setError('');
      try {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const response = await apiRequest(`/providers/analytics?periodMonths=${periodMonths}`, { headers });
        if (!mounted) return;
        setAnalytics(response?.data || EMPTY_ANALYTICS);
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError.message || 'Failed to load analytics');
        setAnalytics(EMPTY_ANALYTICS);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadAnalytics();
    return () => {
      mounted = false;
    };
  }, [accessToken, periodMonths]);

  const completionValues = useMemo(
    () => (Array.isArray(analytics?.trends?.completion) ? analytics.trends.completion.map((item) => Number(item.value || 0)) : []),
    [analytics?.trends?.completion]
  );
  const earningsValues = useMemo(
    () => (Array.isArray(analytics?.trends?.earnings) ? analytics.trends.earnings.map((item) => Number(item.value || 0)) : []),
    [analytics?.trends?.earnings]
  );
  const ratingValues = useMemo(
    () => (Array.isArray(analytics?.trends?.rating) ? analytics.trends.rating.map((item) => Number(item.value || 0)) : []),
    [analytics?.trends?.rating]
  );

  const completionPoints = useMemo(() => normalizePoints(completionValues, 75), [completionValues]);
  const earningsPoints = useMemo(() => normalizePoints(earningsValues, 90), [earningsValues]);
  const ratingPoints = useMemo(() => normalizePoints(ratingValues, 90), [ratingValues]);

  const completionPath = useMemo(() => buildPath(completionPoints), [completionPoints]);
  const completionAreaPath = useMemo(() => (completionPath ? `M0,100 ${completionPath.slice(1)} L100,100 Z` : ''), [completionPath]);
  const earningsPath = useMemo(() => buildPath(earningsPoints), [earningsPoints]);
  const earningsAreaPath = useMemo(() => (earningsPath ? `M0,100 ${earningsPath.slice(1)} L100,100 Z` : ''), [earningsPath]);

  const monthLabels = useMemo(
    () => (Array.isArray(analytics?.trends?.completion) ? analytics.trends.completion.map((item) => item.label) : []),
    [analytics?.trends?.completion]
  );

  const summary = analytics?.summary || EMPTY_ANALYTICS.summary;
  const latestEarnings = earningsValues.length ? earningsValues[earningsValues.length - 1] : 0;

  return (
    <div className="p-8 max-w-[1440px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Performance Analytics</h1>
          <p className="text-slate-500 text-sm">Live performance trends and earnings insights from your account activity.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            className={`px-4 py-2 text-sm font-semibold rounded-lg ${periodMonths === 6 ? 'bg-white text-[#2F4DA0] shadow-sm' : 'text-slate-500'}`}
            type="button"
            onClick={() => setPeriodMonths(6)}
          >
            Last 6 Months
          </button>
          <button
            className={`px-4 py-2 text-sm font-semibold rounded-lg ${periodMonths === 12 ? 'bg-white text-[#2F4DA0] shadow-sm' : 'text-slate-500'}`}
            type="button"
            onClick={() => setPeriodMonths(12)}
          >
            Last 12 Months
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-5 w-40" />
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-white p-5 rounded-[16px] shadow-sm border border-slate-50 space-y-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-40" />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!loading ? (
        <>
          <section className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <MetricCard
              label="Average Rating"
              value={Number(summary.averageRating || 0).toFixed(1)}
              suffix="/ 5.0"
              icon="star"
              iconClass="bg-yellow-50 text-yellow-500"
              meta={`Based on ${summary.completedJobs || 0} completed jobs`}
            />
            <MetricCard
              label="Response Time"
              value={Number(summary.avgResponseTimeMinutes || 0).toFixed(0)}
              suffix=" mins"
              icon="schedule"
              iconClass="bg-blue-50 text-[#2F4DA0]"
              meta={`Efficiency ${Number(summary.responseEfficiency || 0).toFixed(0)}%`}
            />
            <MetricCard
              label="Success Rate"
              value={Number(summary.successRate || 0).toFixed(1)}
              suffix="%"
              icon="check_circle"
              iconClass="bg-emerald-50 text-emerald-500"
              meta={`${summary.completedJobs || 0} completed / ${summary.totalJobs || 0} total`}
            />
            <MetricCard
              label="Latest Monthly Earnings"
              value={toCurrency(latestEarnings)}
              icon="payments"
              iconClass="bg-indigo-50 text-indigo-500"
              meta={`Repeat clients ${Number(summary.repeatClientRate || 0).toFixed(1)}%`}
            />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <article className="xl:col-span-8 bg-white p-6 rounded-[16px] shadow-sm border border-slate-50">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold">Job Completion Trend</h3>
                  <p className="text-xs text-slate-400">Completed jobs by month</p>
                </div>
              </div>
              <div className="relative h-[320px] border-l border-b border-slate-100 overflow-hidden">
                <div className="absolute inset-0 grid grid-cols-[repeat(10,1fr)] grid-rows-[repeat(7,1fr)] opacity-80">
                  {Array.from({ length: 70 }).map((_, index) => (
                    <div key={index} className="border-r border-b border-slate-100" />
                  ))}
                </div>
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="completionFill" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#2F4DA0" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#2F4DA0" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  {completionAreaPath ? <path d={completionAreaPath} fill="url(#completionFill)" /> : null}
                  {completionPath ? <path d={completionPath} fill="none" stroke="#2F4DA0" strokeWidth="2.5" strokeLinecap="round" /> : null}
                </svg>
              </div>
              <div className="flex justify-between mt-4 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                {(monthLabels.length ? monthLabels : ['No data']).map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            </article>

            <div className="xl:col-span-4 space-y-6">
              <article className="bg-white p-6 rounded-[16px] shadow-sm border border-slate-50">
                <h3 className="text-lg font-bold mb-6">Rating Trend</h3>
                <div className="h-[164px] flex items-end gap-3 mb-4">
                  {(ratingPoints.length ? ratingPoints : [60, 65, 70, 75, 80, 85]).map((point, index) => (
                    <div
                      key={`rating-${index}`}
                      className={`flex-1 rounded-t-sm ${index === (ratingPoints.length || 6) - 1 ? 'bg-[#2F4DA0]' : 'bg-slate-200'}`}
                      style={{ height: `${Math.max(10, point)}%` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  {(monthLabels.length ? monthLabels : ['-', '-', '-', '-', '-', '-']).map((label, index) => (
                    <span key={`${label}-${index}`}>{label}</span>
                  ))}
                </div>
              </article>

              <article className="bg-white p-6 rounded-[16px] shadow-sm border border-slate-50">
                <h3 className="text-lg font-bold mb-6">Earnings Trend</h3>
                <div className="relative h-[180px] overflow-hidden border border-slate-100 rounded-xl bg-slate-50/50">
                  <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <defs>
                      <linearGradient id="earningsFillAnalytics" x1="0%" x2="0%" y1="0%" y2="100%">
                        <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    {earningsAreaPath ? <path d={earningsAreaPath} fill="url(#earningsFillAnalytics)" /> : null}
                    {earningsPath ? <path d={earningsPath} fill="none" stroke="#4F46E5" strokeWidth="2.4" strokeLinecap="round" /> : null}
                  </svg>
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Total jobs: <span className="font-semibold text-slate-800">{summary.totalJobs || 0}</span> | Cancelled rate:{' '}
                  <span className="font-semibold text-slate-800">{Number(summary.cancelledRate || 0).toFixed(1)}%</span>
                </p>
              </article>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value, suffix = '', icon, iconClass, meta }) {
  return (
    <article className="bg-white p-5 rounded-[16px] shadow-sm border border-slate-50">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconClass}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
      </div>
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-baseline gap-1.5 mb-4">
        <h2 className="text-3xl leading-none font-bold">{value}</h2>
        {suffix ? <span className="text-slate-400 text-sm">{suffix}</span> : null}
      </div>
      <p className="text-xs text-slate-400">{meta}</p>
    </article>
  );
}

