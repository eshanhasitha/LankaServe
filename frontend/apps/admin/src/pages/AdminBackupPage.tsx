import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '../lib/auth-context.tsx';

function toLevel(log) {
  const action = String(log?.action || '').toLowerCase();
  if (action.includes('fail') || action.includes('error') || action.includes('reject') || action.includes('cancel')) return 'error';
  if (action.includes('warn') || action.includes('deactivate') || action.includes('delete') || action.includes('restore')) return 'warning';
  return 'info';
}

function levelBadge(level) {
  if (level === 'error') return 'bg-red-50 text-red-600';
  if (level === 'warning') return 'bg-amber-50 text-amber-600';
  return 'bg-blue-50 text-blue-600';
}

function statusBadge(status) {
  if (status === 'success' || status === 'restored') return 'bg-emerald-50 text-emerald-600';
  if (status === 'pending' || status === 'restoring') return 'bg-amber-50 text-amber-600';
  return 'bg-red-50 text-red-600';
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).replace(',', ' •');
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function shortId(value) {
  const id = String(value || '');
  return id ? `BK-${id.slice(-8).toUpperCase()}` : '-';
}

function summarizeMessage(log) {
  const action = String(log?.action || 'event').replace(/_/g, ' ');
  const meta = log?.metadata;
  if (meta?.reason) return `${action} - ${meta.reason}`;
  if (meta?.driveFileId) return `${action} - Drive file ${String(meta.driveFileId).slice(0, 10)}...`;
  return action;
}

function moduleName(log) {
  const entity = String(log?.entity || '').toUpperCase();
  return entity || 'SYSTEM';
}

