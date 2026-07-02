import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Loader2, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext.jsx';
import api from '../../services/api.js';

export const NotificationBell = ({ familyId }) => {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // 1. Query notification list
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response.data?.notifications || [];
    }
  });

  // 2. Real-time listener for incoming alerts
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      console.log('Socket notification received:', notification);
      // Optimistically append or invalidate cache
      queryClient.setQueryData(['notifications'], (old = []) => {
        // Prevent duplicate append
        if (old.some(n => n.id === notification.id)) return old;
        return [notification, ...old];
      });
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket, queryClient]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // 3. Mark single as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // 4. Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }
    setIsOpen(false);

    // Contact info request notifications
    if (notif.title === 'Contact Info Request' && familyId) {
      navigate(`/family/${familyId}/contact-requests`);
    } else if (notif.title === 'Contact Info Shared' && familyId) {
      navigate(`/family/${familyId}/contact-requests`);
    } else if (notif.title === 'Contact Request Rejected' && familyId) {
      navigate(`/family/${familyId}/contact-requests`);
    } else if (notif.type === 'MESSAGE_RECEIVED' && familyId) {
      navigate(`/family/${familyId}/messages`);
    } else if (notif.type === 'JOIN_REQUEST' && familyId) {
      navigate(`/family/${familyId}/join-requests`);
    } else if (notif.type === 'MEMORY_TAGGED' && familyId) {
      navigate(`/family/${familyId}/memories`);
    } else if (notif.type === 'PROFILE_UPDATED' && notif.referenceId) {
      navigate(`/member/${notif.referenceId}?familyId=${familyId}`);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 text-neutral-500 hover:text-ancestral-800 rounded-xl transition duration-200 focus:outline-none"
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold border-2 border-white shadow-sm animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white border border-neutral-200/80 rounded-3xl shadow-xl z-50 overflow-hidden flex flex-col max-h-96">
          {/* Header */}
          <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
            <span className="font-display font-bold text-xs text-neutral-800">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-[10px] font-bold text-ancestral-600 hover:text-ancestral-800 flex items-center gap-0.5 transition"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-50">
            {isLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-ancestral-500" />
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 hover:bg-neutral-50/50 cursor-pointer transition flex items-start gap-3 relative ${
                    !notif.isRead ? 'bg-ancestral-50/10' : ''
                  }`}
                >
                  {/* Unread dot indicator */}
                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-ancestral-500 absolute top-4.5 right-4 shrink-0" />
                  )}

                  <div className="space-y-1 min-w-0 pr-4">
                    <h5 className="text-xs font-bold text-neutral-800 leading-snug">
                      {notif.title}
                    </h5>
                    <p className="text-[10px] text-neutral-400 font-light leading-relaxed">
                      {notif.body}
                    </p>
                    <span className="text-[8px] text-neutral-400 block font-light">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                      · {new Date(notif.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center space-y-2">
                <Inbox className="w-8 h-8 mx-auto text-neutral-300" />
                <p className="text-xs text-neutral-400 font-light">No notifications yet.</p>
              </div>
            )}
          </div>

          {/* Footer linking to full notifications list */}
          <div className="p-3 border-t border-neutral-100 bg-neutral-50/50 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate(`/notifications?familyId=${familyId || ''}`);
              }}
              className="text-[10px] font-bold text-ancestral-650 hover:text-ancestral-850 transition"
            >
              See all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
