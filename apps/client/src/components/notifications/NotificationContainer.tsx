import { useNotificationSystem } from './NotificationContext';
import { NotificationToast } from './NotificationToast';
import { PongNotificationToast } from './PongNotificationToast';

export function NotificationContainer() {
  const { notifications, removeNotification } = useNotificationSystem();

  if (notifications.length === 0) {
    return null;
  }

  // Determine which toast component to use based on notification type
  const renderNotification = (notification: typeof notifications[0]) => {
    const isPongNotification =
      notification.type === 'pong-elo' ||
      notification.type === 'pong-tier' ||
      notification.type === 'pong-achievement';

    if (isPongNotification) {
      return <PongNotificationToast notification={notification} onDismiss={removeNotification} />;
    }

    return <NotificationToast notification={notification} onDismiss={removeNotification} />;
  };

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
          {renderNotification(notification)}
        </div>
      ))}
    </div>
  );
}
