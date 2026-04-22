import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

type Summary = {
  users: number;
  providers: number;
  jobs: number;
  completed: number;
};

export default function AdminReportsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    apiRequest<{ success: boolean; data: Summary }>(
      '/admin/reports/summary'
    )
      .then((res) => setSummary(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div>
      <h2>Reports Summary</h2>

      {summary ? (
        <div>
          <p>Users: {summary.users}</p>
          <p>Providers: {summary.providers}</p>
          <p>Jobs: {summary.jobs}</p>
          <p>Completed: {summary.completed}</p>
        </div>
      ) : (
        <p>Loading reports...</p>
      )}
    </div>
  );
}