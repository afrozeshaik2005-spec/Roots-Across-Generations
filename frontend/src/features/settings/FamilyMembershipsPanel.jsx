import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Home, Star, LogOut, Shield } from 'lucide-react';
import api from '../../services/api.js';

export const FamilyMembershipsPanel = () => {
  const queryClient = useQueryClient();

  // 1. Fetch user family memberships
  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ['userFamilies'],
    queryFn: async () => {
      const response = await api.get('/settings/families');
      return response.data?.families || [];
    }
  });

  // 2. Set primary family mutation
  const primaryMutation = useMutation({
    mutationFn: async (membershipId) => {
      await api.patch(`/settings/families/${membershipId}/primary`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userFamilies'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      alert('Primary family changed successfully!');
    }
  });

  // 3. Leave family mutation
  const leaveMutation = useMutation({
    mutationFn: async (membershipId) => {
      await api.delete(`/settings/families/${membershipId}/leave`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userFamilies'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      alert('Left family successfully!');
    },
    onError: (err) => {
      alert(err.response?.data?.error?.message || 'Failed to leave family');
    }
  });

  const handleLeave = (m) => {
    if (!confirm(`Are you sure you want to leave the family tree of ${m.familyName}? You will lose access to all its tree data, messages, and memories vault.`)) return;
    leaveMutation.mutate(m.id);
  };

  return (
    <div className="space-y-6 font-sans max-w-lg">
      <div className="border-b border-neutral-100 pb-4">
        <h3 className="font-display font-bold text-sm text-neutral-800">Family Memberships</h3>
        <p className="text-[10px] text-neutral-400 font-light mt-0.5">
          List of families you are connected to, including role priorities and primary flags
        </p>
      </div>

      {isLoading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-ancestral-500" />
        </div>
      ) : memberships.length > 0 ? (
        <div className="space-y-3">
          {memberships.map((m) => (
            <div
              key={m.id}
              className={`p-4 border rounded-2xl flex items-center justify-between gap-4 transition bg-white ${
                m.isPrimary ? 'border-ancestral-400 shadow-sm' : 'border-neutral-150'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${m.isPrimary ? 'bg-ancestral-500/10 text-ancestral-750' : 'bg-neutral-100 text-neutral-500'}`}>
                  <Home className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-neutral-800">{m.familyName}</span>
                    <span className="text-[9px] text-neutral-400 font-light block">({m.readableFamilyId})</span>
                  </div>
                  <span className="text-[9px] text-neutral-500 font-light block mt-0.5 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-neutral-400" />
                    <span>Role: <strong className="font-semibold">{m.role}</strong></span>
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {m.isPrimary ? (
                  <span className="text-[9px] bg-ancestral-650 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 uppercase tracking-wide">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    <span>Primary</span>
                  </span>
                ) : (
                  <button
                    onClick={() => primaryMutation.mutate(m.id)}
                    className="p-1.5 hover:bg-neutral-100 text-neutral-400 hover:text-ancestral-750 rounded-lg transition"
                    title="Make Primary Family"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => handleLeave(m)}
                  className="p-1.5 hover:bg-red-50 text-neutral-400 hover:text-red-650 rounded-lg transition"
                  title="Leave Family"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-neutral-400 font-light">
          No family memberships registered.
        </div>
      )}
    </div>
  );
};

export default FamilyMembershipsPanel;
