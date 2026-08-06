import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar.tsx';
import AdminTopbar from '../components/AdminTopbar.tsx';
import ChangePasswordModal from '../components/ChangePasswordModal.tsx';
import { useAdminAuth } from '../lib/auth-context.tsx';

export default function AdminLayout() {
  const { admin } = useAdminAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    try {
      localStorage.removeItem('admin_theme_mode');
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <AdminSidebar />
      <main className="ml-(--sidebar-width) min-h-screen">
        <AdminTopbar />

        {admin?.mustChangePassword ? (
          <div className="flex items-center justify-between bg-amber-500 px-8 py-3 text-slate-950 shadow-md">
            <div className="flex items-center gap-2.5 text-sm font-semibold">
              <span className="material-symbols-outlined text-xl">warning</span>
              <span>
                <strong>Default Password Warning:</strong> You are using the default admin password. Please update your password immediately.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="rounded-lg bg-slate-950 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-black"
            >
              Change Password Now
            </button>
          </div>
        ) : null}

        <div className="mx-auto max-w-360 space-y-6 p-8">
          <Outlet />
        </div>
      </main>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}

