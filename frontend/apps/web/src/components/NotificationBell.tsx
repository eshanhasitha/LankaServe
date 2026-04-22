import { Link } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';

export default function NotificationBell() {
  const { unread } = useNotifications();
  return (
    <Link to="/customer/notifications" className="relative text-slate-600">
      <span className="material-symbols-outlined text-2xl">notifications</span>
      {unread > 0 && <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500" />}
    </Link>
  );
}
