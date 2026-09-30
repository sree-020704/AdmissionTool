import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { notificationsApi } from '@/api/notifications.api';

export function StaffNotificationsCenterPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const load = useCallback(async () => {
    try {
      const { data } = await notificationsApi.list({ limit: 50 });
      setNotifications(data.data.notifications ?? []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      toast.success('All notifications marked read');
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to mark read');
    }
  };

  const handleNavigate = async (notification) => {
    if (!notification.read) {
      try {
        await notificationsApi.markRead(notification.id);
      } catch {
        /* ignore */
      }
    }
    if (notification.link) navigate(notification.link);
  };

  return (
    <DashboardLayout title="Notifications" subtitle="Your activity timeline">
      <div className="overflow-hidden rounded-2xl border border-divider bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-divider px-5 py-4">
          <p className="text-sm text-label">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-input-bg"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          ) : null}
        </div>

        {loading ? (
          <p className="px-5 py-10 text-sm text-label">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Bell className="mx-auto h-10 w-10 text-placeholder" />
            <p className="mt-4 text-sm font-semibold text-heading">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => handleNavigate(notification)}
              className={`block w-full border-b border-gray-bg px-5 py-4 text-left transition last:border-b-0 hover:bg-row-hover ${
                notification.read ? 'bg-white' : 'bg-input-bg'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-heading">{notification.title}</p>
                {!notification.read ? (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                ) : null}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-label">{notification.body}</p>
              <p className="mt-2 text-[10px] text-icon-disabled">
                {new Date(notification.createdAt).toLocaleString()}
              </p>
            </button>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
