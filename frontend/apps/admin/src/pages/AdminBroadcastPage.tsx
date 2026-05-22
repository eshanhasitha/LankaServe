import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '../lib/auth-context.tsx';

const AUDIENCE_OPTIONS = [
  { value: 'all_users', label: 'All Users' },
  { value: 'customers', label: 'Customers' },
  { value: 'providers', label: 'Providers' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'EN (English)' },
  { value: 'si', label: 'SI (Sinhala)' },
  { value: 'ta', label: 'TA (Tamil)' },
];

function formatCountCompact(value) {
  const num = Number(value || 0);
  if (num >= 1000) {
    const short = Math.round((num / 1000) * 10) / 10;
    return `${short}k`;
  }
  return String(num);
}

function formatAudience(audience) {
  const key = String(audience || 'all_users');
  if (key === 'customers') return 'Customers';
  if (key === 'providers') return 'Providers';
  return 'All Users';
}

function audienceIcon(audience) {
  const key = String(audience || 'all_users');
  if (key === 'customers') return 'person';
  if (key === 'providers') return 'engineering';
  return 'groups';
}

function audienceColor(audience) {
  const key = String(audience || 'all_users');
  if (key === 'customers') return 'text-emerald-500';
  if (key === 'providers') return 'text-indigo-500';
  return 'text-blue-500';
}

