import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '../lib/auth-context.tsx';
import { TableSkeletonRows } from '../components/AdminSkeletons.tsx';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function compactNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

function statusPillClass(status) {
  const key = String(status || '').toLowerCase();
  if (key === 'completed' || key === 'paid') return 'border border-emerald-100 bg-emerald-50 text-emerald-600';
  if (key === 'ongoing' || key === 'arrived' || key === 'accepted') return 'border border-orange-100 bg-orange-50 text-orange-600';
  if (key === 'cancelled' || key === 'canceled') return 'border border-slate-200 bg-slate-100 text-slate-600';
  return 'border border-blue-100 bg-blue-50 text-blue-600';
}

function statusLabel(status) {
  const key = String(status || '').toLowerCase();
  if (key === 'paid') return 'COMPLETED';
  return key ? key.toUpperCase() : 'PENDING';
}

function userNameFromMap(userMap, userId) {
  if (!userId) return 'Unassigned';
  const id = typeof userId === 'string' ? userId : userId?._id;
  return userMap.get(String(id))?.name || 'Unknown User';
}

function userImageFromMap(userMap, userId) {
  if (!userId) return '';
  const id = typeof userId === 'string' ? userId : userId?._id;
  return userMap.get(String(id))?.profileImage || '';
}

function AvatarCell({ name, image }) {
  const initial = String(name || 'U').trim().charAt(0).toUpperCase() || 'U';
  if (image) {
    return <img alt={name || 'User'} className="h-8 w-8 rounded-full border border-slate-100 object-cover" src={image} />;
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
      {initial}
    </div>
  );
}

