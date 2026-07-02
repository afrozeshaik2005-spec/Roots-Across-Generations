import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Camera, Inbox } from 'lucide-react';
import api from '../../services/api.js';
import MemoryCard from './MemoryCard.jsx';
import MemoryDetailPage from './MemoryDetailPage.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { AnimatePresence } from 'framer-motion';

export const MemberMemories = ({ memberId }) => {
  const { user } = useAuth();
  const [selectedMemory, setSelectedMemory] = useState(null);

  // Fetch memories this member is tagged in
  const { data: memories = [], isLoading, refetch } = useQuery({
    queryKey: ['memberMemories', memberId],
    queryFn: async () => {
      const response = await api.get(`/memories/member/${memberId}`);
      return response.data?.memories || [];
    },
    enabled: !!memberId
  });

  return (
    <div className="glass-panel p-6 rounded-3xl space-y-6">
      <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
        <Camera className="w-5 h-5 text-ancestral-600" />
        <h3 className="font-display font-bold text-base text-ancestral-900">Tagged Memories</h3>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-ancestral-500" />
        </div>
      ) : memories.length > 0 ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {memories.map((mem) => (
            <MemoryCard
              key={mem.id}
              memory={mem}
              onClick={() => setSelectedMemory(mem)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 space-y-3">
          <div className="inline-flex w-10 h-10 rounded-xl bg-ancestral-500/10 text-ancestral-600 items-center justify-center">
            <Inbox className="w-5 h-5" />
          </div>
          <p className="text-xs text-neutral-400 font-light">
            No memories tagged with this member yet.
          </p>
        </div>
      )}

      {/* Detail viewer modal */}
      <AnimatePresence>
        {selectedMemory && (
          <MemoryDetailPage
            memory={selectedMemory}
            currentUserMemberId={user?.memberId}
            isHistorian={user?.memberships?.some(m => ['FOUNDER', 'HISTORIAN'].includes(m.role))}
            onClose={() => setSelectedMemory(null)}
            onDeleteSuccess={() => refetch()}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MemberMemories;