export default function AdminBackupPage() {
  const { authorizedRequest } = useAdminAuth();

  const [loading, setLoading] = useState(true);
  const [backups, setBackups] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [restoreModalBackup, setRestoreModalBackup] = useState(null);
  const [restoreInputText, setRestoreInputText] = useState('');

  async function triggerRestore(backup) {
    if (!backup) return;
    setRestoringId(backup._id);
    setError('');
    setMessage('');
    try {
      await authorizedRequest(`/admin/backups/${backup._id}/restore`, { method: 'POST' });
      setMessage('Backup restored successfully. Existing sessions may need to sign in again.');
      await loadData();
    } catch (restoreError) {
      setError(restoreError?.message || 'Failed to restore backup');
    } finally {
      setRestoringId('');
      setRestoreModalBackup(null);
      setRestoreInputText('');
    }
  }

  const loadData = useCallback(async () => {
    setError('');
    try {
      const [backupResponse, auditResponse] = await Promise.all([
        authorizedRequest('/admin/backups?page=1&limit=30'),
        authorizedRequest('/admin/audit-logs?page=1&limit=80'),
      ]);
      setBackups(Array.isArray(backupResponse?.data) ? backupResponse.data : []);
      setAuditLogs(Array.isArray(auditResponse?.data) ? auditResponse.data : []);
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load backup data');
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!autoRefresh || creating || restoringId) return undefined;
    const timer = setInterval(loadData, 15000);
    return () => clearInterval(timer);
  }, [autoRefresh, creating, loadData, restoringId]);

  const backupStats = useMemo(() => {
    const successful = backups.filter((item) => item.status === 'success' || item.status === 'restored');
    const failed = backups.filter((item) => item.status === 'failed');
    const latest = backups[0];
    return {
      successful: successful.length,
      failed: failed.length,
      latestAt: latest?.createdAt ? formatDateTime(latest.createdAt) : 'No backups yet',
      totalSize: formatBytes(successful.reduce((sum, item) => sum + Number(item.sizeBytes || 0), 0)),
    };
  }, [backups]);

  const errorCount = useMemo(() => auditLogs.filter((log) => toLevel(log) === 'error').length, [auditLogs]);
  const errorRate = useMemo(() => {
    if (!auditLogs.length) return 0;
    return Number(((errorCount / auditLogs.length) * 100).toFixed(2));
  }, [auditLogs.length, errorCount]);

  const liveLogs = useMemo(() => auditLogs.slice(0, 6).map((log) => ({
    id: String(log?._id || Math.random()),
    timestamp: formatTime(log?.createdAt),
    level: toLevel(log),
    module: moduleName(log),
    message: summarizeMessage(log),
  })), [auditLogs]);

  async function handleManualBackup() {
    setCreating(true);
    setError('');
    setMessage('');
    try {
      const response = await authorizedRequest('/admin/backups', { method: 'POST' });
      setMessage('Backup uploaded to Google Drive successfully.');
      if (response?.data) {
        setBackups((prev) => [response.data, ...prev.filter((item) => item._id !== response.data._id)]);
      }
      await loadData();
    } catch (backupError) {
      setError(backupError?.message || 'Failed to create backup');
    } finally {
      setCreating(false);
    }
  }

  function handleRestore(backup) {
    setRestoreModalBackup(backup);
    setRestoreInputText('');
  }

  function clearLogs() {
    setAuditLogs([]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Backup & Monitoring</h1>
          <p className="mt-1 text-sm text-slate-500">Create MongoDB snapshots, upload them to Google Drive, and restore selected backups.</p>
        </div>
        <button
          type="button"
          onClick={handleManualBackup}
          disabled={creating || Boolean(restoringId)}
          className="flex items-center gap-2 rounded-2xl bg-(--primary) px-5 py-3 font-bold text-white transition-all hover:bg-[#253D80] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-xl">{creating ? 'hourglass_top' : 'cloud_upload'}</span>
          <span className="text-sm">{creating ? 'Running Backup...' : 'Run Drive Backup'}</span>
        </button>
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}


      <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Drive Backups</p>
            <span className="material-symbols-outlined text-blue-500">cloud_done</span>
          </div>
          <div className="text-4xl font-bold leading-tight text-slate-900">{backupStats.successful}</div>
          <p className="mt-2 text-xs text-slate-400">Successful snapshots</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Latest Backup</p>
            <span className="material-symbols-outlined text-emerald-500">history</span>
          </div>
          <div className="text-lg font-bold leading-tight text-slate-900">{backupStats.latestAt}</div>
          <p className="mt-2 text-xs text-slate-400">Most recent run</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Stored Size</p>
            <span className="material-symbols-outlined text-blue-500">database</span>
          </div>
          <div className="text-4xl font-bold leading-tight text-slate-900">{backupStats.totalSize}</div>
          <p className="mt-2 text-xs text-slate-400">Total successful backup size</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Error Rate</p>
            <span className="material-symbols-outlined text-emerald-500">shield</span>
          </div>
          <div className="text-4xl font-bold leading-tight text-slate-900">{errorRate}%</div>
          <p className="mt-2 text-xs text-slate-400">{backupStats.failed} failed backup records</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Drive Backups</h2>
            <p className="text-sm text-slate-400">Snapshots are uploaded as Extended JSON files in Google Drive.</p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-xs font-bold uppercase tracking-widest text-slate-400">
                <th className="px-6 py-4">Backup ID</th>
                <th className="px-6 py-4">File</th>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Collections</th>
                <th className="px-6 py-4">Size</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-sm text-slate-500">Loading backups...</td>
                </tr>
              ) : null}
              {!loading && !backups.length ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">No backups yet. Run the first Drive backup.</td>
                </tr>
              ) : null}
              {!loading && backups.map((row) => {
                const canRestore = row.status === 'success' || row.status === 'restored';
                return (
                  <tr key={row._id}>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700">{shortId(row._id)}</td>
                    <td className="max-w-xs truncate px-6 py-4 text-sm text-slate-600" title={row.fileName}>{row.fileName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDateTime(row.createdAt)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.collections?.length || 0}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatBytes(row.sizeBytes)}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusBadge(row.status)}`}>{row.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {row.driveWebViewLink ? (
                          <a
                            href={row.driveWebViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                          >
                            Drive
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleRestore(row)}
                          disabled={!canRestore || Boolean(restoringId) || creating}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {restoringId === row._id ? 'Restoring...' : 'Restore'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Live System Logs</h2>
            <p className="text-sm text-slate-400">Audit events from admin and backup activity.</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span>Auto-refresh</span>
              <button
                type="button"
                onClick={() => setAutoRefresh((prev) => !prev)}
                className={`relative h-6 w-12 rounded-full transition-all ${autoRefresh ? 'bg-(--primary)' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${autoRefresh ? 'left-6' : 'left-0.5'}`} />
              </button>
            </label>
            <button type="button" onClick={clearLogs} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Clear Logs</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-xs font-bold uppercase tracking-widest text-slate-400">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Level</th>
                <th className="px-6 py-4">Module</th>
                <th className="px-6 py-4">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-sm text-slate-500">Loading logs...</td>
                </tr>
              ) : null}
              {!loading && !liveLogs.length ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-sm text-slate-500">No logs available.</td>
                </tr>
              ) : null}
              {!loading && liveLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 font-mono text-sm text-slate-500">{log.timestamp}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${levelBadge(log.level)}`}>{log.level}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-600">{log.module}</td>
                  <td className={`px-6 py-4 text-sm ${log.level === 'error' ? 'text-red-500' : 'text-slate-600'}`}>{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {restoreModalBackup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Confirm Database Restore</h3>
              <button
                type="button"
                onClick={() => setRestoreModalBackup(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <p className="text-sm text-slate-600">
              Restoring <span className="font-semibold text-slate-900">{restoreModalBackup.fileName}</span> will replace current database collections with snapshot data.
            </p>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Type <strong className="font-mono">RESTORE</strong> below to confirm.
            </div>
            <input
              type="text"
              value={restoreInputText}
              onChange={(e) => setRestoreInputText(e.target.value)}
              placeholder="Type RESTORE"
              className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRestoreModalBackup(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={restoreInputText.trim().toUpperCase() !== 'RESTORE' || Boolean(restoringId)}
                onClick={() => triggerRestore(restoreModalBackup)}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {restoringId ? 'Restoring...' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

