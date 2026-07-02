import { useQuery } from '@tanstack/react-query';
import { useSocket } from '../../context/SocketContext.jsx';
import { useEffect, useState } from 'react';
import { Loader2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import api from '../../services/api.js';

const STATUS_CONFIG = {
  PENDING: { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, label: 'Pending' },
  APPROVED: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, label: 'Approved' },
  REJECTED: { color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle, label: 'Rejected' }
};

export const MyJoinRequests = () => {
  const socket = useSocket();
  const [requests, setRequests] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['myJoinRequests'],
    queryFn: async () => {
      const res = await api.get('/join-requests/my-requests');
      return res.data?.requests || [];
    }
  });

  useEffect(() => {
    if (data) setRequests(data);
  }, [data]);

  // Listen for real-time status changes via socket
  useEffect(() => {
    if (!socket) return;

    const handleStatusChange = (payload) => {
      setRequests(prev => {
        if (!prev) return prev;
        return prev.map(r =>
          r.requestId === payload.requestId
            ? { ...r, status: payload.status, updatedAt: new Date().toISOString() }
            : r
        );
      });
    };

    socket.on('joinRequest.statusChanged', handleStatusChange);
    return () => socket.off('joinRequest.statusChanged', handleStatusChange);
  }, [socket]);

  if (isLoading && !requests) {
    return (
      <div className="flex items-center gap-2 text-xs text-neutral-400 py-4">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Loading your requests...</span>
      </div>
    );
  }

  if (!requests || requests.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Your Join Requests</h3>
      <div className="space-y-2">
        {requests.map((req) => {
          const config = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
          const StatusIcon = config.icon;
          return (
            <div
              key={req.requestId}
              className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-100 hover:border-neutral-200 transition"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-neutral-700">
                  {req.familyName} {req.familySurname}
                </p>
                <p className="text-[10px] text-neutral-400 font-light">
                  Relationship: {req.relationshipType?.toLowerCase().replaceAll('_', ' ')}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.color}`}>
                <StatusIcon className="w-3 h-3" />
                {config.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyJoinRequests;
