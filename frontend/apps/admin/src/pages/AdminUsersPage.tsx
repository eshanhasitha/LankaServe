import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

type User = {
  _id: string;
  name: string;
  role: string;
};

type UsersResponse = {
  success: boolean;
  data: User[];
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    apiRequest<UsersResponse>('/admin/users').then((res) => setUsers(res.data || []));
  }, []);

  return (
    <div>
      <h1>Users</h1>
      {users.map((u) => (
        <div key={u._id}>
          {u.name} - {u.role}
        </div>
      ))}
    </div>
  );
}