const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export type User = {
  _id: string;
  name: string;
  email: string;
  role: 'customer' | 'provider' | 'admin';
};

export type Session = {
  user: User;
  accessToken: string;
};

export async function login(firebaseIdToken: string): Promise<Session> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firebaseIdToken }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || 'Login failed');
  return data.data;
}