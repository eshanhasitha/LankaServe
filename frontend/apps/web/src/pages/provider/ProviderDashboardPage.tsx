import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';

type Dashboard = { pending: number; ongoing: number; completed: number; rating: number; earnings: number };

export default function ProviderDashboardPage() {
  const [data, setData] = useState<Dashboard>({ pending: 0, ongoing: 0, completed: 0, rating: 0, earnings: 0 });

  useEffect(() => {
    apiRequest<Dashboard>('/providers/dashboard').then((res) => {
      const d = res.data || ({} as Dashboard);
      setData({
        pending: Number(d.pending || 0),
        ongoing: Number(d.ongoing || 0),
        completed: Number(d.completed || 0),
        rating: Number(d.rating || 0),
        earnings: Number(d.earnings || 0),
      });
    });
  }, []);

  return <div>{`Pending ${data.pending} | Ongoing ${data.ongoing} | Completed ${data.completed}`}</div>;
}
