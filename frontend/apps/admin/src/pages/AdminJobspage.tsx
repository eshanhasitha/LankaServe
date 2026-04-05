import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

type Job = { _id: string; title: string; status: string };

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    apiRequest<{ success: boolean; data: Job[] }>('/admin/jobs')
      .then((r) => setJobs(r.data || []));
  }, []);

  return (
    <div>
      {jobs.map((j) => (
        <div key={j._id}>
          {j.title} - {j.status}
        </div>
      ))}
    </div>
  );
}