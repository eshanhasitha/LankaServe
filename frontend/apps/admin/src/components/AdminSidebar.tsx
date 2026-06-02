import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../lib/auth-context.tsx';

const groups = [
  {
    title: null,
    items: [
      ['dashboard', 'Dashboard', '/dashboard'],
      ['group', 'Users', '/users'],
      ['engineering', 'Providers', '/providers'],
      ['work', 'Jobs', '/jobs'],
      ['qr_code_scanner', 'QR Logs', '/qr-logs'],
      ['reviews', 'Reviews', '/reviews'],
      ['ads_click', 'Ads', '/adds'],
    ],
  },
  {
    title: 'Insights',
    items: [
      ['analytics', 'Analytics', '/insights/analytics'],
      ['military_tech', 'Badge Rules', '/insights/badge-rules'],
      ['broadcast_on_home', 'Broadcast', '/insights/broadcast'],
    ],
  },
  {
    title: 'System',
    items: [
      ['description', 'Reports', '/system/reports'],
      ['backup', 'Backup', '/system/backup'],
      ['settings', 'Settings', '/system/settings'],
    ],
  },
];

export default function AdminSidebar() {
  const { logoutUser } = useAdminAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logoutUser();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-(--sidebar-width) flex-col border-r border-slate-200 bg-white">
      <div className="flex h-(--navbar-height) items-center border-b border-slate-100 px-6">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-(--primary) p-1.5 text-white">
            <span className="material-symbols-outlined block text-xl">admin_panel_settings</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-(--primary)">LankaServe Admin</span>
        </div>
      </div>

      <nav className="hide-scrollbar flex-1 space-y-1 overflow-y-auto px-4 py-6">
        {groups.map((group) => (
          <div key={group.title || 'main'}>
            {group.title ? (
              <div className="px-4 pb-2 pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {group.title}
              </div>
            ) : null}

            {group.items.map(([icon, label, href]) => (
              <NavLink
                key={href}
                to={href}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-2.5 font-medium transition-all ${
                    isActive ? 'bg-(--primary) text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`
                }
              >
                <span className="material-symbols-outlined">{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}

        <button
          type="button"
          onClick={onLogout}
          className="mt-6 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 font-medium text-red-600 transition-all hover:bg-red-50"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Logout</span>
        </button>
      </nav>
    </aside>
  );
}

