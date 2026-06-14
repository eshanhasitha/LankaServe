import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api.ts';
import { useAuth } from '../../lib/auth-context.tsx';
import Skeleton from '../../components/Skeleton.tsx';

function toCurrency(value: number | string) {
  return `LKR ${Number(value || 0).toLocaleString()}`;
}

function timeAgo(iso: string) {
  if (!iso) return 'Recently';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(ms / 60000));
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  return 'Yesterday';
}

function buildTrendPath(points: number[], width = 800, height = 200) {
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
      yellow: 'bg-amber-50 text-amber-600 border-amber-100',
      blue: 'bg-blue-50 text-[#2F4DA0] border-blue-100',
      orange: 'bg-orange-50 text-orange-600 border-orange-100',
      emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      purple: 'bg-purple-50 text-purple-600 border-purple-100',
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
        setSuggestions(Array.isArray(suggestionsRes?.data) ? suggestionsRes.data.slice(0, 3) : []);
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
    const points = Array.isArray(earningsTrend) ? earningsTrend.map((item: any) => Number(item.amount || 0)) : [];
    const maxValue = Math.max(1, ...points);
    return points.map((value) => (value / maxValue) * 140 + 15);
  }, [earningsTrend]);
  const chartPath = useMemo(() => buildTrendPath(chartPoints), [chartPoints]);
  const chartLabels = useMemo(() => (Array.isArray(earningsTrend) ? earningsTrend.map((item: any) => item.label) : []), [earningsTrend]);

  const summaryCards = useMemo(() => [
    {
      label: 'Total Earnings',
      value: toCurrency(dashboard.earnings),
      icon: 'payments',
      iconClass: 'bg-blue-50 text-[#2F4DA0]',
      detail: dashboard.latestAddedAmount > 0 ? `Last payout: ${toCurrency(dashboard.latestAddedAmount)}` : 'No recent updates',
      extra: `${Number(dashboard.earningsContributionPercent || 0).toFixed(1)}%`,
    },
    {
      label: 'Completed Jobs',
      value: String(dashboard.completed || 0),
      icon: 'assignment_turned_in',
      iconClass: 'bg-emerald-50 text-emerald-600',
      detail: 'Escrow milestones fully cleared',
    },
    {
      label: 'Average Rating',
      value: Number(dashboard.rating || 0).toFixed(1),
      icon: 'grade',
      iconClass: 'bg-amber-50 text-amber-500',
      detail: 'Based on customer reviews',
      star: true,
    },
    {
      label: 'Success Rate',
      value: `${Number(dashboard.successRate || 0).toFixed(1)}%`,
      icon: 'analytics',
      iconClass: 'bg-purple-50 text-purple-600',
      withBar: true,
      barWidth: `${Math.max(5, Math.min(100, Number(dashboard.successRate || 0)))}%`,
    },
  ], [dashboard]);

  return (
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto space-y-8 font-['Inter']">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Provider Hub</h1>
          <p className="text-slate-400 text-sm font-medium mt-0.5">Welcome back, track your incoming service requests and active wallet milestones.</p>
        </div>
        <Link to="/provider/browse-jobs" className="inline-flex h-11 items-center justify-center bg-[#2F4DA0] hover:bg-blue-800 text-white text-xs font-bold tracking-wider uppercase px-5 rounded-xl transition-all shadow-sm active:scale-98">
          Browse Open Requests
        </Link>
      </div>

      {/* Grid of Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? Array.from({ length: 4 }).map((_, index) => (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-3" key={`summary-skeleton-${index}`}>
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        )) : summaryCards.map((card) => (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col justify-between group hover:border-slate-300 transition-all duration-200" key={card.label}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{card.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.iconClass}`}>
                  <span className="material-symbols-outlined text-base font-bold">{card.icon}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <p className="text-2xl font-black text-slate-900 tracking-tight">{card.value}</p>
                {card.star && <span className="text-amber-400 material-symbols-outlined text-lg">star</span>}
              </div>
            </div>
            {card.detail && <p className="text-xs font-medium text-slate-400 mt-4">{card.detail}</p>}
            {card.withBar && (
              <div className="mt-5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: card.barWidth }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dynamic Progress Counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? Array.from({ length: 3 }).map((_, index) => (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-3" key={`status-skeleton-${index}`}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-12" />
          </div>
        )) : (
          <>
            <StatusCard label="Assigned & Pending" value={String(dashboard.pending || 0).padStart(2, '0')} color="orange" icon="hourglass_empty" />
            <StatusCard label="Active In Progress" value={String(dashboard.ongoing || 0).padStart(2, '0')} color="blue" icon="sync" />
            <StatusCard label="Total Disbursed" value={String(dashboard.completed || 0).padStart(2, '0')} color="emerald" icon="task_alt" />
          </>
        )}
      </div>

      {/* Main Container Partition Block */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-8">
          <section className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-base font-bold text-slate-900">Earnings Performance</h3>
                <p className="text-xs font-medium text-slate-400 mt-0.5">Bi-weekly clearing trends from local verification nodes</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md px-2.5 py-1 uppercase tracking-wider">Secure Escrow</span>
            </div>

            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            ) : (
              <>
                <div className="h-60 relative flex items-end justify-between gap-3 px-2">
                  {chartPoints.map((point, index, list) => (
                    <div
                      key={`bar-${index}`}
                      className={`flex-1 rounded-t-md transition-all duration-300 ${index === list.length - 1 ? 'bg-[#2F4DA0]' : 'bg-slate-100 group-hover:bg-slate-200'}`}
                      style={{ height: `${Math.max(8, (point / 200) * 100)}%` }}
                    />
                  ))}
                  {!chartPoints.length && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-400 italic">
                      No balance trend lines available yet.
                    </div>
                  )}

                  <div className="absolute inset-0 h-full w-full pointer-events-none">
                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 200">
                      {chartPath && (
                        <path
                          d={chartPath}
                          fill="none"
                          stroke="#2F4DA0"
                          strokeLinecap="round"
                          strokeWidth="2.5"
                        />
                      )}
                    </svg>
                  </div>
                </div>
                <div className="flex justify-between mt-4 px-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  {chartLabels.map((label) => <span key={label}>{label}</span>)}
                </div>
              </>
            )}
          </section>

          {/* Job Alerts Allocation Feed */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Suggested Requests</h2>
                <p className="text-xs font-medium text-slate-400">Tasks corresponding with your profile parameters</p>
              </div>
              <Link className="text-[#2F4DA0] text-xs font-bold uppercase tracking-wider hover:underline" to="/provider/browse-jobs">View All</Link>
            </div>
            
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3" key={`suggestion-skeleton-${index}`}>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))}
              </div>
            ) : suggestions.length ? (
              <div className="grid grid-cols-1 gap-4">
                {suggestions.map((job: any) => {
                  const categoryLower = String(job.category || '').toLowerCase();
                  let iconStr = 'bolt';
                  let iconColorClass = 'bg-blue-50 text-[#2F4DA0]';
                  
                  if (categoryLower.includes('plumb')) {
                    iconStr = 'water_drop';
                    iconColorClass = 'bg-cyan-50 text-cyan-600';
                  } else if (categoryLower.includes('ac') || categoryLower.includes('air')) {
                    iconStr = 'ac_unit';
                    iconColorClass = 'bg-teal-50 text-teal-600';
                  } else if (categoryLower.includes('carp') || categoryLower.includes('wood')) {
                    iconStr = 'carpenter';
                    iconColorClass = 'bg-amber-50 text-amber-700';
                  }

                  return (
                    <SuggestedJob
                      key={job._id}
                      jobId={job._id}
                      icon={iconStr}
                      iconClass={iconColorClass}
                      title={job.title || 'Untitled Job'}
                      tag={job.status || 'NEW'}
                      tagClass="bg-blue-50 text-[#2F4DA0] border border-blue-100"
                      location={[job?.customerId?.city, job?.customerId?.district].filter(Boolean).join(', ') || 'Sri Lanka'}
                      time={timeAgo(job.createdAt)}
                      budget={toCurrency(job.price)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border border-slate-200/60 rounded-2xl p-6 text-xs font-medium text-slate-400 text-center italic">
                No local leads matching your category range right now.
              </div>
            )}
          </section>
        </div>

        {/* Badges / Sidebar Support Modules */}
        <div className="xl:col-span-4 space-y-6">
          <section className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-bold text-slate-900 tracking-tight">Earned Badges</span>
              <Link className="text-xs font-bold text-[#2F4DA0] hover:underline" to="/provider/badges">View All</Link>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div className="flex flex-col items-center gap-2" key={`badge-skeleton-${index}`}>
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))}
              </div>
            ) : badges.length ? (
              <div className="grid grid-cols-3 gap-4">
                {badges.map((item: any) => (
                  <Badge
                    key={item?.code || item?.name}
                    icon={item?.icon || 'workspace_premium'}
                    iconClass={badgeAccentClasses[item?.accent] || badgeAccentClasses.slate}
                    label={item?.name || 'Badge'}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-5 text-xs font-semibold text-slate-400 text-center leading-normal">
                No active badges milestones yet. Complete verified scans to unlock items.
              </div>
            )}
          </section>

          {/* ☀️ Fixed Style: Clean Light White & Blue Assistant Card Section */}
          <section className="bg-white p-6 rounded-2xl text-slate-900 border-2 border-[#2F4DA0]/30 shadow-xs relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 text-[#2F4DA0]/5 font-bold pointer-events-none select-none">
              <span className="material-symbols-outlined text-8xl">contact_support</span>
            </div>
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#2F4DA0]/5 border border-[#2F4DA0]/10 flex items-center justify-center shrink-0 text-[#2F4DA0]">
                <span className="material-symbols-outlined text-xl font-bold">help_center</span>
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 tracking-tight">Need Assistance?</h4>
                <p className="text-xs text-slate-400 font-medium mt-0.5 leading-normal">LankaServe validation moderation desk is open.</p>
              </div>
            </div>
            <Link className="block w-full bg-[#2F4DA0] hover:bg-blue-800 text-white font-black py-2.5 rounded-xl text-center text-xs tracking-wider uppercase transition-all shadow-3xs border-none active:scale-98" to="/provider/help-center">
              Open Support Terminal
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  const map: any = {
    orange: { border: 'border-orange-500', iconWrap: 'bg-orange-50 text-orange-600' },
    blue: { border: 'border-blue-500', iconWrap: 'bg-blue-50 text-blue-600' },
    emerald: { border: 'border-emerald-500', iconWrap: 'bg-emerald-50 text-emerald-600' },
  };
  const current = map[color] || map.blue;

  return (
    <div className={`bg-white p-5 rounded-2xl border border-slate-200/60 border-l-4 ${current.border} shadow-2xs flex items-center justify-between`}>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-2xl font-black text-slate-900 tracking-tight font-mono">{value}</p>
      </div>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${current.iconWrap}`}>
        <span className="material-symbols-outlined text-base font-bold">{icon}</span>
      </div>
    </div>
  );
}

function SuggestedJob({ jobId, icon, iconClass, title, tag, tagClass, location, time, budget }: any) {
  const content = (
    <article className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs flex items-center justify-between group cursor-pointer hover:border-[#2F4DA0] transition-colors duration-200">
      <div className="flex items-center gap-4 min-w-0">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconClass} border border-slate-100`}>
          <span className="material-symbols-outlined text-base font-bold">{icon}</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-slate-900 text-sm truncate">{title}</h4>
            <span className={`text-[8px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md shrink-0 ${tagClass}`}>{tag}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">location_on</span>{location}</span>
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">schedule</span>{time}</span>
          </div>
        </div>
      </div>
      <div className="text-right shrink-0 pl-3">
        <p className="font-black text-[#2F4DA0] text-sm tracking-tight">{budget}</p>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Locked Escrow</p>
      </div>
    </article>
  );

  return jobId ? <Link className="block" to={`/provider/jobs/${jobId}`}>{content}</Link> : content;
}

function Badge({ icon, iconClass, label }: any) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center border border-slate-200/60 shadow-3xs ${iconClass}`}>
        <span className="material-symbols-outlined text-lg font-bold">{icon}</span>
      </div>
      <span className="text-[9px] font-bold text-slate-500 uppercase text-center tracking-tight line-clamp-1">{label}</span>
    </div>
  );
}