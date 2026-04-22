import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

export function useNotifications() {
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);

  async function load() {
    const res = await apiRequest<any[]>('/notifications/my');
    setItems(res.data);
    setUnread(res.data.filter((x) => !x.isRead).length);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  return { items, unread, reload: load };
}
