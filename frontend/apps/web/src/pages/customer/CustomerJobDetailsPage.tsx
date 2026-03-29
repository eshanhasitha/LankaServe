import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiRequest } from '../../lib/api';
import ReviewForm from '../../components/ReviewForm';

export default function CustomerJobDetailsPage() {
  const { jobId = '' } = useParams();
  const [token, setToken] = useState('');
  const [verified, setVerified] = useState(false);

  async function verifyArrival() {
    await apiRequest(`/jobs/${jobId}/arrival/scan`, { 
      method: 'PUT', 
      body: JSON.stringify({ token }) 
    });
    setVerified(true);
    alert('Arrival confirmed');
  }

  return (
    <div>
      <h1>Customer Job Details</h1>
      <input 
        value={token} 
        onChange={(e) => setToken(e.target.value)} 
        placeholder="Paste QR token" 
      />
      <button onClick={verifyArrival}>Verify Arrival</button>
      {verified ? <ReviewForm jobId={jobId} /> : null}
    </div>
  );
}