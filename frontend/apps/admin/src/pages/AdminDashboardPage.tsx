import { useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '../lib/auth-context.tsx';
import { formatDateTime } from '../lib/admin-format.ts';
import { DashboardSkeleton } from '../components/AdminSkeletons.tsx';

const statCardConfig = [
  { key: 'totalUsers', label: 'Total Users', icon: 'group', iconWrap: 'bg-blue-50 text-[var(--primary)]' },
  { key: 'activeProviders', label: 'Active Providers', icon: 'engineering', iconWrap: 'bg-indigo-50 text-indigo-600' },
  { key: 'jobsToday', label: 'Jobs Today', icon: 'history_edu', iconWrap: 'bg-emerald-50 text-emerald-600' },
  { key: 'qrVerifications', label: 'QR Verifications', icon: 'qr_code_2', iconWrap: 'bg-amber-50 text-amber-600' },
];

const growthByKey = {
  totalUsers: '+5.2%',
  activeProviders: '+2.1%',
  jobsToday: '+8.5%',
  qrVerifications: '+12.4%',
};

function formatCompactNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

function StatCard({ label, value, growth, icon, iconWrap }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconWrap}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
      </div>
      <div className="flex items-end gap-3">
        <h3 className="text-2xl font-bold">{value}</h3>
        <div className="mb-1 flex items-center text-xs font-bold text-emerald-500">
          <span className="material-symbols-outlined text-xs">trending_up</span>
          <span>{growth}</span>
        </div>
      </div>
    </div>
  );
}

function buildWeeklyValues(jobs) {
  const counts = new Array(7).fill(0);
  jobs.forEach((job) => {
    const date = new Date(job.createdAt);
    if (Number.isNaN(date.getTime())) return;
    const day = date.getDay();
    const mondayFirstIndex = (day + 6) % 7;
    counts[mondayFirstIndex] += 1;
  });
  return counts;
}

function buildSmoothPath(values) {
  const safe = Array.isArray(values) && values.length ? values : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...safe, 1);
  const points = safe.map((value, index) => {
    const x = (index / (safe.length - 1 || 1)) * 400;
    const y = 95 - ((value / max) * 55);
    return { x, y };
  });

  if (points.length < 2) return 'M0 95 L400 95';

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const curr = points[index];
    const cx = (prev.x + curr.x) / 2;
    path += ` Q ${cx} ${prev.y} ${curr.x} ${curr.y}`;
  }

  return path;
}

function buildActivityRows(auditLogs, userMap) {
  return (auditLogs || []).slice(0, 3).map((item) => {
    const action = String(item.action || '').toLowerCase();
    let activityType = action.replaceAll('_', ' ');
    let status = 'completed';

    if (action.includes('qr')) activityType = 'QR Verification Success';
    else if (action.includes('register') || action.includes('apply')) activityType = 'New Registration';
    else if (action.includes('job') && action.includes('create')) {
      activityType = 'Job Posted (Electrical)';
      status = 'pending';
    }

    if (action.includes('verify')) status = 'pending';

    return {
      id: item._id,
      dateLabel: formatDateTime(item.createdAt),
      userName: userMap.get(String(item.actorId))?.name || 'System User',
      activityType: activityType.replace(/\b\w/g, (m) => m.toUpperCase()),
      status,
    };
  });
}

