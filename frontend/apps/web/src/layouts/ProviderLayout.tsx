import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context.tsx';
import Avatar from '../components/Avatar.tsx';
import { apiRequest } from '../lib/api.ts';

function asId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
}

export default function ProviderLayout() {
  const { user, accessToken, logoutCurrentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [messageBadge, setMessageBadge] = useState(0);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [jobRequestCount, setJobRequestCount] = useState(0);
  const [myJobCount, setMyJobCount] = useState(0);
  const [badgeSummary, setBadgeSummary] = useState({
    currentLevel: 'Provider',
    rankLabel: '',
    rankPosition: 0,
    totalProviders: 0,
  });

  async function onLogout() {
    await logoutCurrentUser();
    navigate('/login', { replace: true });
  }

  const loadUnreadCount = useCallback(async () => {
    if (!accessToken || !user?._id) {
      setMessageBadge(0);
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const response = await apiRequest('/messages/conversations', { headers });
      const conversations = Array.isArray(response?.data) ? response.data : [];
      setMessageBadge(conversations.reduce((sum, item) => sum + Number(item?.unread || 0), 0));
    } catch {
      setMessageBadge(0);
    }
  }, [accessToken, user?._id]);

  useEffect(() => {
    let active = true;
    if (location.pathname.includes('/provider/messages')) {
      setMessageBadge(0);
      return () => {
        active = false;
      };
    }
    loadUnreadCount();
    const intervalId = setInterval(() => {
      if (active) loadUnreadCount();
    }, 15000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [loadUnreadCount, location.pathname]);

  const loadNotificationUnread = useCallback(async () => {
    if (!accessToken) {
      setNotificationUnread(0);
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const response = await apiRequest('/notifications/my?page=1&limit=50', { headers });
      const items = Array.isArray(response?.data) ? response.data : [];
      setNotificationUnread(items.filter((item) => !item?.isRead).length);
    } catch {
      setNotificationUnread(0);
    }
  }, [accessToken]);

  useEffect(() => {
    let active = true;
    if (location.pathname.includes('/provider/notifications')) {
      return () => {
        active = false;
      };
    }
    loadNotificationUnread();
    const intervalId = setInterval(() => {
      if (active) loadNotificationUnread();
    }, 15000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [loadNotificationUnread, location.pathname]);

  const loadJobCounts = useCallback(async () => {
    if (!accessToken) {
      setJobRequestCount(0);
      setMyJobCount(0);
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const [requestResponse, myJobsResponse] = await Promise.all([
        apiRequest('/providers/job-requests?page=1&limit=1', { headers }).catch(() => ({ pagination: { total: 0 } })),
        apiRequest('/providers/jobs?status=accepted,arrived,ongoing&page=1&limit=1', { headers }).catch(() => ({ pagination: { total: 0 } })),
      ]);
      setJobRequestCount(Number(requestResponse?.pagination?.total || 0));
      setMyJobCount(Number(myJobsResponse?.pagination?.total || 0));
    } catch {
      setJobRequestCount(0);
      setMyJobCount(0);
    }
  }, [accessToken]);

  useEffect(() => {
    let active = true;
    loadJobCounts();
    const intervalId = setInterval(() => {
      if (active) loadJobCounts();
    }, 15000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [loadJobCounts]);

  const loadBadgeSummary = useCallback(async () => {
    if (!accessToken) {
      setBadgeSummary({ currentLevel: '', rankLabel: '', rankPosition: 0, totalProviders: 0 });
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const response = await apiRequest('/providers/badges', { headers });
      const summary = response?.data?.summary;
      setBadgeSummary({
        currentLevel: summary?.currentLevel || '',
        rankLabel: summary?.rankLabel || '',
        rankPosition: Number(summary?.rankPosition || 0),
        totalProviders: Number(summary?.totalProviders || 0),
      });
    } catch {
      setBadgeSummary({ currentLevel: '', rankLabel: '', rankPosition: 0, totalProviders: 0 });
    }
  }, [accessToken]);

  useEffect(() => {
    loadBadgeSummary();
  }, [loadBadgeSummary]);

  const links = [
    { to: '/provider/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { to: '/provider/browse-jobs', icon: 'search', label: 'Browse Jobs' },
    { to: '/provider/job-requests', icon: 'mark_email_unread', label: 'Job Requests', badge: jobRequestCount, badgeClass: 'bg-red-500', showZeroBadge: false },
    { to: '/provider/my-jobs', icon: 'work', label: 'My Jobs', badge: myJobCount, badgeClass: 'bg-red-500', showZeroBadge: false },
    { to: '/provider/earnings', icon: 'account_balance_wallet', label: 'Earnings' },
    { to: '/provider/badges', icon: 'military_tech', label: 'Badges' },
    { to: '/provider/messages', icon: 'chat_bubble', label: 'Messages', badge: messageBadge, badgeClass: 'bg-red-500', showZeroBadge: false },
    { to: '/provider/analytics', icon: 'bar_chart', label: 'Analytics' },
  ];

  const headerPlaceholder = location.pathname.includes('/provider/badges')
    ? 'Search milestones, badges...'
    : location.pathname.includes('/provider/earnings')
      ? 'Search earnings, invoices...'
      : location.pathname.includes('/provider/settings')
        ? 'Search settings...'
        : location.pathname.includes('/provider/analytics')
          ? 'Search analytics data...'
          : location.pathname.includes('/provider/notifications')
            ? 'Search notifications, tasks...'
            : location.pathname.includes('/provider/my-jobs')
              ? 'Search my jobs, history...'
              : location.pathname.includes('/provider/job-requests')
                ? 'Search requests...'
                : location.pathname.includes('/provider/browse-jobs')
                  ? 'Search requests, locations...'
                  : location.pathname.includes('/provider/dashboard')
                    ? 'Search dashboard, messages...'
                    : 'Search provider tools...';

  const roleLabel = `${badgeSummary.currentLevel}${badgeSummary.rankLabel ? ` - ${badgeSummary.rankLabel}` : ''}`;
  const isMessagesRoute = location.pathname.includes('/provider/messages');
  const isHelpCenterRoute = location.pathname.includes('/provider/help-center');

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-slate-200 bg-white">
        <div className="flex h-[70px] items-center border-b border-slate-100 px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E3A8A]">
              <span className="material-symbols-outlined text-white text-3xl">handshake</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-[#2F4DA0]">LankaServe</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6">
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all ${isActive ? 'bg-[#2F4DA0] text-white' : 'text-slate-600 hover:bg-slate-50'}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.label}</span>
                  {(item.showZeroBadge ? item.badge !== undefined : Boolean(item.badge)) ? (
                    <span
                      className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        isActive && item.to === '/provider/messages'
                          ? 'bg-white text-[#2F4DA0]'
                          : `${item.badgeClass || 'bg-red-500'} text-white`
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-1 border-t border-slate-100 p-4">
          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium ${
                isActive ? 'bg-[#2F4DA0] text-white' : 'text-slate-500 hover:text-[#2F4DA0]'
              }`
            }
            to="/provider/help-center"
          >
            <span className="material-symbols-outlined text-xl">help</span>
            <span>Help Center</span>
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium ${
                isActive ? 'bg-[#2F4DA0] text-white' : 'text-slate-500 hover:text-[#2F4DA0]'
              }`
            }
            to="/provider/settings"
          >
            <span className="material-symbols-outlined text-xl">settings</span>
            <span>Settings</span>
          </NavLink>
          <button className="flex w-full items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50" onClick={onLogout} type="button">
            <span className="material-symbols-outlined text-xl">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className={`ml-[260px] ${isMessagesRoute ? 'h-screen bg-white' : 'min-h-screen bg-[#F3F4F6]'}`}>
        {!isMessagesRoute ? (
          <header className="sticky top-0 z-[1200] flex h-[70px] items-center justify-between border-b border-slate-200 bg-white px-8">
            {isHelpCenterRoute ? (
              <div className="invisible w-96" />
            ) : (
              <div className="flex w-96 items-center gap-2 rounded-full border border-transparent bg-slate-50 px-3 transition-all focus-within:border-transparent focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2F4DA0]">
                <span className="material-symbols-outlined shrink-0 text-xl text-slate-400">search</span>
                <input
                  className="flex-1 border-0 bg-transparent py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
                  placeholder={headerPlaceholder}
                  type="text"
                />
              </div>
            )}

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1 text-sm font-semibold text-slate-600">
                <span className="cursor-pointer hover:text-[#2F4DA0]">EN</span>
                <span className="text-slate-300">|</span>
                <span className="cursor-pointer text-slate-400 hover:text-[#2F4DA0]">SI</span>
                <span className="text-slate-300">|</span>
                <span className="cursor-pointer text-slate-400 hover:text-[#2F4DA0]">TA</span>
              </div>
              <NavLink className="relative text-slate-500" to="/provider/notifications">
                <span className="material-symbols-outlined text-2xl">notifications</span>
                {notificationUnread > 0 ? <span className="absolute right-0 top-0 h-2 w-2 rounded-full border-2 border-white bg-red-500" /> : null}
              </NavLink>
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold">{user?.name || 'Provider'}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{roleLabel}</p>
                </div>
                <button
                  className="h-9 w-9 cursor-pointer overflow-hidden rounded-full border border-slate-200"
                  type="button"
                  onClick={() => navigate('/provider/settings')}
                  aria-label="Open profile settings"
                >
                  <Avatar src={user?.profileImage || user?.photoURL} name={user?.name} className="h-full w-full" />
                </button>
              </div>
            </div>
          </header>
        ) : null}

        <Outlet />
      </main>
    </div>
  );
}

