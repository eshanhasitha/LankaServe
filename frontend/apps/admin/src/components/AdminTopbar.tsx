import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlQuery = searchParams.get('q') || searchParams.get('search') || '';
  const [query, setQuery] = useState(urlQuery);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  const placeholderText = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('users')) return 'Search users by name, email, or role...';
    if (path.includes('providers')) return 'Search providers by business or category...';
    if (path.includes('jobs')) return 'Search jobs by title, customer, or ID...';
    if (path.includes('reviews')) return 'Search reviews...';
    if (path.includes('qr')) return 'Search QR logs...';
    if (path.includes('support')) return 'Search support requests or chats...';
    if (path.includes('adds')) return 'Search advertisements...';
    if (path.includes('reports')) return 'Search system reports...';
    if (path.includes('backup')) return 'Search backups...';
    return 'Search users, providers, jobs, or ID...';
  }, [location.pathname]);

  function handleSearchChange(value: string) {
    setQuery(value);
    const next = new URLSearchParams(searchParams);
    if (value.trim()) {
      next.set('q', value);
    } else {
      next.delete('q');
      next.delete('search');
    }

    const currentPath = location.pathname.toLowerCase();
    const isSearchablePage = [
      'users',
      'providers',
      'jobs',
      'reviews',
      'qr-logs',
      'adds',
      'support',
      'reports',
      'backup',
    ].some((key) => currentPath.includes(key));

    if (!isSearchablePage && value.trim()) {
      navigate(`/users?q=${encodeURIComponent(value)}`);
    } else {
      setSearchParams(next, { replace: true });
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-(--navbar-height) items-center justify-between border-b border-slate-200 bg-white px-8">
      <div className="flex flex-1 justify-center">
        <div className="relative w-full max-w-md">
          <span className="material-symbols-outlined absolute inset-y-0 left-3.5 flex items-center text-xl text-slate-400">
            search
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={placeholderText}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-9 text-left text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#3151B7] focus:bg-white focus:ring-2 focus:ring-[#3151B7]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <Link to="/notifications" className="relative text-slate-500 transition-colors hover:text-[#3151B7]" aria-label="Open notifications">
          <span className="material-symbols-outlined text-2xl">notifications</span>
          <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
        </Link>

        <div className="group flex cursor-pointer items-center gap-3 border-l border-slate-100 pl-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900 transition-colors group-hover:text-[#3151B7]">Admin Portal</p>
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

