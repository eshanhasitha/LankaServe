import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api.ts';
import { useAuth } from '../../lib/auth-context.tsx';
import Skeleton from '../../components/Skeleton.tsx';

const tabs = ['All', 'Jobs', 'Payments', 'Reviews', 'System'];

function timeAgo(iso) {
  if (!iso) return 'Just now';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(diff / 60000));
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  return 'Yesterday';
}

function iconForType(type) {
  if (type === 'job') return { icon: 'assignment', iconWrap: 'bg-blue-50 text-blue-600' };
  if (type === 'payment') return { icon: 'account_balance_wallet', iconWrap: 'bg-emerald-50 text-emerald-600' };
  return { icon: 'notifications', iconWrap: 'bg-slate-100 text-slate-600' };
}

export default function ProviderNotificationsPage() {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load(silent = false) {
      if (!accessToken) return;
      if (!silent) setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const response = await apiRequest('/notifications/my?page=1&limit=20', { headers });
        if (!mounted) return;
        const items = Array.isArray(response?.data) ? response.data : [];
        setNotifications(items);
        setPage(Number(response?.pagination?.page || 1));
        setHasNext(Boolean(response?.pagination?.hasNext));
      } catch {
        if (mounted) setNotifications([]);
      } finally {
        if (mounted && !silent) setLoading(false);
      }
    }
    load();
    const intervalId = setInterval(() => {
      if (mounted) load(true);
    }, 15000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [accessToken]);

  const filtered = useMemo(() => {
    const tabType = activeTab === 'All' ? '' : activeTab.toLowerCase().replace('reviews', 'system');
    if (!tabType) return notifications;
    return notifications.filter((item) => String(item.type || '').toLowerCase() === tabType);
  }, [activeTab, notifications]);

  async function markRead(id) {
    if (!id) return;
    setNotifications((prev) => prev.map((item) => (item._id === id ? { ...item, isRead: true } : item)));
    if (!accessToken) return;
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      await apiRequest(`/notifications/read/${id}`, { method: 'PUT', headers });
    } catch {
      // Keep optimistic update.
    }
  }

  async function markAllRead() {
    const unread = notifications.filter((item) => !item.isRead);
    if (!unread.length) return;
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    if (!accessToken) return;
    const headers = { Authorization: `Bearer ${accessToken}` };
    await Promise.all(unread.map((item) => apiRequest(`/notifications/read/${item._id}`, { method: 'PUT', headers }).catch(() => null)));
  }

  async function loadMore() {
    if (!accessToken || !hasNext) return;
    try {
      const next = page + 1;
      const headers = { Authorization: `Bearer ${accessToken}` };
      const response = await apiRequest(`/notifications/my?page=${next}&limit=20`, { headers });
      const items = Array.isArray(response?.data) ? response.data : [];
      if (items.length) setNotifications((prev) => [...prev, ...items]);
      setPage(Number(response?.pagination?.page || next));
      setHasNext(Boolean(response?.pagination?.hasNext));
    } catch {
      // ignore
    }
  }

  return (
    <div className="p-8 max-w-[1440px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-sm">Stay updated with your latest activities and job updates.</p>
        </div>
        <button className="border border-slate-200 text-slate-600 px-5 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-slate-50 transition-colors bg-white" type="button" onClick={markAllRead}>
          <span className="material-symbols-outlined text-lg">done_all</span>
          Mark all as read
        </button>
      </div>

      <div className="flex items-center gap-8 border-b border-slate-200 px-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`pb-3 text-sm font-semibold transition-colors ${activeTab === tab ? 'border-b-2 border-[#2F4DA0] text-[#2F4DA0]' : 'text-slate-400 hover:text-slate-600'}`}
            type="button"
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white p-5 rounded-[16px] shadow-sm border border-slate-50 flex items-start gap-4">
              <Skeleton className="w-12 h-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="space-y-3">
        {filtered.map((item) => {
          const icon = iconForType(String(item.type || '').toLowerCase());
          return (
            <article key={item._id} className={`bg-white p-5 rounded-[16px] shadow-sm border border-slate-50 flex items-start gap-4 hover:border-blue-100 transition-all cursor-pointer ${item.isRead ? 'opacity-80' : ''}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${icon.iconWrap}`}>
                <span className="material-symbols-outlined">{icon.icon}</span>
              </div>
              <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900">{item.title || 'Notification'}</h4>
                    {item?.job?.displayId ? (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                        {item.job.displayId}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{timeAgo(item.createdAt)}</span>
                    {!item.isRead ? <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" /> : null}
                  </div>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{item.body || ''}</p>
                {item?.data?.jobId ? (
                  <div className="mt-3">
                    <Link
                      className="inline-block px-4 py-1.5 bg-[#2F4DA0] text-white text-xs font-bold rounded-lg hover:bg-blue-800 transition-colors"
                      to={`/provider/my-jobs`}
                    >
                      View Job
                    </Link>
                  </div>
                ) : null}
              </div>
              {!item.isRead ? (
                <button className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#2F4DA0] shadow-sm" type="button" onClick={() => markRead(item._id)}>
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                </button>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="flex justify-center pt-8 pb-12">
        <button className="border border-slate-200 text-slate-600 px-8 py-2.5 rounded-xl font-semibold text-sm hover:bg-white transition-all shadow-sm bg-slate-50 disabled:opacity-60" type="button" onClick={loadMore} disabled={!hasNext}>
          Load more
        </button>
      </div>
    </div>
  );
}

