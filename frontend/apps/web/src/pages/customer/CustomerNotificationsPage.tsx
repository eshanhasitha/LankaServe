import { useNotifications } from '../../hooks/useNotifications';

export default function NotificationsPage() {
  const { items, loading, markRead } = useNotifications();

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-6">Notifications</h1>

      {loading ? (
        <p className="text-gray-500 text-center py-8">Loading notifications...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No notifications yet</p>
      ) : (
        <div className="space-y-3">
          {items.map((notification) => (
            <div
              key={notification._id}
              className={`p-4 rounded-lg border cursor-pointer transition ${
                notification.isRead
                  ? 'bg-gray-50 border-gray-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
              onClick={() => !notification.isRead && markRead(notification._id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {notification.title}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    {notification.body}
                  </p>
                  <p className="text-gray-400 text-xs mt-2">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Unread indicator - blue dot */}
                {!notification.isRead && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full ml-2 mt-1" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}