export default function AdminJobsPage() {
  const { authorizedRequest } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [usersMap, setUsersMap] = useState(new Map());
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const loadJobs = useCallback(async (targetPage) => {
    setLoading(true);
    setError('');
    try {
      const [jobsResponse, usersResponse] = await Promise.all([
        authorizedRequest(`/admin/jobs?page=${targetPage}&limit=20`),
        authorizedRequest('/admin/users?page=1&limit=200'),
      ]);
      const jobItems = Array.isArray(jobsResponse?.data) ? jobsResponse.data : [];
      const userItems = Array.isArray(usersResponse?.data) ? usersResponse.data : [];
      setRows(jobItems);
      setPagination(jobsResponse?.pagination || { page: targetPage, totalPages: 1, total: jobItems.length });
      setUsersMap(new Map(userItems.map((user) => [String(user._id), user])));
    } catch (loadError) {
      setError(loadError.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest]);

  useEffect(() => {
    loadJobs(page);
  }, [loadJobs, page]);

  const categories = useMemo(() => {
    const items = new Set(rows.map((row) => String(row?.category || '').trim()).filter(Boolean));
    return ['all', ...Array.from(items)];
  }, [rows]);

  const districts = useMemo(() => {
    const items = new Set(rows.map((row) => String(row?.district || row?.locationLabel || '').trim()).filter(Boolean));
    return ['all', ...Array.from(items)];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const status = String(row?.status || '').toLowerCase();
      const category = String(row?.category || '').toLowerCase();
      const district = String(row?.district || row?.locationLabel || '').toLowerCase();
      const created = row?.createdAt ? new Date(row.createdAt).toISOString().slice(0, 10) : '';

      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || category === categoryFilter;
      const matchesLocation = locationFilter === 'all' || district === locationFilter;
      const matchesDate = !dateFilter || created === dateFilter;
      return matchesStatus && matchesCategory && matchesLocation && matchesDate;
    });
  }, [rows, statusFilter, categoryFilter, locationFilter, dateFilter]);

  const metrics = useMemo(() => {
    const totalActive = rows.filter((row) => !['cancelled', 'canceled'].includes(String(row?.status || '').toLowerCase())).length;
    const completed = rows.filter((row) => ['completed', 'paid'].includes(String(row?.status || '').toLowerCase())).length;
    const cancelled = rows.filter((row) => ['cancelled', 'canceled'].includes(String(row?.status || '').toLowerCase())).length;
    const completionRate = totalActive > 0 ? ((completed / totalActive) * 100).toFixed(1) : '0.0';
    return {
      totalActive,
      completionRate,
      cancelledToday: cancelled,
      avgResponseTime: '12m',
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Jobs Monitoring</h1>
        <button className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50" type="button">
          <span className="material-symbols-outlined text-xl">download</span>
          Export Data
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="min-w-50 flex-1">
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Status</label>
          <select
            className="w-full rounded-lg border-slate-200 bg-slate-50 text-sm focus:border-(--primary) focus:ring-(--primary)"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="arrived">Arrived</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="min-w-50 flex-1">
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Category</label>
          <select
            className="w-full rounded-lg border-slate-200 bg-slate-50 text-sm focus:border-(--primary) focus:ring-(--primary)"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-50 flex-1">
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Location</label>
          <select
            className="w-full rounded-lg border-slate-200 bg-slate-50 text-sm focus:border-(--primary) focus:ring-(--primary)"
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value)}
          >
            {districts.map((district) => (
              <option key={district} value={district}>
                {district === 'all' ? 'All Districts' : district}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-50 flex-1">
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Date Range</label>
          <div className="relative">
            <input
              className="w-full rounded-lg border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:border-(--primary) focus:ring-(--primary)"
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
            />
            <span className="material-symbols-outlined absolute left-3 top-2 text-xl text-slate-400">calendar_today</span>
          </div>
        </div>
        <button className="rounded-lg bg-(--primary) px-6 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90" type="button">
          Apply Filters
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {error ? <p className="px-6 py-4 text-sm text-red-700">{error}</p> : null}

        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="px-6 py-4">Job Title</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Provider</th>
                  <th className="px-6 py-4">Budget (LKR)</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <TableSkeletonRows columns={7} rows={5} widths={['w-40', 'w-28', 'w-28', 'w-20', 'w-20', 'w-28', 'w-10']} />
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && !error ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    <th className="px-6 py-4">Job Title</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Provider</th>
                    <th className="px-6 py-4">Budget (LKR)</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Created Date</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => {
                    const customerName = userNameFromMap(usersMap, row?.customerId);
                    const customerImage = userImageFromMap(usersMap, row?.customerId);
                    const providerName = row?.providerId ? userNameFromMap(usersMap, row?.providerId) : 'Unassigned';
                    const providerImage = row?.providerId ? userImageFromMap(usersMap, row?.providerId) : '';
                    return (
                      <tr key={row._id} className="transition-colors hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-slate-800">{row?.title || 'Untitled Job'}</span>
                          <p className="text-[10px] font-medium text-slate-400">JOB-{String(row?._id || '').slice(-5).toUpperCase()}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <AvatarCell name={customerName} image={customerImage} />
                            <span className="text-sm font-semibold">{customerName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {row?.providerId ? (
                            <div className="flex items-center gap-3">
                              <AvatarCell name={providerName} image={providerImage} />
                              <span className="text-sm font-semibold">{providerName}</span>
                            </div>
                          ) : (
                            <span className="text-sm italic text-slate-400">Unassigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold">{compactNumber(row?.price)}</td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusPillClass(row?.status)}`}>
                            {statusLabel(row?.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatDate(row?.createdAt)}</td>
                        <td className="px-6 py-4 text-center">
                          <button className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100" type="button">
                            <span className="material-symbols-outlined text-xl">visibility</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredRows.length ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">No jobs found.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-6 py-4">
              <span className="text-xs font-medium text-slate-500">Showing 1 to {filteredRows.length} of {pagination?.total || 0} active jobs</span>
              <div className="flex gap-1">
                <button
                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                {[1, 2, 3].map((number) => (
                  <button
                    key={number}
                    className={`flex h-7 w-7 items-center justify-center rounded text-xs font-bold ${
                      page === number ? 'bg-(--primary) text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    type="button"
                    onClick={() => setPage(number)}
                  >
                    {number}
                  </button>
                ))}
                <button
                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                  type="button"
                  disabled={page >= Number(pagination?.totalPages || 1)}
                  onClick={() => setPage((value) => value + 1)}
                >
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-(--primary)">
              <span className="material-symbols-outlined">analytics</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600/70">Total Active Jobs</p>
              <h4 className="text-xl font-bold text-(--primary)">{compactNumber(metrics.totalActive)}</h4>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <span className="material-symbols-outlined">task_alt</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600/70">Completion Rate</p>
              <h4 className="text-xl font-bold text-emerald-700">{metrics.completionRate}%</h4>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50/50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <span className="material-symbols-outlined">cancel</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-red-600/70">Cancelled Today</p>
              <h4 className="text-xl font-bold text-red-700">{compactNumber(metrics.cancelledToday)}</h4>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <span className="material-symbols-outlined">schedule</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600/70">Avg Response Time</p>
              <h4 className="text-xl font-bold text-amber-700">{metrics.avgResponseTime}</h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

