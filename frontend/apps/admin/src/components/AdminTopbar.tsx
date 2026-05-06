import { useAdminAuth } from '../lib/auth-context.tsx';

function AdminAvatar({ name }) {
  const initial = String(name || 'A').trim().charAt(0).toUpperCase() || 'A';
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-teal-500 to-slate-800 text-xs font-semibold text-white">
      {initial}
    </div>
  );
}

export default function AdminTopbar() {
  const { admin } = useAdminAuth();

  return (
    <header className="sticky top-0 z-30 flex h-(--navbar-height) items-center justify-between border-b border-slate-200 bg-white px-8">
      <div className="flex flex-1 justify-center">
        <div className="relative w-full max-w-lg">
          <span className="material-symbols-outlined absolute inset-y-0 left-3 flex items-center text-xl text-slate-400">search</span>
          <input
            type="text"
            placeholder="Global search for users, providers, or job IDs..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-transparent focus:bg-white focus:ring-2 focus:ring-(--primary)"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button type="button" className="relative text-slate-500 transition-colors hover:text-(--primary)">
          <span className="material-symbols-outlined text-2xl">notifications</span>
          <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
        </button>

        <div className="group flex cursor-pointer items-center gap-3 border-l border-slate-100 pl-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900 transition-colors group-hover:text-(--primary)">Admin Portal</p>
            <p className="text-[10px] font-medium text-slate-500">
              {String(admin?.role || 'super_admin').replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase())}
            </p>
          </div>
          <AdminAvatar name={admin?.name} />
        </div>
      </div>
    </header>
  );
}

