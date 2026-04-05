import { Link, Outlet } from 'react-router-dom';

export default function CustomerLayout() {
  return (
    <div>
      <nav>
        <Link to="/customer/dashboard">Dashboard</Link>
        <Link to="/customer/post-service">Post Service</Link>
        <Link to="/customer/my-jobs">My Jobs</Link>
      </nav>
      <Outlet />
    </div>
  );
}