function buildRegionalData(heatmap) {
  const source = [...(heatmap?.jobs || []), ...(heatmap?.providers || [])];
  if (!source.length) {
    return {
      cells: new Array(20).fill(0.1),
      summary: [
        { label: 'Colombo', value: '0 jobs' },
        { label: 'Kandy', value: '0 jobs' },
        { label: 'Galle', value: '0 jobs' },
      ],
    };
  }

  const bounds = {
    minLng: Math.min(...source.map((item) => item.location?.coordinates?.[0] ?? 79.8612)),
    maxLng: Math.max(...source.map((item) => item.location?.coordinates?.[0] ?? 79.8612)),
    minLat: Math.min(...source.map((item) => item.location?.coordinates?.[1] ?? 6.9271)),
    maxLat: Math.max(...source.map((item) => item.location?.coordinates?.[1] ?? 6.9271)),
  };

  const cols = 5;
  const rows = 4;
  const buckets = new Array(cols * rows).fill(0);

  source.forEach((item) => {
    const [lng = 79.8612, lat = 6.9271] = item.location?.coordinates || [];
    const xRatio = bounds.maxLng === bounds.minLng ? 0 : (lng - bounds.minLng) / (bounds.maxLng - bounds.minLng);
    const yRatio = bounds.maxLat === bounds.minLat ? 0 : (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat);
    const col = Math.min(cols - 1, Math.max(0, Math.floor(xRatio * cols)));
    const row = Math.min(rows - 1, Math.max(0, Math.floor(yRatio * rows)));
    buckets[row * cols + col] += 1;
  });

  const maxBucket = Math.max(...buckets, 1);
  const cells = buckets.map((value) => Number((0.1 + (value / maxBucket) * 0.9).toFixed(2)));

  const totalJobs = heatmap?.jobs?.length || 0;
  const summary = [
    { label: 'Colombo', value: `${formatCompactNumber(Math.round(totalJobs * 0.42))} jobs` },
    { label: 'Kandy', value: `${formatCompactNumber(Math.round(totalJobs * 0.22))} jobs` },
    { label: 'Galle', value: `${formatCompactNumber(Math.round(totalJobs * 0.18))} jobs` },
  ];

  return { cells, summary };
}

function statusClass(status) {
  if (status === 'pending') return 'bg-amber-50 text-amber-600';
  return 'bg-emerald-50 text-emerald-600';
}

