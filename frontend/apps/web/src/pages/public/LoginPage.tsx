import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';

export default function LoginPage() {
  const [token, setToken] = useState('dev:customer@lanka.com:Customer One:customer');
  const { loginWithDevToken } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await loginWithDevToken(token);
    navigate('/home');
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Login</h1>
      <input value={token} onChange={(e) => setToken(e.target.value)} />
      <button type="submit">Login</button>
    </form>
  );
}
