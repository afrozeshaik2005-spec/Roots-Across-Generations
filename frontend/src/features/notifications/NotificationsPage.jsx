import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Bell, CheckCircle, Eye, EyeOff, Inbox } from 'lucide-react';
import api from '../../services/api.js';
import { useSocket } from '../../context/SocketContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export const NotificationsPage = () => {
  const socket = useSocket();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const familyId = searchParams.get('familyId') || user?.memberships?.[0]?.familyId;

  const [filter, setFilter] = useState('ALL'); // ALL, UNREAD, READ

  // 1. Fetch notification lists
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response.data?.notifications || [];
    }
  });

  // 2. Real-time updates handler
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      queryClient.setQueryData(['notifications'], (old = []) => {
        if (old.some(n => n.id === notification.id)) return old;
        return [notification, ...old];
      });
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket, queryClient]);

  // 3. Mark single read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // 4. Mark all read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const filtered = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    if (filter === 'READ') return n.isRead;
    return true;
  });

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }

    if (notif.type === 'JOIN_REQUEST' && familyId) {
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
    <div className="min-h-screen bg-ancestral-50/50 py-12 px-6 md:px-12 font-sans relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-ancestral-100/30 blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gold-50/20 blur-3xl"></div>

      <div className="max-w-4xl mx-auto relative z-10 space-y-8">
        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-ancestral-800 transition duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>

          {notifications.some(n => !n.isRead) && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              className="px-4 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 hover:text-ancestral-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-ancestral-600">
            <Bell className="w-5 h-5" />
            <h1 className="text-3xl font-display font-bold text-ancestral-900">
              Notification Center
            </h1>
          </div>
          <p className="text-sm text-neutral-500 font-light">
            Stay updated with family invites, profile corrections, tag updates, and birthday event reminders.
          </p>
        </div>

        {/* Filters and List */}
        <div className="glass-panel p-6 rounded-3xl space-y-6">
          <div className="flex border-b border-neutral-200 gap-6">
            {[
              { key: 'ALL', label: 'All Alerts', icon: Bell },
              { key: 'UNREAD', label: 'Unread Only', icon: EyeOff },
              { key: 'READ', label: 'Read Alerts', icon: Eye }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`pb-3.5 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition duration-200 focus:outline-none ${
                    isActive
                      ? 'border-ancestral-600 text-ancestral-700'
                      : 'border-transparent text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-ancestral-500" />
              <p className="mt-4 text-xs text-neutral-500">Unpacking notification logs...</p>
            </div>
          ) : filtered.length > 0 ? (
            <div className="divide-y divide-neutral-100">
              {filtered.map((notif) => (
                <div
                  key={notif.id}
                  className={`py-5 flex items-start justify-between gap-6 transition ${
                    !notif.isRead ? 'bg-ancestral-50/5' : ''
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-ancestral-550 shrink-0" />
                      )}
                      <h4 className="font-semibold text-neutral-805 text-sm">
                        {notif.title}
                      </h4>
                    </div>
                    <p className="text-xs text-neutral-400 font-light leading-relaxed">
                      {notif.body}
                    </p>
                    <span className="text-[10px] text-neutral-400 font-light block">
                      {new Date(notif.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} at{' '}
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <button
                    onClick={() => handleNotificationClick(notif)}
                    className="px-4 py-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-600 hover:text-ancestral-800 rounded-xl text-xs font-semibold transition duration-200 shrink-0"
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center space-y-4">
              <div className="inline-flex w-12 h-12 rounded-xl bg-ancestral-500/10 text-ancestral-600 items-center justify-center">
                <Inbox className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-neutral-800 font-display">No Notifications</h3>
              <p className="text-xs text-neutral-400 font-light max-w-sm mx-auto leading-relaxed">
                There are no notifications matching your current filter setting.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
