import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

type DashboardData = {
  users: number;
  providers: number;
  jobs: number;
  reviews: number;
};

type DashboardResponse = {
  success: boolean;
  data: DashboardData;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardData | null>(null);

  useEffect(() => {
    apiRequest<DashboardResponse>('/admin/dashboard').then((res) => setStats(res.data));
  }, []);

  return <div>{stats ? JSON.stringify(stats) : 'Loading...'}</div>;
}
const report = await apiRequest<{
  success: boolean;
  data: {
    users: number;
    providers: number;
    jobs: number;
    completed: number;
  }
}>('/admin/reports/summary');

console.log(report.data);