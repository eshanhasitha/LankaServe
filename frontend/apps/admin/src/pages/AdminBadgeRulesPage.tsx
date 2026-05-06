import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '../lib/auth-context.tsx';

const badgeAppearance = {
  ELITE_PROVIDER: { icon: 'stars', wrapper: 'bg-amber-50 text-amber-600' },
  TOP_RATED: { icon: 'stars', wrapper: 'bg-amber-50 text-amber-600' },
  TRUSTED_EXPERT: { icon: 'verified', wrapper: 'bg-indigo-50 text-indigo-600' },
  RELIABLE: { icon: 'verified', wrapper: 'bg-indigo-50 text-indigo-600' },
  RISING_STAR: { icon: 'rocket_launch', wrapper: 'bg-slate-100 text-slate-500' },
  FAST_RESPONDER: { icon: 'bolt', wrapper: 'bg-sky-50 text-sky-600' },
};

function toCode(name = '') {
  return String(name).trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function criteriaSummary(rule) {
  const parts = [];
  const minRating = Number(rule?.minRating || 0);
  const minJobs = Number(rule?.minCompletedJobs || 0);
  const maxResponse = Number(rule?.maxResponseTimeMinutes || 0);

  if (minRating > 0) parts.push(`Rating > ${minRating}`);
  if (minJobs > 0) parts.push(`${minJobs}+ Jobs`);
  if (maxResponse > 0) parts.push(`Response Time < ${maxResponse} mins`);

  if (parts.length) return parts.join(' & ');

  const fallbackByCode = {
    TOP_RATED: 'Rating > 4.5 & 20+ Jobs',
    RELIABLE: 'Completion Rate > 95%',
    FAST_RESPONDER: 'Response Time < 5 mins',
    NEWLY_VERIFIED: 'Verified & fewer than 5 jobs',
    EXPERT_SELLER: 'Rating > 4.7 & 50+ Jobs',
  };

  return fallbackByCode[String(rule?.code || '')] || 'No criteria configured';
}

export default function AdminBadgeRulesPage() {
  const { authorizedRequest } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    minRating: 4.5,
    minCompletedJobs: 20,
    maxResponseTimeMinutes: 15,
    isActive: true,
  });

  const loadRules = useCallback(async (targetPage) => {
    setLoading(true);
    setError('');
    try {
      const response = await authorizedRequest(`/admin/badge-rules?page=${targetPage}&limit=20`);
      const items = Array.isArray(response?.data) ? response.data : [];
      setRows(items);
      setPagination(response?.pagination || { page: targetPage, totalPages: 1, total: items.length });
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load badge rules');
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest]);

  useEffect(() => {
    loadRules(page);
  }, [loadRules, page]);

  const normalizedRows = useMemo(() => {
    return rows.map((row) => {
      const code = String(row?.code || toCode(row?.name || ''));
      const appearance = badgeAppearance[code] || { icon: 'military_tech', wrapper: 'bg-slate-100 text-slate-600' };
      return {
        ...row,
        code,
        icon: appearance.icon,
        iconWrapper: appearance.wrapper,
        summary: criteriaSummary(row),
      };
    });
  }, [rows]);

  function openCreateModal() {
    setEditingId('');
    setForm({
      name: '',
      minRating: 4.5,
      minCompletedJobs: 20,
      maxResponseTimeMinutes: 15,
      isActive: true,
    });
    setModalOpen(true);
  }

  function openEditModal(rule) {
    setEditingId(String(rule?._id || ''));
    setForm({
      name: rule?.name || '',
      minRating: Number(rule?.minRating || 0),
      minCompletedJobs: Number(rule?.minCompletedJobs || 0),
      maxResponseTimeMinutes: Number(rule?.maxResponseTimeMinutes || 0),
      isActive: Boolean(rule?.isActive),
    });
    setModalOpen(true);
  }

  async function submitRule(event) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Badge name is required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        minRating: Number(form.minRating || 0),
        minCompletedJobs: Number(form.minCompletedJobs || 0),
        maxResponseTimeMinutes: Number(form.maxResponseTimeMinutes || 0),
        isActive: Boolean(form.isActive),
      };

      if (editingId) {
        await authorizedRequest(`/admin/badge-rules/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await authorizedRequest('/admin/badge-rules', {
          method: 'POST',
          body: JSON.stringify({ ...payload, code: toCode(payload.name) }),
        });
      }

      setModalOpen(false);
      await loadRules(page);
    } catch (saveError) {
      setError(saveError?.message || 'Failed to save badge rule');
    } finally {
      setSaving(false);
    }
  }

  async function removeRule(id) {
    try {
      await authorizedRequest(`/admin/badge-rules/${id}`, { method: 'DELETE' });
      await loadRules(page);
    } catch (removeError) {
      setError(removeError?.message || 'Failed to delete badge rule');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Badge Rules</h1>
        <button type="button" onClick={openCreateModal} className="flex items-center gap-2 rounded-xl bg-(--primary) px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#253D80]">
          <span className="material-symbols-outlined text-xl">add</span>
          Add New Rule
        </button>
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="px-8 py-4">Badge Name</th>
                <th className="px-8 py-4">Criteria Summary</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={4} className="px-8 py-6 text-sm text-slate-500">Loading badge rules...</td></tr>
              ) : null}
              {!loading && !normalizedRows.length ? (
                <tr><td colSpan={4} className="px-8 py-6 text-sm text-slate-500">No badge rules found.</td></tr>
              ) : null}

              {!loading && normalizedRows.map((row) => (
                <tr key={row._id} className="transition-colors hover:bg-slate-50/50">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${row.iconWrapper}`}>
                        <span className="material-symbols-outlined">{row.icon}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-800">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm text-slate-600">{row.summary}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${row.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {row.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => openEditModal(row)} className="rounded-lg p-2 text-slate-400 transition-all hover:bg-blue-50 hover:text-(--primary)">
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button type="button" onClick={() => removeRule(row._id)} className="rounded-lg p-2 text-slate-400 transition-all hover:bg-red-50 hover:text-red-500">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-50 px-8 py-4">
          <span className="text-xs font-medium text-slate-500">Showing {normalizedRows.length} of {pagination.total || 0} badge rules</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))} className="p-1.5 text-slate-400 transition hover:text-slate-600 disabled:opacity-30">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button type="button" disabled={page >= Number(pagination.totalPages || 1)} onClick={() => setPage((prev) => prev + 1)} className="p-1.5 text-slate-400 transition hover:text-slate-600 disabled:opacity-30">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-130 flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
              <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Edit Badge Rule' : 'Add Badge Rule'}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 transition-colors hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form id="badge-rule-form" onSubmit={submitRule} className="space-y-5 px-8 py-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Badge Name</label>
                <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-(--primary)" type="text" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Minimum Rating</label>
                  <input value={form.minRating} onChange={(event) => setForm((prev) => ({ ...prev, minRating: event.target.value }))} className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-(--primary)" step="0.1" type="number" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Min. Completed Jobs</label>
                  <input value={form.minCompletedJobs} onChange={(event) => setForm((prev) => ({ ...prev, minCompletedJobs: event.target.value }))} className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-(--primary)" type="number" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Max Response Time (minutes)</label>
                <input value={form.maxResponseTimeMinutes} onChange={(event) => setForm((prev) => ({ ...prev, maxResponseTimeMinutes: event.target.value }))} className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-(--primary)" type="number" />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Rule Active</p>
                  <p className="text-xs text-slate-500">Toggle whether this badge is currently earnable</p>
                </div>
                <label className="relative inline-flex h-6 w-12 cursor-pointer items-center">
                  <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} className="peer sr-only" />
                  <span className="absolute inset-0 rounded-full bg-slate-200 transition peer-checked:bg-(--primary)" />
                  <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full border border-slate-200 bg-white transition peer-checked:translate-x-6 peer-checked:border-white" />
                </label>
              </div>
            </form>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-8 py-6">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100">Cancel</button>
              <button type="submit" form="badge-rule-form" disabled={saving} className="rounded-xl bg-(--primary) px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#253D80] disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

