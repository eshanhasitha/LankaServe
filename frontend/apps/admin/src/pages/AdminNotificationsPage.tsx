import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../lib/auth-context.tsx';
import { TableSkeletonRows } from '../components/AdminSkeletons.tsx';

const tabs = ['All', 'Jobs', 'Payments', 'Reviews', 'System'];

function typeForTab(tab) {
  if (tab === 'Jobs') return 'job';
  if (tab === 'Payments') return 'payment';
  if (tab === 'System' || tab === 'Reviews') return 'system';
  return '';
}

function iconForType(type, data = {}) {
  if (type === 'job') return { icon: 'assignment', wrap: 'bg-blue-50 text-blue-600' };
  if (type === 'payment') return { icon: 'account_balance_wallet', wrap: 'bg-emerald-50 text-emerald-600' };
  if (data?.category === 'support') return { icon: 'support_agent', wrap: 'bg-amber-50 text-amber-600' };
  return { icon: 'notifications', wrap: 'bg-slate-100 text-slate-600' };
}

function fallbackTime(value) {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const diff = Date.now() - date.getTime();
  const mins = Math.max(1, Math.floor(diff / 60000));
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

export default function AdminNotificationsPage() {
  const { authorizedRequest } = useAdminAuth();
  const [activeTab, setActiveTab] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const response = await authorizedRequest('/admin/notifications?page=1&limit=30');
      setNotifications(Array.isArray(response?.data) ? response.data : []);
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load notifications');
      setNotifications([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [authorizedRequest]);

  useEffect(() => {
    loadNotifications();
    const intervalId = window.setInterval(() => loadNotifications(true), 15000);
    return () => window.clearInterval(intervalId);
  }, [loadNotifications]);

  const filtered = useMemo(() => {
    const type = typeForTab(activeTab);
    if (!type) return notifications;
    if (activeTab === 'Reviews') {
      return notifications.filter((item) => String(item?.data?.category || '').toLowerCase() === 'review');
    }
    return notifications.filter((item) => String(item?.type || '').toLowerCase() === type);
  }, [activeTab, notifications]);

  async function markRead(id) {
    if (!id) return;
    setNotifications((prev) => prev.map((item) => (item._id === id ? { ...item, isRead: true } : item)));
    try {
      await authorizedRequest(`/admin/notifications/${encodeURIComponent(id)}/read`, { method: 'PUT' });
    } catch {
      // Keep optimistic UI; synthetic admin notifications are read-only by design.
    }
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    try {
      await authorizedRequest('/admin/notifications/read-all', { method: 'PUT' });
    } catch {
      // Keep optimistic UI.
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">Monitor admin alerts, support requests, and platform events.</p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <span className="material-symbols-outlined text-lg">done_all</span>
          Mark all as read
        </button>
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="flex items-center gap-8 border-b border-slate-200 px-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-semibold transition-colors ${
              activeTab === tab ? 'border-b-2 border-(--primary) text-(--primary)' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-left">
            <tbody>
              <TableSkeletonRows columns={1} rows={5} widths={['w-full']} />
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading ? (
        <div className="space-y-3">
          {filtered.map((item) => {
            const icon = iconForType(String(item.type || '').toLowerCase(), item.data || {});
            const jobId = item?.data?.jobId;
            const supportId = item?.data?.supportRequestId;
            return (
              <article
                key={item._id}
                className={`flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-blue-100 ${
                  item.isRead ? 'opacity-80' : ''
                }`}
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${icon.wrap}`}>
                  <span className="material-symbols-outlined">{icon.icon}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold text-slate-900">{item.title || 'Notification'}</h2>
                        {item?.data?.ticketNumber ? (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">{item.data.ticketNumber}</span>
                        ) : null}
                        {item?.data?.entityId ? (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">#{String(item.data.entityId).slice(-6)}</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.body || ''}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-slate-400">{item.timeLabel || fallbackTime(item.eventAt || item.createdAt || item.updatedAt)}</span>
                      {!item.isRead ? <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> : null}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {jobId ? (
                      <Link
                        className="rounded-lg bg-(--primary) px-4 py-1.5 text-xs font-bold text-white hover:bg-[#253D80]"
                        to={`/jobs`}
                      >
                        View Job
                      </Link>
                    ) : null}
                    {supportId ? (
                      <Link
                        className="rounded-lg bg-(--primary) px-4 py-1.5 text-xs font-bold text-white hover:bg-[#253D80]"
                        to={`/support/requests?ticket=${encodeURIComponent(supportId)}`}
                      >
                        Open Support
                      </Link>
                    ) : null}
                    {!item.isRead ? (
                      <button
                        type="button"
                        onClick={() => markRead(item._id)}
                        className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Mark read
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}

          {!filtered.length ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
              <span className="material-symbols-outlined text-4xl text-slate-300">notifications_off</span>
              <p className="mt-3 text-sm font-medium text-slate-500">No notifications available.</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
