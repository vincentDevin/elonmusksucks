import { useNotificationSystem } from './NotificationContext';
import { NotificationToast } from './NotificationToast';

export function NotificationContainer() {
  const { notifications, removeNotification } = useNotificationSystem();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed top-20 right-4 z-[60] space-y-3 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{
            animationDelay: `${index * 100}ms`,
          }}
        >
          <NotificationToast notification={notification} onDismiss={removeNotification} />
        </div>
      ))}
    </div>
  );
}
