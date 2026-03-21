import { useState } from 'react';
import { apiRequest } from '../lib/api';

export default function AdminProvidersPage() {
  const [providerId, setProviderId] = useState('');

  async function verify() {
    await apiRequest(`/admin/providers/${providerId}/verify`, { method: 'PUT' });
    alert('Provider verified');
  }

  return (
    <div>
      <input
        value={providerId}
        onChange={(e) => setProviderId(e.target.value)}
        placeholder="Provider profile id"
      />
      <button onClick={verify}>Verify Provider</button>
    </div>
  );
}