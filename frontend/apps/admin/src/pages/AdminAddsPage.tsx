import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAdminAuth } from '../lib/auth-context.tsx';

const categories = ['Seasonal Promo', 'Provider Spotlight', 'General Discount', 'Urgent Service'];

function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusBadge(status) {
  const key = String(status || '').toLowerCase();
  if (key === 'active') return 'bg-emerald-50 text-emerald-600';
  if (key === 'draft' || key === 'pending') return 'bg-slate-100 text-slate-500';
  if (key === 'paused') return 'bg-amber-50 text-amber-600';
  return 'bg-red-50 text-red-600';
}

export default function AdminAddsPage() {
  const { authorizedRequest } = useAdminAuth();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    category: 'Seasonal Promo',
    publishImmediately: true,
  });

  const loadAds = useCallback(async (targetPage) => {
    setLoading(true);
    setError('');
    try {
      const response = await authorizedRequest(`/admin/ads?page=${targetPage}&limit=20`);
      const items = Array.isArray(response?.data) ? response.data : [];
      setRows(items);
      setPagination(response?.pagination || { page: targetPage, totalPages: 1, total: items.length });
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load ads');
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest]);

  useEffect(() => {
    loadAds(page);
  }, [loadAds, page]);

  const filteredRows = useMemo(() => rows, [rows]);

  function openCreateModal() {
    setEditingId('');
    setForm({
      title: '',
      description: '',
      imageUrl: '',
      category: 'Seasonal Promo',
      publishImmediately: true,
    });
    setModalOpen(true);
  }

  function openEditModal(ad) {
    setEditingId(String(ad?._id || ''));
    setForm({
      title: ad?.title || '',
      description: ad?.description || '',
      imageUrl: ad?.imageUrl || '',
      category: ad?.category || 'General Discount',
      publishImmediately: String(ad?.status || '').toLowerCase() === 'active',
    });
    setModalOpen(true);
  }

  async function onPickImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, imageUrl: String(reader.result || '') }));
    reader.readAsDataURL(file);
  }

  async function submitAd(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.imageUrl) {
      setError('Ad title and banner image are required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        imageUrl: form.imageUrl,
        status: form.publishImmediately ? 'active' : 'pending',
      };

      if (editingId) {
        await authorizedRequest(`/admin/ads/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await authorizedRequest('/admin/ads', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setModalOpen(false);
      await loadAds(page);
    } catch (saveError) {
      setError(saveError?.message || 'Failed to save ad');
    } finally {
      setSaving(false);
    }
  }

  async function deleteAd(id) {
    try {
      await authorizedRequest(`/admin/ads/${id}`, { method: 'DELETE' });
      await loadAds(page);
    } catch (deleteError) {
      setError(deleteError?.message || 'Failed to delete ad');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ads Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage platform-wide banners, promotions, and partner spotlights.</p>
        </div>
        <button type="button" onClick={openCreateModal} className="flex items-center gap-2 rounded-lg bg-(--primary) px-5 py-2.5 font-semibold text-white shadow-sm transition-all hover:bg-blue-800">
          <span className="material-symbols-outlined text-xl">add</span>
          <span>Create New Ad</span>
        </button>
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Ad Title</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Category</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Start Date</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">End Date</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-sm text-slate-500">Loading ads...</td></tr>
              ) : null}
              {!loading && !filteredRows.length ? (
                <tr><td colSpan={6} className="px-6 py-8 text-sm text-slate-500">No ads found.</td></tr>
              ) : null}
              {!loading && filteredRows.map((row) => (
                <tr key={row._id} className="transition-colors hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-12 shrink-0 overflow-hidden rounded bg-slate-100">
                        {row.imageUrl ? <img alt="Ad" className="h-full w-full object-cover opacity-80" src={row.imageUrl} /> : null}
                      </div>
                      <span className="text-sm font-semibold tracking-tight text-slate-800">{row.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusBadge(row.status)}`}>{row.status || 'draft'}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">{row.category || 'General Discount'}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatDate(row.startsAt)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatDate(row.endsAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => openEditModal(row)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-(--primary)">
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </button>
                      <button type="button" onClick={() => deleteAd(row._id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 p-4 text-xs font-medium text-slate-500">
          <span>Showing {filteredRows.length} of {pagination.total || 0} ads</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
            <button type="button" disabled={page >= Number(pagination.totalPages || 1)} onClick={() => setPage((prev) => prev + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-150 flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{editingId ? 'Edit Ad' : 'Create New Ad'}</h2>
                <p className="mt-1 text-sm text-slate-500">Fill in the details to publish a new platform promotion.</p>
              </div>
              <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => setModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={submitAd} className="hide-scrollbar max-h-[70vh] space-y-6 overflow-y-auto p-8">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Ad Title</label>
                <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-(--primary)" placeholder="e.g. Winter Holiday Special" type="text" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Description</label>
                <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} className="w-full resize-none rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-(--primary)" placeholder="Explain the promotion details..." rows="3" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Banner Image</label>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 transition-all hover:border-slate-300 hover:bg-slate-100">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                    <span className="material-symbols-outlined">upload_file</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700">Click to upload or drag and drop</p>
                    <p className="mt-1 text-xs text-slate-400">PNG, JPG or SVG (Recommended 1200x400px)</p>
                  </div>
                </button>
                {form.imageUrl ? <img alt="Preview" src={form.imageUrl} className="h-24 w-full rounded-xl border border-slate-200 object-cover" /> : null}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Category</label>
                  <select value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-(--primary)">
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Publish Immediately</label>
                  <div className="flex h-10.5 items-center">
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input checked={form.publishImmediately} onChange={(event) => setForm((prev) => ({ ...prev, publishImmediately: event.target.checked }))} className="peer sr-only" type="checkbox" />
                      <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-(--primary) peer-checked:after:translate-x-full peer-checked:after:border-white" />
                    </label>
                  </div>
                </div>
              </div>
            </form>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 p-6">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg px-6 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-800">Discard Draft</button>
              <button type="button" onClick={submitAd} disabled={saving} className="rounded-lg bg-(--primary) px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-800 disabled:opacity-60">{saving ? 'Publishing...' : 'Publish Ad'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

