import { useState } from 'react';
import { apiRequest } from '../lib/api';

export default function ReviewForm({ jobId }: { jobId: string }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  async function submit() {
    if (rating < 1 || rating > 5) return alert('Rating must be 1-5');
    await apiRequest('/reviews', { 
      method: 'POST', 
      body: JSON.stringify({ jobId, rating, comment }) 
    });
    alert('Review submitted');
  }

  return (
    <div className="rounded-xl border p-4 bg-white">
      <h3 className="font-semibold mb-2">Rate Provider</h3>
      <input 
        type="number" 
        min={1} 
        max={5} 
        value={rating} 
        onChange={(e) => setRating(Number(e.target.value))} 
      />
      <textarea 
        value={comment} 
        onChange={(e) => setComment(e.target.value)} 
        className="block w-full mt-2 border p-2" 
      />
      <button 
        onClick={submit} 
        className="mt-2 px-3 py-2 bg-blue-600 text-white rounded"
      >
        Submit
      </button>
    </div>
  );
}