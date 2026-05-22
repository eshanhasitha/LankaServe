import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context.tsx';
import Avatar from '../components/Avatar.tsx';
import { apiRequest } from '../lib/api.ts';
import { CustomerLanguageProvider, CustomerLanguageToggle } from '../lib/customer-i18n.tsx';

function asId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
}

export default function CustomerLayout() {
  return (
    <CustomerLanguageProvider>
      <CustomerLayoutInner />
    </CustomerLanguageProvider>
  );
}

function CustomerLayoutInner() {
  const { user, accessToken, logoutCurrentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [messageBadge, setMessageBadge] = useState(0);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function onLogout() {
    setMobileMenuOpen(false);
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
    if (location.pathname.includes('/customer/messages')) {
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
    if (location.pathname.includes('/customer/notifications')) {
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

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const links = [
    { to: '/customer/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { to: '/customer/post-service', icon: 'add_circle', label: 'Post Service' },
    { to: '/customer/my-jobs', icon: 'work', label: 'My Jobs' },
    { to: '/customer/find-providers', icon: 'person_search', label: 'Search Providers' },
    { to: '/customer/heatmap', icon: 'map', label: 'Heatmap' },
    { to: '/customer/messages', icon: 'chat_bubble', label: 'Messages', badge: messageBadge },
  ];

  const isProviderSearchHeader = location.pathname.includes('/customer/find-providers') || location.pathname.includes('/customer/search-providers');
  const isJobDetailsHeader = /^\/customer\/my-jobs\/[^/]+$/.test(location.pathname);
  const isProviderProfileHeader = /^\/customer\/providers\/[^/]+$/.test(location.pathname);
  const isMessagesPage = location.pathname.includes('/customer/messages');
  const jobDetailsTitle = location.state?.jobTitle || 'Job Details';
  const providerProfileTitle = location.state?.providerName || 'Provider Profile';
  const headerTitle = isProviderSearchHeader ? 'Search Providers' : null;
  const headerPlaceholder = location.pathname.includes('/customer/my-jobs')
    ? 'Search your jobs...'
    : location.pathname.includes('/customer/settings')
      ? 'Search settings...'
      : location.pathname.includes('/customer/heatmap')
        ? 'Enter Location'
        : 'Search services, providers...';
  const mobileHeaderTitle = isProviderProfileHeader
    ? providerProfileTitle
    : isJobDetailsHeader
      ? jobDetailsTitle
      : isMessagesPage
        ? 'Messages'
        : location.pathname.includes('/customer/notifications')
          ? 'Notifications'
          : location.pathname.includes('/customer/help-center')
            ? 'Help Center'
            : location.pathname.includes('/customer/settings')
              ? 'Settings'
              : location.pathname.includes('/customer/heatmap')
                ? 'Heatmap'
                : location.pathname.includes('/customer/my-jobs')
                  ? 'My Jobs'
                  : location.pathname.includes('/customer/post-service')
                    ? 'Post Service'
                    : headerTitle || 'Dashboard';

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-900 lg:overflow-x-hidden" data-customer-i18n-root>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-[70px] items-center border-b border-slate-100 px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E3A8A]">
              <span className="material-symbols-outlined text-white text-3xl">handshake</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-[#2F4DA0]">LankaServe</span>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
            <Avatar src={user?.profileImage || user?.photoURL} name={user?.name} className="h-9 w-9" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-2">
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all ${isActive ? 'bg-[#2F4DA0] text-white' : 'text-slate-600 hover:bg-slate-50'}`
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge ? <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{item.badge}</span> : null}
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
            to="/customer/help-center"
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
            to="/customer/settings"
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

      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity duration-200 lg:hidden ${
          mobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[86vw] max-w-[320px] border-r border-slate-200 bg-white transition-transform duration-200 ease-out lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[70px] items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E3A8A]">
              <span className="material-symbols-outlined text-3xl text-white">handshake</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-[#2F4DA0]">LankaServe</span>
          </div>
          <button
            aria-label="Close navigation menu"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            onClick={() => setMobileMenuOpen(false)}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-4 py-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
            <Avatar src={user?.profileImage || user?.photoURL} name={user?.name} className="h-9 w-9" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
            </div>
          </div>
        </div>

        <nav className="space-y-1 px-4 py-2">
          {links.map((item) => (
            <NavLink
              key={`mobile-${item.to}`}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all ${isActive ? 'bg-[#2F4DA0] text-white' : 'text-slate-600 hover:bg-slate-50'}`
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge ? <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{item.badge}</span> : null}
            </NavLink>
          ))}
        </nav>

        <div className="mt-2 space-y-1 border-t border-slate-100 p-4">
          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium ${
                isActive ? 'bg-[#2F4DA0] text-white' : 'text-slate-500 hover:text-[#2F4DA0]'
              }`
            }
            onClick={() => setMobileMenuOpen(false)}
            to="/customer/help-center"
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
            onClick={() => setMobileMenuOpen(false)}
            to="/customer/settings"
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

      <main className={`lg:ml-[260px] ${isMessagesPage ? 'min-h-screen bg-white lg:h-screen' : 'min-h-screen bg-[#F3F4F6]'}`}>
        {!isMessagesPage ? (
          <header className="sticky top-0 z-[1200] flex min-h-[70px] items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <button
                aria-label="Open navigation menu"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
                type="button"
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              {isProviderProfileHeader ? (
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <button
                    className="text-slate-400 hover:text-slate-600"
                    type="button"
                    onClick={() => navigate(-1)}
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <h1 className="truncate text-lg font-bold sm:text-xl">{providerProfileTitle}</h1>
                </div>
              ) : isJobDetailsHeader ? (
                <div className="flex min-w-0 items-center gap-2 text-sm text-slate-500">
                  <NavLink className="hidden hover:text-[#2F4DA0] sm:block" to="/customer/my-jobs">My Jobs</NavLink>
                  <span className="material-symbols-outlined hidden text-sm sm:inline">chevron_right</span>
                  <span className="truncate font-medium text-slate-900">{jobDetailsTitle}</span>
                </div>
              ) : headerTitle ? (
                <div className="flex min-w-0 items-center gap-4">
                  <h1 className="truncate text-lg font-bold sm:text-xl">{headerTitle}</h1>
                </div>
              ) : (
                <div className="flex w-full max-w-[460px] items-center gap-2 rounded-full border border-transparent bg-slate-50 px-3 transition-all focus-within:border-transparent focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2F4DA0]">
                  <span className="material-symbols-outlined shrink-0 text-xl text-slate-400">search</span>
                  <input
                    className="flex-1 border-0 bg-transparent py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
                    placeholder={headerPlaceholder}
                    type="text"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
              <CustomerLanguageToggle className="hidden md:flex" />
              <NavLink className="relative text-slate-500" to="/customer/notifications">
                <span className="material-symbols-outlined text-2xl">notifications</span>
                {notificationUnread > 0 ? <span className="absolute right-0 top-0 h-2 w-2 rounded-full border-2 border-white bg-red-500" /> : null}
              </NavLink>
              <button
                className="h-9 w-9 cursor-pointer overflow-hidden rounded-full border border-slate-200"
                type="button"
                onClick={() => navigate('/customer/settings')}
                aria-label="Open profile settings"
              >
                <Avatar src={user?.profileImage || user?.photoURL} name={user?.name} className="h-full w-full" />
              </button>
            </div>
          </header>
        ) : (
          <header className="sticky top-0 z-[1200] flex h-[64px] items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
            <div className="flex items-center gap-3">
              <button
                aria-label="Open navigation menu"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setMobileMenuOpen(true)}
                type="button"
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              <h1 className="text-base font-bold">{mobileHeaderTitle}</h1>
            </div>
            <NavLink className="relative text-slate-500" to="/customer/notifications">
              <span className="material-symbols-outlined text-2xl">notifications</span>
              {notificationUnread > 0 ? <span className="absolute right-0 top-0 h-2 w-2 rounded-full border-2 border-white bg-red-500" /> : null}
            </NavLink>
          </header>
        )}
        <Outlet />
      </main>
    </div>
  );
}


