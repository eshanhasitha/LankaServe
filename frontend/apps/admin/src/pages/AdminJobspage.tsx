import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

type Job = {
  _id: string;
  title: string;
  status: string;
};

export default function AdminJobsPage() {
  const [rows, setRows] = useState<Job[]>([]);

  useEffect(() => {
    apiRequest<{ success: boolean; data: Job[] }>('/admin/jobs')
      .then((res) => setRows(res.data || []))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div>
      <h2>Jobs List</h2>

      {rows.map((job) => (
        <div key={job._id}>
          {job.title} - {job.status}
        </div>
      ))}
    </div>
  );
}