function languageCode(language) {
  const value = String(language || 'en').toUpperCase();
  if (value === 'SI' || value === 'TA' || value === 'EN') return value;
  return 'EN';
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function statusPill(status) {
  const key = String(status || '').toLowerCase();
  if (key === 'sent') {
    return {
      label: 'Sent',
      className: 'bg-emerald-50 text-emerald-600',
      dot: 'bg-emerald-600',
    };
  }
  if (key === 'scheduled') {
    return {
      label: 'Scheduled',
      className: 'bg-amber-50 text-amber-600',
      dot: 'bg-amber-600',
    };
  }
  if (key === 'cancelled') {
    return {
      label: 'Cancelled',
      className: 'bg-slate-100 text-slate-500',
      dot: 'bg-slate-500',
    };
  }
  return {
    label: 'Failed',
    className: 'bg-red-50 text-red-600',
    dot: 'bg-red-600',
  };
}

export default function AdminBroadcastPage() {
  const { authorizedRequest } = useAdminAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const [onlineCustomers, setOnlineCustomers] = useState(0);
  const [activeProviders, setActiveProviders] = useState(0);

  const [form, setForm] = useState({
    title: '',
    body: '',
    targetAudience: 'all_users',
    language: 'en',
    scheduledAt: '',
  });

  const charCount = form.body.length;

  const loadPage = useCallback(async (targetPage) => {
    setLoading(true);
    setError('');
    try {
      const [broadcastRes, usersRes] = await Promise.all([
        authorizedRequest(`/admin/broadcasts?page=${targetPage}&limit=10`),
        authorizedRequest('/admin/users?page=1&limit=1000'),
      ]);

      const broadcastRows = Array.isArray(broadcastRes?.data) ? broadcastRes.data : [];
      const users = Array.isArray(usersRes?.data) ? usersRes.data : [];

      const customerCount = users.filter((user) => user?.role === 'customer' && user?.isActive !== false).length;
      const providerCount = users.filter((user) => user?.role === 'provider' && user?.isActive !== false).length;

      setRows(broadcastRows);
      setPagination(broadcastRes?.pagination || { page: targetPage, totalPages: 1, total: broadcastRows.length });
      setOnlineCustomers(customerCount);
      setActiveProviders(providerCount);
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load broadcasts');
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest]);

  useEffect(() => {
    loadPage(page);
  }, [loadPage, page]);

  const visibleRows = useMemo(() => rows.slice(0, 3), [rows]);

  async function submitBroadcast(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      setError('Broadcast title and message content are required.');
      return;
    }
    if (charCount > 500) {
      setError('Message content must be 500 characters or less.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        targetAudience: form.targetAudience,
        language: form.language,
        type: 'system',
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
      };

      const response = await authorizedRequest('/admin/broadcasts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const recipients = Number(response?.data?.recipients || 0);
      setSuccess(`${response?.message || 'Broadcast created'} (${recipients} recipients)`);
      setForm({ title: '', body: '', targetAudience: 'all_users', language: 'en', scheduledAt: '' });
      await loadPage(1);
      setPage(1);
    } catch (submitError) {
      setError(submitError?.message || 'Failed to send broadcast');
    } finally {
      setSaving(false);
    }
  }

  async function resendBroadcast(id) {
    setError('');
    setSuccess('');
    try {
      await authorizedRequest(`/admin/broadcasts/${id}/resend`, { method: 'POST' });
      setSuccess('Broadcast resent successfully.');
      await loadPage(page);
    } catch (actionError) {
      setError(actionError?.message || 'Failed to resend broadcast');
    }
  }

  async function cancelBroadcast(id) {
    setError('');
    setSuccess('');
    try {
      await authorizedRequest(`/admin/broadcasts/${id}/cancel`, { method: 'PUT' });
      setSuccess('Scheduled broadcast cancelled.');
      await loadPage(page);
    } catch (actionError) {
      setError(actionError?.message || 'Failed to cancel broadcast');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Broadcast Management</h1>
          <p className="text-sm text-slate-500">Communicate with your platform audience instantly</p>
        </div>
        <div className="flex gap-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {formatCountCompact(onlineCustomers)} Online Customers</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> {formatCountCompact(activeProviders)} Active Providers</span>
        </div>
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-50 p-6">
          <h2 className="flex items-center gap-2 font-bold text-slate-800">
            <span className="material-symbols-outlined text-(--primary)">campaign</span>
            Compose New Broadcast
          </h2>
        </div>

        <div className="p-6">
          <form className="space-y-6" onSubmit={submitBroadcast}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Broadcast Title</label>
                <input
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="w-full rounded-lg border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-(--primary)"
                  placeholder="e.g., Weekend Maintenance Downtime"
                  type="text"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Target Audience</label>
                <div className="relative">
                  <select
                    value={form.targetAudience}
                    onChange={(event) => setForm((prev) => ({ ...prev, targetAudience: event.target.value }))}
                    className="w-full appearance-none rounded-lg border-slate-200 bg-slate-50 py-2.5 pl-4 pr-10 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-(--primary)"
                  >
                    {AUDIENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute right-3 top-2.5 text-slate-400">expand_more</span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Language</label>
                <div className="relative">
                  <select
                    value={form.language}
                    onChange={(event) => setForm((prev) => ({ ...prev, language: event.target.value }))}
                    className="w-full appearance-none rounded-lg border-slate-200 bg-slate-50 py-2.5 pl-4 pr-10 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-(--primary)"
                  >
                    {LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute right-3 top-2.5 text-slate-400">language</span>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">Message Content</label>
                <span className={`text-[10px] font-bold uppercase tracking-tighter ${charCount > 500 ? 'text-red-500' : 'text-slate-400'}`}>
                  {charCount} / 500 characters
                </span>
              </div>
              <textarea
                value={form.body}
                onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
                className="w-full resize-none rounded-lg border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-(--primary)"
                placeholder="Type your broadcast message here..."
                rows={4}
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-50 pt-4">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <label className="mb-1 text-[10px] font-bold uppercase text-slate-400">Schedule Date/Time</label>
                  <div className="flex items-center gap-2">
                    <input
                      value={form.scheduledAt}
                      onChange={(event) => setForm((prev) => ({ ...prev, scheduledAt: event.target.value }))}
                      className="rounded-lg border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-(--primary)"
                      type="datetime-local"
                    />
                    <span className="text-xs italic font-medium text-slate-400">(Leave blank to send now)</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-(--primary) px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/10 transition-all hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-lg">send</span>
                {saving ? 'Sending...' : 'Send Notification Now'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-50 p-6">
          <h2 className="flex items-center gap-2 font-bold text-slate-800">
            <span className="material-symbols-outlined text-(--primary)">history</span>
            Broadcast History
          </h2>
          <div className="flex gap-2">
            <button type="button" className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50">
              <span className="material-symbols-outlined text-sm">filter_list</span>
              Filter
            </button>
            <button type="button" className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50">
              <span className="material-symbols-outlined text-sm">download</span>
              Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="px-6 py-4">Broadcast Title</th>
                <th className="px-6 py-4">Target Audience</th>
                <th className="px-6 py-4 text-center">Language</th>
                <th className="px-6 py-4">Sent Time</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td className="px-6 py-6 text-sm text-slate-500" colSpan={6}>Loading broadcasts...</td>
                </tr>
              ) : null}

              {!loading && !visibleRows.length ? (
                <tr>
                  <td className="px-6 py-6 text-sm text-slate-500" colSpan={6}>No broadcasts found.</td>
                </tr>
              ) : null}

              {!loading && visibleRows.map((row) => {
                const status = statusPill(row.status);
                return (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900">{row.title || 'Untitled Broadcast'}</span>
                        <span className="max-w-70 truncate text-[11px] text-slate-400">{row.body || '-'}</span>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-slate-600">
                        <span className={`material-symbols-outlined text-lg ${audienceColor(row.targetAudience)}`}>{audienceIcon(row.targetAudience)}</span>
                        <span className="text-sm">{formatAudience(row.targetAudience)}</span>
                      </div>
                    </td>

                    <td className="px-6 py-5 text-center">
                      <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{languageCode(row.language)}</span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-700">{formatDateTime(row.createdAt || row.scheduledAt)}</span>
                        <span className="text-[10px] text-slate-400">by {row.sentByName || 'Admin'}</span>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${status.className}`}>
                        <span className={`h-1 w-1 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => resendBroadcast(row.id)}
                          className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-blue-50 hover:text-(--primary)"
                          title="Resend"
                        >
                          <span className="material-symbols-outlined text-xl">refresh</span>
                        </button>

                        {String(row.status || '').toLowerCase() === 'scheduled' ? (
                          <button
                            type="button"
                            onClick={() => cancelBroadcast(row.id)}
                            className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-red-50 hover:text-red-500"
                            title="Cancel schedule"
                          >
                            <span className="material-symbols-outlined text-xl">cancel</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-blue-50 hover:text-(--primary)"
                            title="View"
                          >
                            <span className="material-symbols-outlined text-xl">visibility</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">
            Showing {visibleRows.length ? (page - 1) * 10 + 1 : 0}-{Math.min(page * 10, Number(pagination.total || 0))} of {pagination.total || 0} broadcasts
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition-all hover:bg-slate-50 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>

            {[1, 2, 3].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPage(item)}
                className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${page === item ? 'bg-(--primary) text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {item}
              </button>
            ))}

            <button
              type="button"
              disabled={page >= Number(pagination.totalPages || 1)}
              onClick={() => setPage((prev) => prev + 1)}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

