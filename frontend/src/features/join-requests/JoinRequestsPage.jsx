import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, Users, RefreshCw, Inbox } from 'lucide-react';
import api from '../../services/api.js';
import { useSocket } from '../../context/SocketContext.jsx';
import JoinRequestCard from './JoinRequestCard.jsx';
import EditRelationshipModal from './EditRelationshipModal.jsx';

export const JoinRequestsPage = () => {
  const { familyId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();

  const [editingRequest, setEditingRequest] = useState(null);

  // 1. Fetch pending join requests
  const { data: requestsData, isLoading: loadingRequests, refetch: refetchRequests } = useQuery({
    queryKey: ['joinRequests', familyId],
    queryFn: async () => {
      const response = await api.get(`/join-requests/family/${familyId}`);
      return response.data?.requests || [];
    },
    enabled: !!familyId
  });

  // Listen for real-time join request status changes via socket
  useEffect(() => {
    if (!socket || !familyId) return;

    const handleStatusChange = () => {
      refetchRequests();
    };

    socket.on('joinRequest.statusChanged', handleStatusChange);
    socket.on('joinRequest.created', handleStatusChange);
    return () => {
      socket.off('joinRequest.statusChanged', handleStatusChange);
      socket.off('joinRequest.created', handleStatusChange);
    };
  }, [socket, familyId, refetchRequests]);

  // 2. Fetch family members to resolve relative name displays
  const { data: treeData, isLoading: loadingTree } = useQuery({
    queryKey: ['familyTree', familyId],
    queryFn: async () => {
      const response = await api.get(`/families/${familyId}/tree`);
      return response.data;
    },
    enabled: !!familyId
  });

  const members = treeData?.members || [];

  const handleAccept = async (requestId) => {
    try {
      const response = await api.patch(`/join-requests/${requestId}/accept`);
      if (response.data?.success) {
        refetchRequests();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to accept join request');
    }
  };

  const handleReject = async (requestId) => {
    const reason = prompt('Enter decline reason (optional):');
    if (reason === null) return; // user cancelled prompt

    try {
      const response = await api.patch(`/join-requests/${requestId}/reject`, { reason: reason.trim() });
      if (response.data?.success) {
        refetchRequests();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to decline join request');
    }
  };

  return (
    <div className="min-h-screen bg-ancestral-50/50 py-12 px-6 md:px-12 relative overflow-hidden font-sans">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-ancestral-100 opacity-40 blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gold-50 opacity-30 blur-3xl"></div>

      <div className="max-w-5xl mx-auto relative z-10 space-y-8">
        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-ancestral-800 transition duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => refetchRequests()}
            className="p-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-500 rounded-xl transition duration-200"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-ancestral-600">
            <Users className="w-5 h-5" />
            <h1 className="text-3xl font-display font-bold text-ancestral-900">
              Join Requests
            </h1>
          </div>
          <p className="text-sm text-neutral-500 font-light">
            Review family verification claims. Approved requests are dynamically mapped onto the tree.
          </p>
        </div>

        {loadingRequests || loadingTree ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-ancestral-500" />
            <p className="mt-4 text-xs text-neutral-500">Checking pending requests...</p>
          </div>
        ) : requestsData.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requestsData.map((req) => (
              <JoinRequestCard
                key={req.id}
                request={req}
                members={members}
                onAccept={handleAccept}
                onReject={handleReject}
                onEdit={(requestData) => setEditingRequest(requestData)}
              />
            ))}
          </div>
        ) : (
          <div className="glass-panel p-12 rounded-3xl text-center max-w-md mx-auto space-y-4">
            <div className="inline-flex w-12 h-12 rounded-xl bg-ancestral-500/10 text-ancestral-600 items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-ancestral-900 font-display">No Pending Requests</h3>
            <p className="text-xs text-neutral-400 font-light leading-relaxed">
              All relative claims resolved! Share your invitation link or QR code to onboard more members.
            </p>
          </div>
        )}
      </div>

      {/* Edit Relationship Modal */}
      <AnimatePresence>
        {editingRequest && (
          <EditRelationshipModal
            request={editingRequest}
            members={members}
            onClose={() => setEditingRequest(null)}
            onSuccess={refetchRequests}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default JoinRequestsPage;
