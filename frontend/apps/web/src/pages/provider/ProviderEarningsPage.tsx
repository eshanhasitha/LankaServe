import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../lib/api.ts';
import { useAuth } from '../../lib/auth-context.tsx';
import Skeleton from '../../components/Skeleton.tsx';

function toCurrency(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value) {
  const numeric = Number(value || 0);
  const prefix = numeric > 0 ? '+' : '';
  return `${prefix}${numeric.toFixed(1)}%`;
}

function percentTextClass(value) {
  void value;
  return 'text-emerald-500';
}

function badgeByStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'verified') return { label: 'COMPLETED', className: 'bg-emerald-50 text-emerald-600' };
  return { label: 'PROCESSING', className: 'bg-amber-50 text-amber-600' };
}

function buildTrendPath(points, width = 100, height = 100) {
  if (!points.length) return '';
  if (points.length === 1) return `M0,${height - points[0]} L${width},${height - points[0]}`;

  const step = width / (points.length - 1);
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${(step * index).toFixed(2)},${(height - point).toFixed(2)}`)
    .join(' ');
}

export default function ProviderEarningsPage() {
  const { accessToken } = useAuth();
  const [periodMonths, setPeriodMonths] = useState(6);
  const [summary, setSummary] = useState({
    weekly: 0,
    monthly: 0,
    lifetime: 0,
    latestAddedAmount: 0,
    latestContributionPercent: 0,
    monthlyGrowthPercent: 0,
    trend: [],
  });
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ total: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!accessToken) return;
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const response = await apiRequest(`/providers/earnings?page=1&limit=10&periodMonths=${periodMonths}`, { headers });
        if (!mounted) return;
        setSummary(response?.data?.summary || {
          weekly: 0,
          monthly: 0,
          lifetime: 0,
          latestAddedAmount: 0,
          latestContributionPercent: 0,
          monthlyGrowthPercent: 0,
          trend: [],
        });
        setPayments(Array.isArray(response?.data?.list) ? response.data.list : []);
        setPagination(response?.pagination || { total: 0 });
      } catch {
        if (mounted) {
          setSummary({
            weekly: 0,
            monthly: 0,
            lifetime: 0,
            latestAddedAmount: 0,
            latestContributionPercent: 0,
            monthlyGrowthPercent: 0,
            trend: [],
          });
          setPayments([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [accessToken, periodMonths]);

  const trendPoints = useMemo(() => {
    const trend = Array.isArray(summary.trend) ? summary.trend : [];
    const amounts = trend.map((item) => Number(item.amount || 0));
    const maxValue = Math.max(1, ...amounts);
    return trend.map((item) => (Number(item.amount || 0) / maxValue) * 90);
  }, [summary.trend]);
  const trendPath = useMemo(() => buildTrendPath(trendPoints), [trendPoints]);
  const trendAreaPath = useMemo(() => {
    if (!trendPath) return '';
    return `M0,100 ${trendPath.slice(1)} L100,100 Z`;
  }, [trendPath]);
  const trendLabels = useMemo(
    () => (Array.isArray(summary.trend) && summary.trend.length ? summary.trend.map((item) => item.label) : []),
    [summary.trend]
  );
  const hasTrend = trendLabels.length > 0;

  const totalEarnings = useMemo(
    () => payments.reduce((sum, item) => sum + Number(item?.amount || 0), 0),
    [payments],
  );
  const avgJobValue = useMemo(
    () => (payments.length ? totalEarnings / payments.length : 0),
    [payments, totalEarnings],
  );

  return (
    <div className="p-8 max-w-[1440px] mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Earnings</h1>
        <p className="text-slate-500 text-sm">Manage and track your platform income and transaction history.</p>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-[16px] shadow-sm border border-slate-50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Earnings</p>
            <span className={`text-xs font-bold ${percentTextClass(summary.latestContributionPercent)}`}>
              {formatPercent(summary.latestContributionPercent)}
            </span>
          </div>
          <p className="text-xl font-bold">LKR {toCurrency(summary.lifetime || totalEarnings)}</p>
          <p className="text-[10px] text-slate-400 mt-4 italic">Lifetime revenue from services</p>
          <p className="text-[10px] text-slate-500 mt-1">Last added LKR {toCurrency(summary.latestAddedAmount)}</p>
        </div>

        <div className="bg-white p-5 rounded-[16px] shadow-sm border border-slate-50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Earnings</p>
            <span className={`text-xs font-bold ${percentTextClass(summary.monthlyGrowthPercent)}`}>
              {formatPercent(summary.monthlyGrowthPercent)}
            </span>
          </div>
          <p className="text-xl font-bold">LKR {toCurrency(summary.monthly)}</p>
          <p className="text-[10px] text-slate-400 mt-4 italic">Last 30 days earnings</p>
          <p className="text-[10px] text-slate-500 mt-1">Compared with previous month</p>
        </div>

        <div className="bg-white p-5 rounded-[16px] shadow-sm border border-slate-50">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Completed Jobs</p>
          <p className="text-2xl font-bold">{payments.length}</p>
          <p className="text-[10px] text-slate-400 mt-2">Total billable jobs completed</p>
        </div>

        <div className="bg-white p-5 rounded-[16px] shadow-sm border border-slate-50">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Avg. Job Value</p>
          <p className="text-2xl font-bold">LKR {toCurrency(avgJobValue)}</p>
          <p className="text-[10px] text-slate-400 mt-2">Revenue per project average</p>
        </div>
      </section>

      <section className="bg-white p-6 rounded-[16px] shadow-sm border border-slate-50">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Earnings Over Time</h3>
            <p className="text-xs text-slate-400">Visualization of your income growth</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#2F4DA0]" />
              <span className="text-sm font-medium text-slate-600">Revenue</span>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${periodMonths === 6 ? 'bg-white text-[#2F4DA0] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                type="button"
                onClick={() => setPeriodMonths(6)}
              >
                6 Months
              </button>
              <button
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${periodMonths === 12 ? 'bg-white text-[#2F4DA0] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                type="button"
                onClick={() => setPeriodMonths(12)}
              >
                1 Year
              </button>
            </div>
          </div>
        </div>

        <div className="relative h-72 w-full">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            <div className="border-t border-slate-50 w-full" />
            <div className="border-t border-slate-50 w-full" />
            <div className="border-t border-slate-50 w-full" />
            <div className="border-t border-slate-50 w-full" />
            <div className="border-t border-slate-200 w-full" />
          </div>
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="earningsGradientProvider" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2F4DA0" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#2F4DA0" stopOpacity="0" />
              </linearGradient>
            </defs>
            {hasTrend ? <path d={trendAreaPath} fill="url(#earningsGradientProvider)" /> : null}
            {hasTrend ? <path d={trendPath} fill="none" stroke="#2F4DA0" strokeLinecap="round" strokeWidth="2" /> : null}
          </svg>
        </div>
        <div className="flex justify-between mt-6 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {hasTrend ? trendLabels.map((label) => <span key={label}>{label}</span>) : <span>No earnings data</span>}
        </div>
      </section>

      <section className="bg-white rounded-[16px] shadow-sm border border-slate-50 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Payment History</h3>
            <p className="text-xs text-slate-400">Detailed list of all earnings and payout status</p>
          </div>
          <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors" type="button">
            <span className="material-symbols-outlined text-lg">description</span>
            Export CSV
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-4 space-y-3">
            <Skeleton className="h-4 w-40" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Job Title</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount (LKR)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Method</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((item) => {
                const badge = badgeByStatus(item.status);
                return (
                  <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900">{item.jobTitle || 'Service Payment'}</span>
                        <span className="text-[10px] text-slate-400 font-medium">ID: #{String(item._id).slice(-6)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{toCurrency(item.amount)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                        <span className="material-symbols-outlined text-slate-400 text-lg">account_balance_wallet</span>
                        Platform Wallet
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{item?.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-[#2F4DA0] transition-colors" type="button">
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">Showing {payments.length} of {pagination.total || payments.length} transactions</p>
          <div className="flex gap-2">
            <button className="p-1 border border-slate-200 rounded hover:bg-white text-slate-400 transition-colors opacity-50" disabled type="button">
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button className="p-1 border border-slate-200 rounded hover:bg-white text-slate-600 transition-colors" type="button">
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

