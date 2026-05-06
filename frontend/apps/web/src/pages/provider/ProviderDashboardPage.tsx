import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api.ts';
import { useAuth } from '../../lib/auth-context.tsx';
import Skeleton from '../../components/Skeleton.tsx';

function toCurrency(value) {
  return `LKR ${Number(value || 0).toLocaleString()}`;
}

function timeAgo(iso) {
  if (!iso) return 'Recently';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(ms / 60000));
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  return 'Yesterday';
}

function buildTrendPath(points, width = 800, height = 200) {
  if (!points.length) return '';
  if (points.length === 1) return `M0,${height - points[0]} L${width},${height - points[0]}`;
  const step = width / (points.length - 1);
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${(step * index).toFixed(2)},${(height - point).toFixed(2)}`)
    .join(' ');
}

export default function ProviderDashboardPage() {
  const { accessToken } = useAuth();
  const [dashboard, setDashboard] = useState({
    pending: 0,
    ongoing: 0,
    completed: 0,
    rating: 0,
    earnings: 0,
    latestAddedAmount: 0,
    earningsContributionPercent: 0,
    successRate: 0,
  });
  const [earningsTrend, setEarningsTrend] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  const badgeAccentClasses = useMemo(
    () => ({
      yellow: 'bg-yellow-50 text-yellow-500 border-yellow-100',
      blue: 'bg-blue-50 text-[#2F4DA0] border-blue-100',
      orange: 'bg-orange-50 text-orange-500 border-orange-100',
      emerald: 'bg-emerald-50 text-emerald-500 border-emerald-100',
      purple: 'bg-purple-50 text-purple-500 border-purple-100',
      slate: 'bg-slate-50 text-slate-500 border-slate-100',
    }),
    []
  );

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!accessToken) {
        if (mounted) setLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${accessToken}` };
      setLoading(true);
      try {
        const [dashboardRes, suggestionsRes, badgeRes, earningsRes] = await Promise.all([
          apiRequest('/providers/dashboard', { headers }),
          apiRequest('/providers/suggestions', { headers }),
          apiRequest('/providers/badges', { headers }).catch(() => ({ data: { active: [] } })),
          apiRequest('/providers/earnings?page=1&limit=1&periodMonths=6', { headers }).catch(() => ({ data: { summary: { trend: [] } } })),
        ]);
        if (!mounted) return;
        setDashboard(
          dashboardRes?.data || {
            pending: 0,
            ongoing: 0,
            completed: 0,
            rating: 0,
            earnings: 0,
            latestAddedAmount: 0,
            earningsContributionPercent: 0,
            successRate: 0,
          }
        );
        setSuggestions(Array.isArray(suggestionsRes?.data) ? suggestionsRes.data.slice(0, 2) : []);
        setBadges(Array.isArray(badgeRes?.data?.active) ? badgeRes.data.active.slice(0, 3) : []);
        setEarningsTrend(Array.isArray(earningsRes?.data?.summary?.trend) ? earningsRes.data.summary.trend : []);
      } catch {
        if (!mounted) return;
        setSuggestions([]);
        setBadges([]);
        setEarningsTrend([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [accessToken]);

  const chartPoints = useMemo(() => {
    const points = Array.isArray(earningsTrend) ? earningsTrend.map((item) => Number(item.amount || 0)) : [];
    const maxValue = Math.max(1, ...points);
    return points.map((value) => (value / maxValue) * 150 + 20);
  }, [earningsTrend]);
  const chartPath = useMemo(() => buildTrendPath(chartPoints), [chartPoints]);
  const chartLabels = useMemo(() => (Array.isArray(earningsTrend) ? earningsTrend.map((item) => item.label) : []), [earningsTrend]);

  const summaryCards = useMemo(() => [
    {
      label: 'Total Earnings',
      value: toCurrency(dashboard.earnings),
      sub: 'Lifetime revenue from services',
      detail: dashboard.latestAddedAmount > 0 ? `Last added ${toCurrency(dashboard.latestAddedAmount)}` : '',
      extra: `${Number(dashboard.earningsContributionPercent || 0).toFixed(1)}%`,
    },
    {
      label: 'Completed Jobs',
      value: String(dashboard.completed || 0),
      sub: 'Updated recently',
    },
    {
      label: 'Average Rating',
      value: Number(dashboard.rating || 0).toFixed(1),
      sub: 'Based on customer reviews',
      star: true,
    },
    {
      label: 'Success Rate',
      value: `${Number(dashboard.successRate || 0).toFixed(1)}%`,
      sub: '',
      withBar: true,
      barWidth: `${Math.max(0, Math.min(100, Number(dashboard.successRate || 0)))}%`,
    },
  ], [dashboard]);

  return (
    <div className="p-8 max-w-[1440px] mx-auto space-y-8">
      <div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Provider Dashboard</h1>
          <p className="text-slate-500 text-sm">Welcome back, here&apos;s what&apos;s happening with your services today.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {loading ? Array.from({ length: 4 }).map((_, index) => (
          <div className="bg-white p-5 rounded-[16px] shadow-sm border border-slate-50 space-y-3" key={`summary-skeleton-${index}`}>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        )) : summaryCards.map((card) => (
          <div className="bg-white p-5 rounded-[16px] shadow-sm border border-slate-50" key={card.label}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.label}</p>
              {card.extra ? <span className="text-emerald-500 text-xs font-bold">{card.extra}</span> : null}
            </div>
            <div className="flex items-center gap-1.5">
              <p className="text-xl font-bold">{card.value}</p>
              {card.star ? <span className="text-yellow-400 material-symbols-outlined text-lg">star</span> : null}
            </div>
            {card.sub ? <p className="text-[10px] text-slate-400 mt-4 italic">{card.sub}</p> : null}
            {card.detail ? <p className="text-[10px] text-slate-500 mt-1">{card.detail}</p> : null}
            {card.withBar ? (
              <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: card.barWidth }} />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? Array.from({ length: 3 }).map((_, index) => (
          <div className="bg-white p-6 rounded-[16px] shadow-sm border border-slate-50 space-y-3" key={`status-skeleton-${index}`}>
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        )) : (
          <>
            <StatusCard label="Pending" value={String(dashboard.pending || 0).padStart(2, '0')} color="orange" icon="hourglass_empty" />
            <StatusCard label="Ongoing" value={String(dashboard.ongoing || 0).padStart(2, '0')} color="blue" icon="sync" />
            <StatusCard label="Completed" value={String(dashboard.completed || 0)} color="emerald" icon="task_alt" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-8">
          <section className="bg-white p-6 rounded-[16px] shadow-sm border border-slate-50">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold">Earnings Performance</h3>
                <p className="text-xs text-slate-400">Monthly revenue trend (last 6 months)</p>
              </div>
              <span className="text-xs font-semibold text-slate-600 bg-slate-50 rounded-lg px-3 py-2">Live Data</span>
            </div>

            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-64 w-full rounded-xl" />
                <div className="flex justify-between gap-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={`chart-label-${index}`} className="h-3 w-10" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="h-64 relative flex items-end justify-between gap-4 px-2">
                  {chartPoints.map((point, index, list) => (
                    <div
                      key={`bar-${index}`}
                      className={`flex-1 rounded-t-lg ${index === list.length - 2 ? 'bg-[#2F4DA0]' : 'bg-slate-100'}`}
                      style={{ height: `${Math.max(10, (point / 200) * 100)}%` }}
                    />
                  ))}
                  {!chartPoints.length ? (
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-400">
                      No earnings trend available yet.
                    </div>
                  ) : null}

                  <div className="absolute bottom-0 left-0 right-0 h-full pointer-events-none">
                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 200">
                      {chartPath ? (
                        <path
                          d={chartPath}
                          fill="none"
                          stroke="#2F4DA0"
                          strokeLinecap="round"
                          strokeWidth="3"
                        />
                      ) : null}
                    </svg>
                  </div>
                </div>
                <div className="flex justify-between mt-4 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {chartLabels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Suggested Jobs</h2>
              <Link className="text-[#2F4DA0] text-sm font-semibold hover:underline" to="/provider/browse-jobs">Browse All</Link>
            </div>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div className="bg-white p-5 rounded-[16px] shadow-sm border border-slate-50 space-y-3" key={`suggestion-skeleton-${index}`}>
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : suggestions.length ? (
              <div className="space-y-4">
                {suggestions.map((job) => (
                <SuggestedJob
                  key={job._id}
                  icon={String(job.category || '').toLowerCase().includes('ac') ? 'error' : 'bolt'}
                  iconClass={String(job.category || '').toLowerCase().includes('ac') ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-[#2F4DA0]'}
                  title={job.title || 'Untitled Job'}
                  tag={String(job.createdAt || '').length ? 'NEW' : ''}
                  tagClass="bg-blue-100 text-blue-600"
                  location={[job?.customerId?.city, job?.customerId?.district].filter(Boolean).join(', ') || 'Sri Lanka'}
                  time={timeAgo(job.createdAt)}
                  budget={toCurrency(job.price)}
                />
                ))}
              </div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-[16px] p-6 text-sm text-slate-500">
                No suggested jobs available right now.
              </div>
            )}
          </section>
        </div>

        <div className="xl:col-span-4 space-y-8">
          <section className="bg-white p-6 rounded-[16px] shadow-sm border border-slate-50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold">Your Badges</h3>
              <Link className="text-xs font-semibold text-[#2F4DA0]" to="/provider/badges">View All</Link>
            </div>
            {loading ? (
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div className="flex flex-col items-center gap-3" key={`badge-skeleton-${index}`}>
                    <Skeleton className="w-16 h-16 rounded-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            ) : badges.length ? (
              <div className="grid grid-cols-3 gap-4">
                {badges.map((item) => (
                <Badge
                  key={item?.code || item?.name}
                  icon={item?.icon || 'workspace_premium'}
                  iconClass={badgeAccentClasses[item?.accent] || badgeAccentClasses.slate}
                  label={item?.name || 'Badge'}
                />
              ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                No active badges yet. Complete jobs and improve performance to unlock badges.
              </div>
            )}
          </section>

          <section className="bg-white p-5 rounded-[16px] shadow-sm border border-slate-50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-500">help_outline</span>
              </div>
              <div>
                <h4 className="text-sm font-bold">Need assistance?</h4>
                <p className="text-[10px] text-slate-400">Our support team is online</p>
              </div>
            </div>
            <button className="w-full border border-slate-200 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors" type="button">
              Open Support Chat
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ label, value, color, icon }) {
  const map = {
    orange: { border: 'border-orange-400', iconWrap: 'bg-orange-50 text-orange-500' },
    blue: { border: 'border-blue-500', iconWrap: 'bg-blue-50 text-blue-500' },
    emerald: { border: 'border-emerald-500', iconWrap: 'bg-emerald-50 text-emerald-500' },
  };
  const current = map[color] || map.blue;

  return (
    <div className={`bg-white p-5 rounded-[16px] shadow-sm border border-slate-50 border-l-4 ${current.border} flex items-center justify-between`}>
      <div>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <div className={`p-2 rounded-lg ${current.iconWrap}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
    </div>
  );
}

function SuggestedJob({ icon, iconClass, title, tag, tagClass, location, time, budget }) {
  return (
    <article className="bg-white p-5 rounded-[16px] shadow-sm border border-slate-50 flex items-center justify-between group cursor-pointer hover:border-[#2F4DA0] transition-colors">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconClass}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold">{title}</h4>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${tagClass}`}>{tag}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">location_on</span>{location}</span>
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">schedule</span>{time}</span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-[#2F4DA0]">{budget}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase">Budget</p>
      </div>
    </article>
  );
}

function Badge({ icon, iconClass, label }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${iconClass}`}>
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
      <span className="text-[10px] font-bold text-slate-600 uppercase text-center">{label}</span>
    </div>
  );
}

