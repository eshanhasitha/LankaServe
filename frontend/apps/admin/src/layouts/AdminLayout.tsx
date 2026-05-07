import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar.tsx';
import AdminTopbar from '../components/AdminTopbar.tsx';

export default function AdminLayout() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <AdminSidebar />
      <main className="ml-(--sidebar-width) min-h-screen">
        <AdminTopbar />
        <div className="mx-auto max-w-360 space-y-6 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

