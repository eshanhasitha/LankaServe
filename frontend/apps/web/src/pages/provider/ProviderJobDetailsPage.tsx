import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { apiRequest } from '../../lib/api';

type QrData = { qrToken: string; qrExpiresAt: string };

export default function ProviderJobDetailsPage() {
  const { jobId = '' } = useParams();
  const [qr, setQr] = useState<QrData | null>(null);

  useEffect(() => {
    apiRequest<{ success: boolean; data: QrData }>(`/providers/${jobId}/qr`)
      .then((r) => setQr(r.data))
      .catch(() => setQr(null));
  }, [jobId]);

  return (
    <div>
      <h1>Provider Job Details</h1>
      {qr ? (
        <div className="rounded-xl border p-4 bg-white">
          <QRCodeCanvas value={qr.qrToken} size={220} />
          <p className="text-xs mt-2">Expires: {new Date(qr.qrExpiresAt).toLocaleString()}</p>
        </div>
      ) : <p>No QR available</p>}
    </div>
  );
}