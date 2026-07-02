import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Users, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import api from '../../services/api.js';

export const MemberManagementPage = () => {
  const { familyId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('ACTIVE'); // ACTIVE, DELETED

  // 1. Query all family members
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['adminMembers', familyId],
    queryFn: async () => {
      const response = await api.get(`/admin/members?familyId=${familyId}`);
      return response.data?.members || [];
    },
    enabled: !!familyId
  });

  // 2. Soft delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (memberId) => {
      await api.patch(`/admin/members/${memberId}/delete`, { familyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMembers', familyId] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard', familyId] });
    }
  });

  // 3. Restore member mutation
  const restoreMutation = useMutation({
    mutationFn: async (memberId) => {
      await api.patch(`/admin/members/${memberId}/restore`, { familyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMembers', familyId] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard', familyId] });
    }
  });

  const handleDelete = (member) => {
    if (!confirm(`Are you sure you want to soft-delete the profile of ${member.fullName}? Deceased profiles are permanently locked, but standard member records can be restored later.`)) return;
    deleteMutation.mutate(member.id);
  };

  const handleRestore = (member) => {
    if (!confirm(`Are you sure you want to restore the profile of ${member.fullName}?`)) return;
    restoreMutation.mutate(member.id);
  };

  const activeMembers = members.filter(m => !m.isDeleted);
  const deletedMembers = members.filter(m => m.isDeleted);

  const displayedList = activeTab === 'ACTIVE' ? activeMembers : deletedMembers;

  return (
    <div className="min-h-screen bg-ancestral-50/50 py-12 px-6 md:px-12 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-ancestral-100/30 blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gold-50/20 blur-3xl"></div>

      <div className="max-w-4xl mx-auto relative z-10 space-y-8">
        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate(`/family/${familyId}/admin`)}
            className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-ancestral-800 transition duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Workspace</span>
          </button>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-ancestral-650">
            <Users className="w-5.5 h-5.5" />
            <h1 className="text-3xl font-display font-bold text-ancestral-900">
              Members Directory
            </h1>
          </div>
          <p className="text-sm text-neutral-500 font-light">
            Review active tree profiles, view deceased records, or perform soft deletions and profile restorations.
          </p>
        </div>

        {/* Filters and List */}
        <div className="glass-panel p-6 rounded-3xl space-y-6">
          <div className="flex border-b border-neutral-200 gap-6">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`pb-3.5 text-sm font-semibold border-b-2 transition focus:outline-none ${
                activeTab === 'ACTIVE'
                  ? 'border-ancestral-600 text-ancestral-750'
                  : 'border-transparent text-neutral-400 hover:text-neutral-600'
              }`}
            >
              Active Members ({activeMembers.length})
            </button>
            <button
              onClick={() => setActiveTab('DELETED')}
              className={`pb-3.5 text-sm font-semibold border-b-2 transition focus:outline-none ${
                activeTab === 'DELETED'
                  ? 'border-ancestral-600 text-ancestral-750'
                  : 'border-transparent text-neutral-400 hover:text-neutral-600'
              }`}
            >
              Archived / Deleted ({deletedMembers.length})
            </button>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-ancestral-500" />
            </div>
          ) : displayedList.length > 0 ? (
            <div className="divide-y divide-neutral-100">
              {displayedList.map((m) => (
                <div key={m.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-100 flex items-center justify-center border border-neutral-200 shrink-0">
                      {m.profilePhoto ? (
                        <img src={m.profilePhoto} alt={m.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">👤</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-neutral-800 text-sm">{m.fullName}</span>
                        {!m.isLiving && <span className="text-[10px]" title="Deceased">🕊</span>}
                      </div>
                      <span className="text-[10px] text-neutral-400 font-light block">Gen {m.generationNumber || 'Unknown'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {m.isDeleted ? (
                    <button
                      onClick={() => handleRestore(m)}
                      className="px-3.5 py-2 border border-ancestral-200 hover:bg-ancestral-50 text-ancestral-700 hover:text-ancestral-800 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore Profile</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDelete(m)}
                      className="p-2 border border-red-100 hover:border-red-200 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-xl transition"
                      title="Soft Delete Profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 mx-auto text-neutral-300" />
              <p className="text-xs text-neutral-400 font-light">No members registered in this category.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberManagementPage;
