import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '../lib/auth-context.tsx';
import { TableSkeletonRows } from '../components/AdminSkeletons.tsx';
import { apiRequest } from '../lib/api.ts';

const tabs = [
  { key: 'pending', label: 'Pending Verification' },
  { key: 'verified', label: 'Verified' },
  { key: 'rejected', label: 'Rejected' },
];

function docNameFromUrl(url, index) {
  if (!url) return `Document ${index + 1}`;
  const last = url.split('/').pop() || '';
  const normalized = last.split('?')[0].replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ');
  const cleaned = normalized.trim();
  if (!cleaned) return `Document ${index + 1}`;
  return cleaned.length > 16 ? `${cleaned.slice(0, 16)}...` : cleaned;
}

function experienceLabel(years) {
  const value = Number(years || 0);
  if (value <= 0) return 'New';
  if (value < 1) return '<1 Year';
  return `${value}+ Years`;
}

function ProviderAvatar({ name, image }) {
  const initial = String(name || 'P').trim().charAt(0).toUpperCase() || 'P';
  if (image) {
    return <img alt={name || 'Provider'} className="h-9 w-9 rounded-full object-cover shadow-sm" src={image} />;
  }
  return <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">{initial}</div>;
}

export default function AdminProvidersPage() {
  const { authorizedRequest } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [providers, setProviders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedId, setSelectedId] = useState('');
  const [notes, setNotes] = useState('');
  const [working, setWorking] = useState(false);
  const [rejectedIds, setRejectedIds] = useState(() => new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadProviders = useCallback(async (targetPage) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiRequest(`/providers?page=${targetPage}&limit=20`);
      const rows = Array.isArray(response?.data) ? response.data : [];
      setProviders(rows);
      setPagination(response?.pagination || { page: targetPage, totalPages: 1, total: rows.length });
      if (!selectedId && rows.length > 0) {
        setSelectedId(String(rows[0]._id));
      }
    } catch (loadError) {
      setError(loadError.message || 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadProviders(page);
  }, [loadProviders, page]);

  const filteredProviders = useMemo(() => {
    return providers.filter((provider) => {
      const id = String(provider?._id || '');
      const isRejected = rejectedIds.has(id);
      if (activeTab === 'rejected') return isRejected;
      if (activeTab === 'verified') return provider?.verified && !isRejected;
      return !provider?.verified && !isRejected;
    });
  }, [providers, activeTab, rejectedIds]);

  const selectedProvider = useMemo(() => {
    if (!filteredProviders.length) return null;
    const existing = filteredProviders.find((item) => String(item._id) === selectedId);
    return existing || filteredProviders[0];
  }, [filteredProviders, selectedId]);

  useEffect(() => {
    if (selectedProvider && String(selectedProvider._id) !== selectedId) {
      setSelectedId(String(selectedProvider._id));
    }
  }, [selectedProvider, selectedId]);

  useEffect(() => {
    if (!selectedProvider) {
      setDrawerOpen(false);
    }
  }, [selectedProvider]);

  async function approveProvider() {
    if (!selectedProvider || working) return;
    try {
      setWorking(true);
      await authorizedRequest(`/admin/providers/${selectedProvider._id}/verify`, { method: 'PUT' });
      await loadProviders(page);
      setNotes('');
    } catch (actionError) {
      setError(actionError.message || 'Failed to verify provider');
    } finally {
      setWorking(false);
    }
  }

  function rejectProvider() {
    if (!selectedProvider || working) return;
    setRejectedIds((prev) => new Set([...prev, String(selectedProvider._id)]));
    setNotes('');
  }

  return (
    <div className={`${drawerOpen ? 'mr-105' : 'mr-0'} space-y-6 transition-all duration-200`}>
      <h1 className="text-xl font-bold text-slate-800">Provider Verification</h1>

      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm transition-all ${
                activeTab === tab.key
                  ? 'border-(--primary) font-semibold text-(--primary)'
                  : 'border-transparent font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {error ? <p className="px-6 py-4 text-sm text-red-700">{error}</p> : null}

        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="px-6 py-4">Provider Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Experience</th>
                  <th className="px-6 py-4">Service Area</th>
                  <th className="px-6 py-4">Documents</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <TableSkeletonRows columns={6} rows={5} widths={['w-44', 'w-28', 'w-24', 'w-28', 'w-24', 'w-20']} />
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
                    <th className="px-6 py-4">Provider Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Experience</th>
                    <th className="px-6 py-4">Service Area</th>
                    <th className="px-6 py-4">Documents</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProviders.map((row) => {
                    const isSelected = String(row._id) === String(selectedProvider?._id || '');
                    const user = row?.userId || {};
                    const isRejected = rejectedIds.has(String(row._id));
                    const statusLabel = isRejected ? 'Rejected' : row?.verified ? 'Verified' : 'Pending';
                    const statusClass = isRejected
                      ? 'border border-red-100 bg-red-50 text-red-600'
                      : row?.verified
                        ? 'border border-emerald-100 bg-emerald-50 text-emerald-600'
                        : 'border border-amber-100 bg-amber-50 text-amber-600';
                    const docsCount = Array.isArray(row?.verificationDocs) ? row.verificationDocs.length : 0;

                    return (
                      <tr
                        key={row._id}
                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50 hover:bg-blue-50/60' : 'hover:bg-slate-50'}`}
                        onClick={() => {
                          setSelectedId(String(row._id));
                          setDrawerOpen(true);
                        }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <ProviderAvatar name={user?.name} image={user?.profileImage} />
                            <div>
                              <p className="text-sm font-bold text-slate-900">{user?.name || 'Unnamed Provider'}</p>
                              <p className="text-[10px] text-slate-500">ID: PRV-{String(row?._id || '').slice(-4).toUpperCase()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{row?.categories?.[0] || 'Other'}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{experienceLabel(row?.yearsExperience)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{row?.district || row?.city || 'Sri Lanka'}</td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1 text-sm font-semibold text-(--primary)">
                            <span className="material-symbols-outlined text-lg">description</span>
                            View {docsCount} Docs
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${statusClass}`}>{statusLabel}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredProviders.length ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">No providers in this tab.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
              <p className="text-xs text-slate-500">Showing {filteredProviders.length} of {pagination?.total || 0} provider applications</p>
              <div className="flex gap-2">
                <button
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  Previous
                </button>
                <button
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  disabled={page >= Number(pagination?.totalPages || 1)}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {drawerOpen ? (
        <aside className="fixed inset-y-0 right-0 z-50 flex w-105 flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <h2 className="font-bold text-slate-800">Verification Review</h2>
          <button
            className="text-slate-400 hover:text-slate-600"
            type="button"
            onClick={() => setDrawerOpen(false)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="hide-scrollbar flex-1 space-y-8 overflow-y-auto p-6">
          {selectedProvider ? (
            <>
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <ProviderAvatar
                    name={selectedProvider?.userId?.name}
                    image={selectedProvider?.userId?.profileImage}
                  />
                  <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-amber-500">
                    <span className="material-symbols-outlined text-[14px] text-white">priority_high</span>
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{selectedProvider?.userId?.name || 'Provider'}</h3>
                <p className="text-xs font-medium text-slate-500">{selectedProvider?.categories?.join(' & ') || 'Service Provider'}</p>
                <div className="mt-4 grid w-full grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3 text-left">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Phone</p>
                    <p className="text-xs font-semibold text-slate-700">-</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 text-left">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Email</p>
                    <p className="truncate text-xs font-semibold text-slate-700">{selectedProvider?.userId?.email || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Documents Review</h4>
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                    {(selectedProvider?.verificationDocs || []).length} Uploaded
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(selectedProvider?.verificationDocs || []).slice(0, 3).map((docUrl, index) => (
                    <div key={docUrl || index} className="group cursor-pointer space-y-2">
                      <div className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        {docUrl ? (
                          <img alt={docNameFromUrl(docUrl, index)} className="h-full w-full object-cover transition-transform group-hover:scale-110" src={docUrl} />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined">description</span>
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="material-symbols-outlined text-white">visibility</span>
                        </div>
                      </div>
                      <p className="truncate text-center text-[10px] font-semibold text-slate-600">{docNameFromUrl(docUrl, index)}</p>
                    </div>
                  ))}
                  {(selectedProvider?.verificationDocs || []).length === 0 ? (
                    <p className="col-span-3 text-xs text-slate-500">No verification documents uploaded.</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-800">Verification Notes</label>
                <textarea
                  className="h-32 w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm placeholder:text-slate-400 transition-all focus:border-transparent focus:bg-white focus:ring-2 focus:ring-(--primary)"
                  placeholder="Enter comments for approval or reasons for rejection..."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="material-symbols-outlined text-sm">info</span>
                  <span>Notes will be visible to other admins and included in rejection emails.</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Select a provider to review.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 bg-slate-50/50 p-6">
          <button
            className="rounded-xl border border-red-500 px-4 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={rejectProvider}
            disabled={!selectedProvider || working}
          >
            Reject
          </button>
          <button
            className="rounded-xl bg-(--primary) px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={approveProvider}
            disabled={!selectedProvider || working || selectedProvider?.verified}
          >
            {working ? 'Processing...' : 'Approve & Verify'}
          </button>
        </div>
        </aside>
      ) : null}
    </div>
  );
}

