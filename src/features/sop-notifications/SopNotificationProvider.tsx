import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { MOCK_SOP_CHANGE_NOTIFICATIONS } from '@/mocks/sopChangeNotifications';
import type { SopChangeNotification } from './types';
import SopChangeReviewModal from './SopChangeReviewModal';

interface SopNotificationContextValue {
  notifications: SopChangeNotification[];
  pendingNotifications: SopChangeNotification[];
  unreadCount: number;
  reviewNotification: (id: string) => void;
  closeReview: () => void;
  resolveNotification: (
    id: string,
    outcome: 'rejected' | 'approved',
  ) => void;
}

const SopNotificationContext = createContext<SopNotificationContextValue | null>(
  null,
);

export function useSopNotifications() {
  const context = useContext(SopNotificationContext);
  if (!context) {
    throw new Error(
      'useSopNotifications must be used within SopNotificationProvider',
    );
  }
  return context;
}

export function SopNotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState(
    MOCK_SOP_CHANGE_NOTIFICATIONS,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const reviewNotification = (id: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, unread: false }
          : notification,
      ),
    );
    setSelectedId(id);
  };

  const resolveNotification = (
    id: string,
    outcome: 'rejected' | 'approved',
  ) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? {
              ...notification,
              status: outcome === 'rejected' ? 'rejected' : 'resolved',
              unread: false,
            }
          : notification,
      ),
    );
    setSelectedId(null);
  };

  const pendingNotifications = notifications.filter(
    (notification) => notification.status === 'pending',
  );
  const selectedNotification =
    notifications.find((notification) => notification.id === selectedId) ?? null;

  return (
    <SopNotificationContext.Provider
      value={{
        notifications,
        pendingNotifications,
        unreadCount: notifications.filter(
          (notification) =>
            notification.unread && notification.status === 'pending',
        ).length,
        reviewNotification,
        closeReview: () => setSelectedId(null),
        resolveNotification,
      }}
    >
      {children}
      <SopChangeReviewModal
        notification={selectedNotification}
        onClose={() => setSelectedId(null)}
        onResolve={resolveNotification}
      />
    </SopNotificationContext.Provider>
  );
}
