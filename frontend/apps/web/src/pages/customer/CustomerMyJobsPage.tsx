import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';

type Job = {
  _id: string;
  title: string;
  status: string;
};

type JobsResponse = {
  success: boolean;
  data: Job[];
};

export default function CustomerMyJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    apiRequest<JobsResponse>('/jobs').then((res) => setJobs(res.data || []));
  }, []);

  return (
    <div>
      <h1>My Jobs</h1>
      {jobs.map((job) => (
        <div key={job._id}>
          {job.title} - {job.status}
        </div>
      ))}
    </div>
  );
}