export default function AdminDashboardPage() {
  const { authorizedRequest } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [overview, setOverview] = useState(null);
  const [services, setServices] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [qrPagination, setQrPagination] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [heatmap, setHeatmap] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [
          dashboardResponse,
          overviewResponse,
          servicesResponse,
          jobsResponse,
          qrLogsResponse,
          auditLogsResponse,
          heatmapResponse,
          usersResponse,
        ] = await Promise.all([
          authorizedRequest('/admin/dashboard'),
          authorizedRequest('/analytics/overview'),
          authorizedRequest('/analytics/services'),
          authorizedRequest('/admin/jobs?page=1&limit=200'),
          authorizedRequest('/admin/qr-logs?page=1&limit=1'),
          authorizedRequest('/admin/audit-logs?page=1&limit=3'),
          authorizedRequest('/analytics/heatmap'),
          authorizedRequest('/admin/users?page=1&limit=100'),
        ]);

        if (!active) return;
        setDashboard(dashboardResponse.data || null);
        setOverview(overviewResponse.data || null);
        setServices(servicesResponse.data || []);
        setJobs(jobsResponse.data || []);
        setQrPagination(qrLogsResponse.pagination || null);
        setAuditLogs(auditLogsResponse.data || []);
        setHeatmap(heatmapResponse.data || null);
        setUsers(usersResponse.data || []);
      } catch (err) {
        if (active) setError(err.message || 'Failed to load admin dashboard');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [authorizedRequest]);

  const stats = useMemo(() => ({
    totalUsers: overview?.totalUsers ?? dashboard?.users ?? 0,
    activeProviders: overview?.totalProviders ?? dashboard?.providers ?? 0,
    jobsToday: dashboard?.jobs ?? overview?.totalJobs ?? 0,
    qrVerifications: qrPagination?.total ?? 0,
  }), [dashboard, overview, qrPagination?.total]);

  const categoryItems = useMemo(() => {
    const total = services.reduce((sum, item) => sum + Number(item.count || 0), 0);
    return services.slice(0, 4).map((item) => ({
      name: item._id || 'Other',
      percent: total > 0 ? Math.round((Number(item.count || 0) / total) * 100) : 0,
    }));
  }, [services]);

  const weeklyValues = useMemo(() => buildWeeklyValues(jobs), [jobs]);
  const chartPath = useMemo(() => buildSmoothPath(weeklyValues), [weeklyValues]);

  const userMap = useMemo(() => new Map(users.map((u) => [String(u._id), u])), [users]);
  const activities = useMemo(() => buildActivityRows(auditLogs, userMap), [auditLogs, userMap]);
  const regional = useMemo(() => buildRegionalData(heatmap), [heatmap]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-white p-6 text-red-700 shadow-sm">{error}</div>;
  }

  return (
    <>
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCardConfig.map((card) => (
          <StatCard
            key={card.key}
            label={card.label}
            value={formatCompactNumber(stats[card.key])}
            growth={growthByKey[card.key]}
            icon={card.icon}
            iconWrap={card.iconWrap}
          />
        ))}
      </section>

      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-12 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-6">
          <div className="mb-6 flex items-center justify-between">
            <h4 className="font-bold text-slate-800">Jobs by Category</h4>
            <button className="text-slate-400 transition hover:text-slate-600" type="button">
              <span className="material-symbols-outlined">more_horiz</span>
            </button>
          </div>
          <div className="space-y-4">
            {categoryItems.length === 0 ? (
              <p className="text-sm text-slate-500">No category analytics available.</p>
            ) : null}
            {categoryItems.map((item, idx) => {
              const colors = ['bg-[var(--primary)]', 'bg-indigo-400', 'bg-sky-400', 'bg-emerald-400'];
              return (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-slate-600">
                    <span>{item.name}</span>
                    <span>{item.percent}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div className={`h-2 rounded-full ${colors[idx % colors.length]}`} style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-span-12 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-6">
          <div className="mb-6 flex items-center justify-between">
            <h4 className="font-bold text-slate-800">Jobs Over Time</h4>
            <div className="flex rounded-lg bg-slate-100 p-1">
              <button className="rounded-md bg-white px-3 py-1 text-[10px] font-bold shadow-sm" type="button">Daily</button>
              <button className="px-3 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700" type="button">Weekly</button>
            </div>
          </div>
          <div className="relative flex h-40 items-end justify-between gap-2 px-2">
            <div className="absolute inset-0 flex items-center px-4">
              <svg className="h-24 w-full" preserveAspectRatio="none" viewBox="0 0 400 100">
                <path d={chartPath} fill="none" stroke="#2F4DA0" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
              </svg>
            </div>
            <div className="mt-auto flex w-full justify-between text-[10px] font-medium text-slate-400">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-12 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm lg:col-span-8">
          <div className="flex items-center justify-between border-b border-slate-50 p-6">
            <h4 className="font-bold text-slate-800">Recent Activity</h4>
            <button className="text-xs font-bold text-(--primary) hover:underline" type="button">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Activity Type</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activities.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-6 text-center text-sm text-slate-500">No recent activity.</td>
                  </tr>
                ) : null}
                {activities.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-xs text-slate-600">{item.dateLabel}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700">
                          {item.userName?.[0] || 'U'}
                        </div>
                        <span className="text-sm font-semibold">{item.userName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.activityType}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold capitalize ${statusClass(item.status)}`}>{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-12 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-4">
          <div className="mb-6 flex items-center justify-between">
            <h4 className="font-bold text-slate-800">Regional Activity</h4>
            <span className="material-symbols-outlined text-lg text-slate-400">map</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {regional.cells.map((value, idx) => (
              <div key={idx} className="aspect-square rounded-md bg-(--primary)" style={{ opacity: value }} />
            ))}
          </div>
          <div className="mt-6 space-y-3">
            {regional.summary.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{item.label}</span>
                <span className="font-bold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

