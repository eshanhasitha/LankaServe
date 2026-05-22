import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '../lib/auth-context.tsx';
import { TableSkeletonRows } from '../components/AdminSkeletons.tsx';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function roleBadgeClass(role) {
  if (role === 'provider') return 'border border-purple-100 bg-purple-50 text-purple-600';
  if (role === 'admin') return 'border border-slate-200 bg-slate-100 text-slate-600';
  return 'border border-blue-100 bg-blue-50 text-[var(--primary)]';
}

function statusClass(isActive) {
  if (isActive === false) return { dot: 'bg-slate-400', text: 'text-slate-500', label: 'Inactive' };
  return { dot: 'bg-emerald-500', text: 'text-emerald-600', label: 'Active' };
}

function UserAvatar({ name, profileImage }) {
  const initial = String(name || 'U').trim().charAt(0).toUpperCase() || 'U';
  if (profileImage) {
    return <img alt={name || 'User'} className="h-8 w-8 rounded-full border border-slate-100 object-cover" src={profileImage} />;
  }

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-100 bg-slate-200 text-xs font-bold text-slate-500">
      {initial}
    </div>
  );
}

export default function AdminUsersPage() {
  const { authorizedRequest } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [processingId, setProcessingId] = useState('');

  const loadUsers = useCallback(async (targetPage) => {
    setLoading(true);
    setError('');
    try {
      const response = await authorizedRequest(`/admin/users?page=${targetPage}&limit=20`);
      setRows(Array.isArray(response?.data) ? response.data : []);
      setPagination(response?.pagination || { page: targetPage, totalPages: 1, total: 0 });
    } catch (loadError) {
      setError(loadError.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest]);

  useEffect(() => {
    loadUsers(page);
  }, [loadUsers, page]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const name = String(row?.name || '').toLowerCase();
      const email = String(row?.email || '').toLowerCase();
      const role = String(row?.role || '').toLowerCase();
      const query = search.trim().toLowerCase();
      const createdDate = row?.createdAt ? new Date(row.createdAt).toISOString().slice(0, 10) : '';

      const matchesSearch = !query || name.includes(query) || email.includes(query) || role.includes(query);
      const matchesStatus =
        statusFilter === 'all'
          || (statusFilter === 'active' && row?.isActive !== false)
          || (statusFilter === 'inactive' && row?.isActive === false);
      const matchesDate = !dateFilter || createdDate === dateFilter;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [rows, search, statusFilter, dateFilter]);

  async function deactivateUser(userId) {
    if (!userId) return;
    try {
      setProcessingId(userId);
      await authorizedRequest(`/admin/users/${userId}/deactivate`, { method: 'PUT' });
      await loadUsers(page);
    } catch (actionError) {
      setError(actionError.message || 'Failed to update user');
    } finally {
      setProcessingId('');
    }
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
    setDateFilter('');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Users</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Manage all platform customers, service providers, and administrative staff.</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-(--primary) px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90" type="button">
          <span className="material-symbols-outlined text-xl">add</span>
          <span>Add New User</span>
        </button>
      </div>

      <div className="grid grid-cols-1 items-end gap-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:grid-cols-4 lg:grid-cols-5">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Search</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute inset-y-0 left-3 flex items-center text-lg text-slate-400">search</span>
            <input
              className="w-full rounded-xl border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm transition-all focus:border-transparent focus:bg-white focus:ring-2 focus:ring-(--primary)"
              placeholder="Name or email..."
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Status</label>
          <select
            className="w-full cursor-pointer appearance-none rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition-all focus:bg-white focus:ring-2 focus:ring-(--primary)"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Date Range</label>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute inset-y-0 left-3 flex items-center text-lg text-slate-400">calendar_today</span>
            <input
              className="w-full rounded-xl border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm transition-all focus:bg-white focus:ring-2 focus:ring-(--primary)"
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
            />
          </div>
        </div>

        <div className="flex h-11.5 items-center">
          <button type="button" className="flex items-center gap-1 text-sm font-semibold text-(--primary) hover:underline" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {error ? <p className="px-8 py-4 text-sm text-red-700">{error}</p> : null}

        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="px-8 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <TableSkeletonRows columns={6} rows={5} widths={['w-40', 'w-48', 'w-20', 'w-20', 'w-28', 'w-10']} />
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && !error ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <th className="px-8 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Created Date</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredRows.map((row) => {
                    const status = statusClass(row?.isActive);
                    const role = String(row?.role || 'customer').toLowerCase();
                    const created = formatDate(row?.createdAt);
                    return (
                      <tr key={row?._id || row?.id} className="transition-colors hover:bg-slate-50/50">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={row?.name} profileImage={row?.profileImage || row?.photoURL} />
                            <span className="text-sm font-bold text-slate-900">{row?.name || 'Unnamed User'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{row?.email || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${roleBadgeClass(role)}`}>{role}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <div className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                            <span className={`text-[11px] font-bold ${status.text}`}>{status.label}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{created}</td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 text-slate-400">
                            <button className="rounded-lg p-1.5 transition-all hover:bg-blue-50 hover:text-(--primary)" title="View Profile" type="button">
                              <span className="material-symbols-outlined text-xl">visibility</span>
                            </button>
                            <button
                              className="rounded-lg p-1.5 transition-all hover:bg-amber-50 hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Suspend"
                              type="button"
                              disabled={row?.isActive === false || processingId === row?._id}
                              onClick={() => deactivateUser(row?._id)}
                            >
                              <span className="material-symbols-outlined text-xl">block</span>
                            </button>
                            <button className="rounded-lg p-1.5 transition-all hover:bg-emerald-50 hover:text-emerald-500" title="Activate" type="button">
                              <span className="material-symbols-outlined text-xl">check_circle</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredRows.length ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-8 text-center text-sm text-slate-500">No users found.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-8 py-4">
              <span className="text-sm font-medium text-slate-500">
                Page <span className="font-semibold text-slate-900">{pagination?.page || 1}</span> of <span className="font-semibold text-slate-900">{pagination?.totalPages || 1}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  className={`rounded-lg border border-slate-200 bg-white p-2 text-slate-400 transition-all ${page <= 1 ? 'cursor-not-allowed opacity-50' : 'hover:border-(--primary) hover:text-(--primary)'}`}
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <span className="material-symbols-outlined text-xl leading-none">chevron_left</span>
                </button>
                <button
                  className={`rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition-all ${page >= Number(pagination?.totalPages || 1) ? 'cursor-not-allowed opacity-50' : 'hover:border-(--primary) hover:text-(--primary)'}`}
                  type="button"
                  disabled={page >= Number(pagination?.totalPages || 1)}
                  onClick={() => setPage((value) => value + 1)}
                >
                  <span className="material-symbols-outlined text-xl leading-none">chevron_right</span>
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

