import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '../lib/auth-context.tsx';

const REPORT_TYPES = [
  { key: 'users', label: 'User Reports', icon: 'group' },
  { key: 'providers', label: 'Provider Reports', icon: 'engineering' },
  { key: 'jobs', label: 'Jobs Reports', icon: 'work' },
  { key: 'qr', label: 'QR Reports', icon: 'qr_code_2' },
  { key: 'reviews', label: 'Review Reports', icon: 'star' },
  { key: 'support', label: 'Support Reports', icon: 'support_agent' },
];

const STATUS_OPTIONS = {
  users: ['All Statuses', 'Active', 'Inactive'],
  providers: ['All Statuses', 'Verified', 'Pending Approval', 'Suspended'],
  jobs: ['All Statuses', 'Pending', 'Accepted', 'Completed', 'Cancelled'],
  qr: ['All Statuses', 'VERIFIED', 'FAILED'],
  reviews: ['All Statuses', 'Positive', 'Neutral', 'Negative'],
  support: ['All Statuses', 'Open', 'In Progress', 'Resolved', 'Closed'],
};

function shortProviderId(value, index = 0) {
  const raw = String(value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (raw.length >= 4) return `LP-${raw.slice(-4)}`;
  return `LP-${String(index + 1).padStart(4, '0')}`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function todayDateInputValue() {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function normalizeRegion(district) {
  const text = String(district || '').trim();
  return text || 'Unknown';
}

function statusBadgeClass(status) {
  const key = String(status || '').toLowerCase();
  if (['verified', 'active', 'completed', 'paid', 'positive'].includes(key)) {
    return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  }
  if (['pending', 'pending approval', 'accepted', 'neutral'].includes(key)) {
    return 'bg-amber-50 text-amber-600 border-amber-100';
  }
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

function toCsv(rows, columns) {
  const escape = (v) => {
    const text = String(v ?? '');
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const header = columns.map((col) => escape(col.label)).join(',');
  const lines = rows.map((row) => columns.map((col) => escape(col.value(row))).join(','));
  return [header, ...lines].join('\n');
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminReportsPage() {
  const { authorizedRequest } = useAdminAuth();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const [reportType, setReportType] = useState('providers');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [regionFilter, setRegionFilter] = useState('All Districts');
  const [fromDate, setFromDate] = useState(() => todayDateInputValue());
  const [toDate, setToDate] = useState(() => todayDateInputValue());

  const [sourceData, setSourceData] = useState({
    users: [],
    providers: [],
    jobs: [],
    qr: [],
    reviews: [],
    support: [],
  });

  const [generatedRows, setGeneratedRows] = useState([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);

  const usersMap = useMemo(() => {
    return new Map((sourceData.users || []).map((user) => [String(user._id), user]));
  }, [sourceData.users]);

  const providerMap = useMemo(() => {
    const map = new Map();
    (sourceData.providers || []).forEach((provider) => {
      const userId = provider?.userId?._id || provider?.userId;
      if (userId) map.set(String(userId), provider);
    });
    return map;
  }, [sourceData.providers]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, providersRes, jobsRes, qrRes, reviewsRes, supportRes] = await Promise.all([
        authorizedRequest('/admin/users?page=1&limit=1000'),
        authorizedRequest('/admin/providers?page=1&limit=1000'),
        authorizedRequest('/admin/jobs?page=1&limit=1000'),
        authorizedRequest('/admin/qr-logs?page=1&limit=1000'),
        authorizedRequest('/admin/reviews?page=1&limit=1000'),
        authorizedRequest('/admin/support-requests?page=1&limit=1000'),
      ]);

      setSourceData({
        users: Array.isArray(usersRes?.data) ? usersRes.data : [],
        providers: Array.isArray(providersRes?.data) ? providersRes.data : [],
        jobs: Array.isArray(jobsRes?.data) ? jobsRes.data : [],
        qr: Array.isArray(qrRes?.data) ? qrRes.data : [],
        reviews: Array.isArray(reviewsRes?.data) ? reviewsRes.data : [],
        support: Array.isArray(supportRes?.data) ? supportRes.data : [],
      });
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const districtOptions = useMemo(() => {
    const regions = new Set<string>();

    if (reportType === 'providers') {
      sourceData.providers.forEach((provider) => {
        const region = normalizeRegion(provider?.district || provider?.userId?.district);
        if (region !== 'Unknown') regions.add(region);
      });
    }

    if (reportType === 'users') {
      sourceData.users.forEach((user) => {
        const region = normalizeRegion(user?.district);
        if (region !== 'Unknown') regions.add(region);
      });
    }

    if (reportType === 'jobs') {
      sourceData.jobs.forEach((job) => {
        const customer = usersMap.get(String(job?.customerId || ''));
        const region = normalizeRegion(customer?.district);
        if (region !== 'Unknown') regions.add(region);
      });
    }

    if (reportType === 'qr') {
      sourceData.qr.forEach((log) => {
        const region = normalizeRegion(log?.location?.district || log?.district);
        if (region !== 'Unknown') regions.add(region);
      });
    }

    if (reportType === 'reviews') {
      sourceData.reviews.forEach((review) => {
        const customer = usersMap.get(String(review?.customerId || ''));
        const region = normalizeRegion(customer?.district);
        if (region !== 'Unknown') regions.add(region);
      });
    }

    if (reportType === 'support') {
      sourceData.support.forEach((ticket) => {
        const region = normalizeRegion(ticket?.userDistrict || ticket?.district);
        if (region !== 'Unknown') regions.add(region);
      });
    }

    return ['All Districts', ...Array.from(regions).sort((a, b) => a.localeCompare(b))];
  }, [reportType, sourceData.jobs, sourceData.providers, sourceData.qr, sourceData.reviews, sourceData.support, sourceData.users, usersMap]);

  useEffect(() => {
    setStatusFilter('All Statuses');
    setRegionFilter('All Districts');
    setVisibleCount(5);
  }, [reportType]);

  const allRowsByType = useMemo(() => {
    const startDate = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const endDate = toDate ? new Date(`${toDate}T23:59:59.999`) : null;

    const inDateRange = (value) => {
      if (!startDate || !endDate) return true;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return true;
      return d >= startDate && d <= endDate;
    };

    const usersRows = sourceData.users
      .filter((user) => inDateRange(user?.createdAt))
      .map((user) => ({
        id: user?._id,
        avatar: user?.profileImage || '',
        initials: String(user?.name || 'U').trim().slice(0, 2).toUpperCase(),
        name: user?.name || 'Unknown User',
        sub: user?.email || '-',
        category: user?.role || '-',
        district: normalizeRegion(user?.district),
        jobs: '-',
        rating: '-',
        status: user?.isActive ? 'Active' : 'Inactive',
        createdAt: user?.createdAt,
      }));

    const providersRows = sourceData.providers
      .filter((provider) => inDateRange(provider?.createdAt))
      .map((provider, index) => {
        const user = provider?.userId || {};
        return {
          id: provider?._id,
          avatar: user?.profileImage || '',
          initials: String(user?.name || 'P').trim().slice(0, 2).toUpperCase(),
          name: user?.name || 'Unknown Provider',
          sub: `ID: ${shortProviderId(user?._id, index)}`,
          category: provider?.categories?.[0] || 'Other',
          district: normalizeRegion(provider?.district || user?.district),
          jobs: Number(provider?.stats?.completedJobs || 0),
          rating: Number(provider?.stats?.averageRating || 0).toFixed(1),
          status: provider?.verified ? 'Verified' : 'Pending',
          createdAt: provider?.createdAt,
        };
      });

    const jobsRows = sourceData.jobs
      .filter((job) => inDateRange(job?.createdAt))
      .map((job) => {
        const providerUser = usersMap.get(String(job?.providerId || ''));
        const customerUser = usersMap.get(String(job?.customerId || ''));
        return {
          id: job?._id,
          avatar: providerUser?.profileImage || '',
          initials: String(providerUser?.name || 'J').trim().slice(0, 2).toUpperCase(),
          name: job?.title || 'Untitled Job',
          sub: `Provider: ${providerUser?.name || 'Unassigned'}`,
          category: job?.category || 'General',
          district: normalizeRegion(customerUser?.district),
          jobs: Number(job?.budget || 0),
          rating: '-',
          status: String(job?.status || 'pending').replace(/_/g, ' '),
          createdAt: job?.createdAt,
        };
      });

    const qrRows = sourceData.qr
      .filter((log) => inDateRange(log?.createdAt))
      .map((log) => {
        const providerUser = usersMap.get(String(log?.providerId || ''));
        const customerUser = usersMap.get(String(log?.customerId || ''));
        return {
          id: log?._id,
          avatar: providerUser?.profileImage || '',
          initials: String(providerUser?.name || 'Q').trim().slice(0, 2).toUpperCase(),
          name: providerUser?.name || 'Unknown Provider',
          sub: `Log: ${String(log?._id || '').slice(-6).toUpperCase()}`,
          category: customerUser?.name || 'Unknown Customer',
          district: normalizeRegion(log?.location?.district || log?.district || customerUser?.district),
          jobs: '-',
          rating: '-',
          status: log?.result || log?.status || 'VERIFIED',
          createdAt: log?.createdAt,
        };
      });

    const reviewRows = sourceData.reviews
      .filter((review) => inDateRange(review?.createdAt))
      .map((review) => {
        const providerUser = usersMap.get(String(review?.providerId || ''));
        const customerUser = usersMap.get(String(review?.customerId || ''));
        const score = Number(review?.rating || 0);
        let sentiment = 'Neutral';
        if (score >= 4) sentiment = 'Positive';
        else if (score <= 2) sentiment = 'Negative';

        return {
          id: review?._id,
          avatar: providerUser?.profileImage || '',
          initials: String(providerUser?.name || 'R').trim().slice(0, 2).toUpperCase(),
          name: providerUser?.name || 'Unknown Provider',
          sub: `Customer: ${customerUser?.name || 'Unknown'}`,
          category: (review?.comment || '').slice(0, 32) || '-',
          district: normalizeRegion(customerUser?.district),
          jobs: '-',
          rating: score.toFixed(1),
          status: sentiment,
          createdAt: review?.createdAt,
        };
      });

    const supportRows = sourceData.support
      .filter((ticket) => inDateRange(ticket?.createdAt))
      .map((ticket) => ({
        id: ticket?.id || ticket?._id,
        avatar: '',
        initials: String(ticket?.userName || 'S').trim().slice(0, 2).toUpperCase(),
        name: ticket?.subject || ticket?.category || 'Support Request',
        sub: [ticket?.ticketNumber, ticket?.assignedAdminName ? `Assigned: ${ticket.assignedAdminName}` : 'Unassigned']
          .filter(Boolean)
          .join(' • '),
        category: ticket?.category || 'Support',
        district: normalizeRegion(ticket?.userDistrict || ticket?.userCity || ticket?.district),
        jobs: ticket?.priority || '-',
        rating: '-',
        status: String(ticket?.statusLabel || ticket?.status || 'Open').replace(/_/g, ' '),
        createdAt: ticket?.createdAt,
      }));

    return {
      users: usersRows,
      providers: providersRows,
      jobs: jobsRows,
      qr: qrRows,
      reviews: reviewRows,
      support: supportRows,
    };
  }, [fromDate, toDate, sourceData.jobs, sourceData.providers, sourceData.qr, sourceData.reviews, sourceData.support, sourceData.users, usersMap]);

  const filteredRows = useMemo(() => {
    let rows = allRowsByType[reportType] || [];

    if (statusFilter !== 'All Statuses') {
      rows = rows.filter((row) => String(row.status || '').toLowerCase() === String(statusFilter).toLowerCase());
    }

    if (regionFilter !== 'All Districts') {
      rows = rows.filter((row) => String(row.district || '').toLowerCase() === String(regionFilter).toLowerCase());
    }

    return rows;
  }, [allRowsByType, reportType, regionFilter, statusFilter]);

  const previewRows = useMemo(() => generatedRows.slice(0, visibleCount), [generatedRows, visibleCount]);

  const previewTotal = generatedRows.length;

  function handleFromDateChange(value) {
    setFromDate(value);
    if (value && toDate && new Date(value) > new Date(toDate)) {
      setToDate(value);
    }
  }

  function handleToDateChange(value) {
    setToDate(value);
  }

  function buildReportQuery() {
    const params = new URLSearchParams({
      type: reportType,
      fromDate,
      toDate,
      status: statusFilter,
      district: regionFilter,
      limit: '1000',
    });

    return params.toString();
  }

  async function handleGenerateReport() {
    setGenerating(true);
    setError('');
    try {
      const response = await authorizedRequest(`/admin/reports?${buildReportQuery()}`);
      const rows = Array.isArray(response?.data?.rows)
        ? response.data.rows
        : Array.isArray(response?.data)
          ? response.data
          : [];

      setGeneratedRows(rows);
      setHasGenerated(true);
      setVisibleCount(5);
    } catch (reportError) {
      setGeneratedRows([]);
      setHasGenerated(true);
      setError(reportError?.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  }

  function handleExportCsv() {
    const columns = [
      { label: 'Name', value: (r) => r.name },
      { label: 'Category', value: (r) => r.category },
      { label: 'District', value: (r) => r.district },
      { label: reportType === 'support' ? 'Priority' : reportType === 'jobs' ? 'Budget' : 'Completed Jobs', value: (r) => r.jobs },
      { label: 'Rating', value: (r) => r.rating },
      { label: 'Status', value: (r) => r.status },
      { label: 'Created At', value: (r) => formatDateTime(r.createdAt) },
    ];
    const csv = toCsv(generatedRows, columns);
    downloadFile(`${reportType}-report.csv`, csv, 'text/csv;charset=utf-8;');
  }

  function handleExportPdf() {
    window.print();
  }

  const sectionTitle = REPORT_TYPES.find((item) => item.key === reportType)?.label || 'Report';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports Generation</h1>
        <p className="mt-1 text-sm text-slate-500">Configure and export detailed platform data reports.</p>
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-(--primary) text-[12px] font-bold text-white">1</span>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">Select Report Type</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {REPORT_TYPES.map((type) => {
            const active = type.key === reportType;
            return (
              <button
                key={type.key}
                type="button"
                onClick={() => setReportType(type.key)}
                className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-5 text-center transition-all ${active ? 'border-(--primary) shadow-sm shadow-blue-100' : 'border-slate-100 hover:border-slate-200'} bg-white`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${active ? 'bg-blue-50 text-(--primary)' : 'bg-slate-50 text-slate-500'}`}>
                  <span className="material-symbols-outlined text-2xl">{type.icon}</span>
                </div>
                <span className={`text-sm font-semibold ${active ? 'text-(--primary)' : 'text-slate-700'}`}>{type.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-(--primary) text-[12px] font-bold text-white">2</span>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">Report Configuration</h2>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
          <form className="flex flex-wrap items-end gap-6" onSubmit={(event) => event.preventDefault()}>
            <div className="min-w-80 flex-1 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Date Range</label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="relative block">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <span className="material-symbols-outlined text-lg">calendar_today</span>
                  </span>
                  <input
                    value={fromDate}
                    onChange={(event) => handleFromDateChange(event.target.value)}
                    className="w-full rounded-lg border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-(--primary)"
                    type="date"
                    aria-label="Report start date"
                  />
                </label>
                <label className="relative block">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <span className="material-symbols-outlined text-lg">event</span>
                  </span>
                  <input
                    value={toDate}
                    min={fromDate}
                    onChange={(event) => handleToDateChange(event.target.value)}
                    className="w-full rounded-lg border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-(--primary)"
                    type="date"
                    aria-label="Report end date"
                  />
                </label>
              </div>
              <p className="text-[11px] font-medium text-slate-400">Today is selected by default. Choose a later end date to extend the report range.</p>
            </div>

            <div className="min-w-60 flex-1 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Status Filter</label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full appearance-none rounded-lg border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700"
              >
                {(STATUS_OPTIONS[reportType] || STATUS_OPTIONS.providers).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="min-w-60 flex-1 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Region Filter (District)</label>
              <select
                value={regionFilter}
                onChange={(event) => setRegionFilter(event.target.value)}
                className="w-full appearance-none rounded-lg border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700"
              >
                {districtOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={generating}
              className="flex items-center gap-2 rounded-lg bg-(--primary) px-8 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#253D80] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-xl">analytics</span>
              {generating ? 'Generating...' : 'Generate Report'}
            </button>
          </form>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-(--primary) text-[12px] font-bold text-white">3</span>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">Report Preview</h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-lg">table_view</span>
              Export as CSV
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="flex items-center gap-2 rounded-lg bg-(--primary) px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#253D80]"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              Export as PDF
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="px-6 py-4">{reportType === 'providers' ? 'Provider Name' : 'Name'}</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">District</th>
                  <th className="px-6 py-4">{reportType === 'support' ? 'Priority' : reportType === 'jobs' ? 'Budget' : 'Completed Jobs'}</th>
                  <th className="px-6 py-4">Rating</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {loading || generating ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-sm text-slate-500">{generating ? 'Generating report...' : `Loading ${sectionTitle.toLowerCase()}...`}</td>
                  </tr>
                ) : null}

                {!loading && !generating && !previewRows.length ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-sm text-slate-500">
                      {hasGenerated ? 'No results for current filters.' : 'Select filters and click Generate Report.'}
                    </td>
                  </tr>
                ) : null}

                {!loading && !generating && previewRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {row.avatar ? (
                          <img alt="" className="h-8 w-8 rounded-full object-cover" src={row.avatar} />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-400">{row.initials}</div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">{row.name}</span>
                          <span className="text-[10px] font-medium text-slate-400">{row.sub}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.category}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.district}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{row.jobs}</td>
                    <td className="px-6 py-4">
                      {row.rating !== '-' ? (
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined fill-1 text-sm text-amber-400">star</span>
                          <span className="text-sm font-medium">{row.rating}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusBadgeClass(row.status)}`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
            <p className="text-[11px] font-medium tracking-wide text-slate-500">Showing 1-{previewRows.length} of {previewTotal.toLocaleString('en-US')} {sectionTitle.replace('Reports', '').trim()} Results</p>
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 5)}
              className="text-[11px] font-bold uppercase tracking-widest text-(--primary) hover:underline"
              disabled={previewRows.length >= previewTotal}
            >
              Load More Preview Data
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

