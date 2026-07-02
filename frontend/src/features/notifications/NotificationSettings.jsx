import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ShieldCheck, Bell } from 'lucide-react';
import api from '../../services/api.js';

export const NotificationSettings = () => {
  const queryClient = useQueryClient();

  // 1. Fetch current settings preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: async () => {
      const response = await api.get('/notifications/preferences');
      return response.data?.preferences;
    }
  });

  // 2. Save modifications mutation
  const updateMutation = useMutation({
    mutationFn: async (updatedFields) => {
      const response = await api.patch('/notifications/preferences', updatedFields);
      return response.data?.preferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
    }
  });

  const handleToggle = (key, value) => {
    updateMutation.mutate({ [key]: !value });
  };

  if (isLoading) {
    return (
      <div className="py-6 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-ancestral-500" />
      </div>
    );
  }

  const items = [
    { key: 'joinRequest', label: 'Join Requests & Approvals', desc: 'Alert when relatives submit requests to join this family tree.' },
    { key: 'memoryTagged', label: 'Tagged in Memories', desc: 'Alert when a family member tags you in photos, videos, or stories.' },
    { key: 'profileUpdated', label: 'Profile Updates', desc: 'Alert when personal profile or timeline elements are corrected.' },
    { key: 'birthdayReminder', label: 'Birthday Reminders', desc: 'Get annual alerts for upcoming family member birthdays.' },
    { key: 'anniversaryReminder', label: 'Anniversary Reminders', desc: 'Get annual alerts for upcoming marriage/milestone anniversaries.' },
    { key: 'newMember', label: 'New Member Welcomes', desc: 'Alert when a new member joins your family.' }
  ];

  return (
    <div className="glass-panel p-6 rounded-3xl space-y-6 font-sans">
      <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
        <Bell className="w-5 h-5 text-ancestral-600" />
        <div>
          <h3 className="font-display font-bold text-base text-ancestral-900">Notification Preferences</h3>
          <p className="text-[10px] text-neutral-400 font-light mt-0.5">
            Configure how and when you receive real-time generational alerts
          </p>
        </div>
      </div>

      <div className="divide-y divide-neutral-100">
        {items.map((item) => {
          const val = preferences?.[item.key] ?? true;
          return (
            <div key={item.key} className="py-4 flex items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-neutral-800 block">{item.label}</span>
                <span className="text-[10px] text-neutral-400 font-light block leading-normal">{item.desc}</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle(item.key, val)}
                className={`w-10 h-5.5 rounded-full relative transition duration-300 focus:outline-none shrink-0 ${
                  val ? 'bg-ancestral-600' : 'bg-neutral-200'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full bg-white absolute top-0.5 shadow-sm transition duration-300 ${
                    val ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-neutral-50/50 border border-neutral-150 p-4 rounded-2xl flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-ancestral-600 mt-0.5 shrink-0" />
        <span className="text-[10px] text-neutral-400 font-light leading-relaxed">
          Preferences apply to in-app notification dropdown pushes and real-time Socket.io popups.
        </span>
      </div>
    </div>
  );
};

export default NotificationSettings;
