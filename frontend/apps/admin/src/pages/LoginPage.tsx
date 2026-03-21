import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../lib/auth-api';

export default function LoginPage() {
  const [token, setToken] = useState('dev:admin@lanka.com:Admin One:admin');
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const session = await login(token);
    localStorage.setItem('lanka.admin.auth', JSON.stringify(session));
    navigate('/dashboard');
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Admin Login</h1>
      <input value={token} onChange={(e) => setToken(e.target.value)} />
      <button type="submit">Login</button>
    </form>
  );
}