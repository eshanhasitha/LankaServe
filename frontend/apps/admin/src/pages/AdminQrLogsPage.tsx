import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '../lib/auth-context.tsx';

function formatTimestamp(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateOnly(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildLogCode(row, index) {
  const id = String(row?._id || '');
  if (id.length >= 4) return `QR-${id.slice(-4).toUpperCase()}`;
  return `QR-${String(index + 1).padStart(4, '0')}`;
}

function statusUi(status) {
  const key = String(status || '').toLowerCase();
  if (key === 'success') {
    return {
      label: 'VERIFIED',
      rowClass: 'bg-emerald-100 text-emerald-700',
      dotClass: 'bg-emerald-500',
      ok: true,
    };
  }
  return {
    label: 'FAILED',
    rowClass: 'bg-red-100 text-red-700',
    dotClass: 'bg-red-500',
    ok: false,
  };
}

function Avatar({ name, image }) {
  const initial = String(name || 'U').trim().charAt(0).toUpperCase() || 'U';
  if (image) {
    return <img alt={name || 'User'} className="h-8 w-8 rounded-full object-cover" src={image} />;
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500">
      {initial}
    </div>
  );
}

export default function AdminQrLogsPage() {
  const { authorizedRequest } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [userMap, setUserMap] = useState(new Map());
  const [jobMap, setJobMap] = useState(new Map());
  const [selectedId, setSelectedId] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadLogs = useCallback(async (targetPage) => {
    setLoading(true);
    setError('');
    try {
      const [logsResponse, usersResponse, jobsResponse] = await Promise.all([
        authorizedRequest(`/admin/qr-logs?page=${targetPage}&limit=20`),
        authorizedRequest('/admin/users?page=1&limit=300'),
        authorizedRequest('/admin/jobs?page=1&limit=300'),
      ]);

      const logs = Array.isArray(logsResponse?.data) ? logsResponse.data : [];
      const users = Array.isArray(usersResponse?.data) ? usersResponse.data : [];
      const jobs = Array.isArray(jobsResponse?.data) ? jobsResponse.data : [];

      setRows(logs);
      setPagination(logsResponse?.pagination || { page: targetPage, totalPages: 1, total: logs.length });
      setUserMap(new Map(users.map((user) => [String(user._id), user])));
      setJobMap(new Map(jobs.map((job) => [String(job._id), job])));
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load QR logs');
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest]);

  useEffect(() => {
    loadLogs(page);
  }, [loadLogs, page]);

  const normalizedRows = useMemo(() => {
    return rows.map((row, index) => {
      const job = jobMap.get(String(row?.jobId || ''));
      const consumerId = String(row?.scannedBy || job?.customerId || '');
      const providerId = String(job?.providerId || '');
      const consumer = userMap.get(consumerId);
      const provider = userMap.get(providerId);
      return {
        _id: String(row?._id || index),
        raw: row,
        timestampText: formatTimestamp(row?.createdAt),
        dateOnly: formatDateOnly(row?.createdAt),
        timeOnly: new Date(row?.createdAt || Date.now()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        logCode: buildLogCode(row, index),
        providerName: provider?.name || 'Unknown',
        providerImage: provider?.profileImage || '',
        consumerName: consumer?.name || 'Unknown',
        consumerImage: consumer?.profileImage || '',
        status: statusUi(row?.status),
      };
    });
  }, [jobMap, rows, userMap]);

  const selectedLog = useMemo(() => {
    if (!normalizedRows.length) return null;
    const match = normalizedRows.find((row) => row._id === selectedId);
    return match || normalizedRows[0];
  }, [normalizedRows, selectedId]);

  useEffect(() => {
    if (!normalizedRows.length) {
      setSelectedId('');
      setDrawerOpen(false);
      return;
    }
    if (!selectedId) {
      setSelectedId(normalizedRows[0]._id);
    }
  }, [normalizedRows, selectedId]);

  return (
    <div className={`${drawerOpen ? 'mr-105' : 'mr-0'} transition-all duration-200`}>
      <div className="mx-auto max-w-275 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">QR Verification Logs</h1>
            <p className="text-sm text-slate-500">Security audit for on-site service validation</p>
          </div>
          <div className="flex gap-3">
            <button type="button" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold transition-all hover:bg-slate-50">
              <span className="material-symbols-outlined text-lg">filter_list</span>
              Filter
            </button>
            <button type="button" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold transition-all hover:bg-slate-50">
              <span className="material-symbols-outlined text-lg">download</span>
              Export
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Log ID</th>
                  <th className="px-6 py-4">Provider</th>
                  <th className="px-6 py-4">Consumer</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-sm text-slate-500">Loading QR logs...</td></tr>
                ) : null}
                {!loading && error ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-sm text-red-600">{error}</td></tr>
                ) : null}
                {!loading && !error && !normalizedRows.length ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-sm text-slate-500">No QR logs found.</td></tr>
                ) : null}

                {!loading && !error && normalizedRows.map((row) => (
                  <tr
                    key={row._id}
                    className={`cursor-pointer transition-colors ${drawerOpen && selectedLog?._id === row._id ? 'bg-blue-50/30' : 'hover:bg-slate-50/80'}`}
                    onClick={() => {
                      setSelectedId(row._id);
                      setDrawerOpen(true);
                    }}
                  >
                    <td className="px-6 py-5 text-sm text-slate-600">{row.timestampText}</td>
                    <td className="px-6 py-5 font-mono text-xs font-semibold text-slate-500">{row.logCode}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={row.providerName} image={row.providerImage} />
                        <span className="text-sm font-semibold">{row.providerName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={row.consumerName} image={row.consumerImage} />
                        <span className="text-sm font-semibold">{row.consumerName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${row.status.rowClass}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${row.status.dotClass}`} />
                        {row.status.label}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedId(row._id);
                          setDrawerOpen(true);
                        }}
                      >
                        <span className="material-symbols-outlined text-xl">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {drawerOpen && selectedLog ? (
        <aside className="fixed inset-y-0 right-0 z-50 flex w-105 shrink-0 flex-col border-l border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-100 p-6">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-400">LOG ID: {selectedLog.logCode}</span>
              <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => setDrawerOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full border-4 ${selectedLog.status.ok ? 'border-emerald-50/50 bg-emerald-50 text-emerald-500' : 'border-red-50/50 bg-red-50 text-red-500'}`}>
                <span className="material-symbols-outlined text-4xl font-bold">{selectedLog.status.ok ? 'check_circle' : 'cancel'}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">{selectedLog.status.ok ? 'Verification Successful' : 'Verification Failed'}</h2>
              <p className="mt-1 text-sm text-slate-500">Validated on {selectedLog.dateOnly}</p>
            </div>
          </div>

          <div className="hide-scrollbar flex-1 space-y-8 overflow-y-auto p-6">
            <section>
              <h3 className="mb-6 text-xs font-bold uppercase tracking-widest text-slate-400">Security Timeline</h3>
              <div className="relative ml-1 space-y-6 border-l-2 border-slate-200 pl-6">
                <div className="relative">
                  <span className={`absolute -left-7.75 top-1 h-4 w-4 rounded-full border-2 border-white shadow-sm ${selectedLog.status.ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <p className="text-sm font-semibold text-slate-900">Verification {selectedLog.status.ok ? 'Completed' : 'Failed'}</p>
                  <p className="text-xs text-slate-500">{selectedLog.timeOnly}</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-7.75 top-1 h-4 w-4 rounded-full border-2 border-white bg-slate-300 shadow-sm" />
                  <p className="text-sm font-semibold text-slate-900">Service Scanned</p>
                  <p className="text-xs text-slate-500">2:28 PM</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-7.75 top-1 h-4 w-4 rounded-full border-2 border-white bg-slate-300 shadow-sm" />
                  <p className="text-sm font-semibold text-slate-900">QR Code Generated</p>
                  <p className="text-xs text-slate-500">2:15 PM</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Scan Location</h3>
              <div className="group relative h-50 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <div className="absolute inset-0 bg-slate-200 bg-size-[16px_16px] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <span className="material-symbols-outlined animate-bounce text-4xl text-(--primary)">location_on</span>
                    <div className="absolute -bottom-1 left-1/2 h-1.5 w-4 -translate-x-1/2 rounded-[100%] bg-black/10 blur-[2px]" />
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-lg bg-white/90 px-3 py-2 text-[10px] font-medium text-slate-600 shadow-sm backdrop-blur">
                  <span>Colombo, Western Province</span>
                  <span className="text-slate-400">6.9271 N, 79.8612 E</span>
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Technical Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-tighter text-slate-400">Device</p>
                  <p className="truncate text-sm font-semibold text-slate-700">iPhone 15 Pro</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-tighter text-slate-400">Network</p>
                  <p className="truncate text-sm font-semibold text-slate-700">Dialog 4G</p>
                </div>
                <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-tighter text-slate-400">IP Address</p>
                  <p className="text-sm font-semibold text-slate-700">122.255.48.192</p>
                </div>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-white p-6">
            <button type="button" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50">
              <span className="material-symbols-outlined text-lg">print</span>
              Print Receipt
            </button>
            <button type="button" className="flex items-center justify-center gap-2 rounded-xl border-2 border-red-100 px-4 py-2.5 text-sm font-bold text-red-600 transition-all hover:bg-red-50">
              <span className="material-symbols-outlined text-lg">flag</span>
              Flag Log
            </button>
          </div>
        </aside>
      ) : null}
    </div>
  );
}

