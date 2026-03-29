import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

type QRLog = { _id: string; jobId: string; status: string; reason: string };

export default function AdminQrLogsPage() {
  const [logs, setLogs] = useState<QRLog[]>([]);

  useEffect(() => {
    apiRequest<{ success: boolean; data: QRLog[] }>('/admin/qr-logs')
      .then((r) => setLogs(r.data || []));
  }, []);

  return (
    <div>
      {logs.map((l) => (
        <div key={l._id}>
          {l.jobId} | {l.status} | {l.reason}
        </div>
      ))}
    </div>
  );
}