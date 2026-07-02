import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Monitor, LogOut, Radio } from 'lucide-react';
import api from '../../services/api.js';

export const SessionsPanel = () => {
  const queryClient = useQueryClient();

  // Fetch active sessions list
  const { data, isLoading } = useQuery({
    queryKey: ['activeSessions'],
    queryFn: async () => {
      const response = await api.get('/settings/sessions');
      return response.data?.sessions || [];
    }
  });

  // Logout all other sessions mutation
  const logoutOthersMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/settings/sessions');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
      alert('Successfully logged out of other devices!');
    }
  });

  const handleLogoutOthers = () => {
    if (!confirm('Are you sure you want to terminate all other active login sessions?')) return;
    logoutOthersMutation.mutate();
  };

  return (
    <div className="space-y-6 font-sans max-w-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-100 pb-4">
        <div>
          <h3 className="font-display font-bold text-sm text-neutral-800">Device Login Sessions</h3>
          <p className="text-[10px] text-neutral-400 font-light mt-0.5">
            Overview of devices currently logged into your account
          </p>
        </div>

        {data?.length > 1 && (
          <button
            onClick={handleLogoutOthers}
            disabled={logoutOthersMutation.isPending}
            className="px-3 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 hover:text-neutral-800 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
          >
            {logoutOthersMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span>Logout other devices</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-ancestral-500" />
        </div>
      ) : data?.length > 0 ? (
        <div className="space-y-3">
          {data.map((session) => (
            <div
              key={session.id}
              className={`p-4 border rounded-2xl flex items-center justify-between gap-4 transition ${
                session.isCurrent
                  ? 'bg-ancestral-50/15 border-ancestral-400 shadow-sm'
                  : 'bg-white border-neutral-150'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${session.isCurrent ? 'bg-ancestral-500/10 text-ancestral-750' : 'bg-neutral-100 text-neutral-500'}`}>
                  <Monitor className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-neutral-800">
                      {session.isCurrent ? 'This Current Device' : 'Alternate Device Session'}
                    </span>
                    {session.isCurrent && (
                      <span className="text-[8px] bg-ancestral-600 text-white font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 uppercase tracking-wide animate-pulse">
                        <Radio className="w-2 h-2" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-neutral-400 block font-light mt-0.5">
                    Logged in on: {new Date(session.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {!session.isCurrent && (
                <span className="text-[10px] text-neutral-400 font-light italic">
                  Expires in 7 days
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-neutral-400 font-light">
          No sessions registered.
        </div>
      )}
    </div>
  );
};

export default SessionsPanel;
