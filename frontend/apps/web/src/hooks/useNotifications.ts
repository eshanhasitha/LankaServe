import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

interface Notification {
  _id: string;
  userId: string;
  type: 'job' | 'system' | 'payment';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export function useNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load notifications from backend
  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest<Notification[]>('/notifications/my');
      setItems(res.data || []);
      setUnread((res.data || []).filter((n) => !n.isRead).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markRead = async (notificationId: string) => {
    try {
      await apiRequest(`/notifications/read/${notificationId}`, { method: 'PUT' });
      // Update local state
      setItems((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnread((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Load notifications on mount and set up interval
  useEffect(() => {
    load();
    // Refresh notifications every 15 seconds
    const intervalId = setInterval(load, 15000);
    return () => clearInterval(intervalId);
  }, []);

  return { 
    items, 
    unread, 
    loading, 
    error,
    reload: load,
    markRead
  };
}