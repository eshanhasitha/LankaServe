import { useState } from 'react';
import { apiRequest } from '../../lib/api';

type CreateJobResponse = {
  success: boolean;
  data: unknown;
};

export default function CustomerPostServicePage() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    location: { type: 'Point', coordinates: [79.8612, 6.9271] as [number, number] },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await apiRequest<CreateJobResponse>('/jobs', {
      method: 'POST',
      body: JSON.stringify({ ...form, price: Number(form.price) }),
    });
    alert('Job posted');
  }

  return (
    <form onSubmit={submit}>
      <input placeholder="Title" onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <input placeholder="Description" onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <input placeholder="Category" onChange={(e) => setForm({ ...form, category: e.target.value })} />
      <input placeholder="Price" type="number" onChange={(e) => setForm({ ...form, price: e.target.value })} />
      <button type="submit">Post Service</button>
    </form>
  );
}