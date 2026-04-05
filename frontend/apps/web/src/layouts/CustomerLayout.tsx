import { Link, Outlet } from 'react-router-dom';
import NotificationBadge from '../components/NotificationBadge';

export default function CustomerLayout() {
  return (
    <div>
      <nav className="flex justify-between items-center px-4 py-3 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex gap-6">
          <Link 
            to="/customer/dashboard" 
            className="text-gray-700 hover:text-gray-900 font-medium"
          >
            Dashboard
          </Link>
          <Link 
            to="/customer/post-service" 
            className="text-gray-700 hover:text-gray-900 font-medium"
          >
            Post Service
          </Link>
          <Link 
            to="/customer/my-jobs" 
            className="text-gray-700 hover:text-gray-900 font-medium"
          >
            My Jobs
          </Link>
        </div>
        <NotificationBadge />
      </nav>
      <Outlet />
    </div>
  );
}