import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, CheckCircle, XCircle, Loader2, Send, Inbox, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import api from '../../services/api.js';
import ContactRequestModal from '../family-tree/ContactRequestModal.jsx';

const ContactRequestsPage = () => {
  const { familyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('received'); // 'received' | 'sent'
  const [modal, setModal] = useState(null);

  const currentUserMemberId = user?.memberId;

  // Fetch received requests
  const { data: receivedData, isLoading: loadingReceived } = useQuery({
    queryKey: ['contactRequests', 'received'],
    queryFn: async () => {
      const res = await api.get('/contact-requests/received');
      return res.data?.requests || [];
    }
  });

  // Fetch sent requests
  const { data: sentData, isLoading: loadingSent } = useQuery({
    queryKey: ['contactRequests', 'sent'],
    queryFn: async () => {
      const res = await api.get('/contact-requests/sent');
      return res.data?.requests || [];
    }
  });

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;
    const handleCreated = () => queryClient.invalidateQueries({ queryKey: ['contactRequests', 'received'] });
    const handleApproved = () => {
      queryClient.invalidateQueries({ queryKey: ['contactRequests'] });
      queryClient.invalidateQueries({ queryKey: ['contactRequestStatus'] });
    };
    const handleRejected = () => {
      queryClient.invalidateQueries({ queryKey: ['contactRequests'] });
      queryClient.invalidateQueries({ queryKey: ['contactRequestStatus'] });
    };
    socket.on('contact.request.created', handleCreated);
    socket.on('contact.request.approved', handleApproved);
    socket.on('contact.request.rejected', handleRejected);
    return () => {
      socket.off('contact.request.created', handleCreated);
      socket.off('contact.request.approved', handleApproved);
      socket.off('contact.request.rejected', handleRejected);
    };
  }, [socket, queryClient]);

  const requests = tab === 'received' ? (receivedData || []) : (sentData || []);
  const isLoading = tab === 'received' ? loadingReceived : loadingSent;

  const fieldLabels = (fields) => {
    if (!fields?.length) return '';
    return fields.map(f => {
      if (f === 'PHONE') return 'Phone';
      if (f === 'EMAIL') return 'Email';
      if (f === 'ADDRESS') return 'Address';
      if (f === 'ALL') return 'All Details';
      return f;
    }).join(', ');
  };

  return (
    <div className="min-h-screen bg-ancestral-50/50 font-sans">
      {/* Header */}
      <div className="h-14 border-b border-neutral-200/80 bg-white/70 backdrop-blur-md flex items-center px-6 gap-4">
        <button
          onClick={() => navigate(`/family/${familyId}/tree`)}
          className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-ancestral-800 transition duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tree</span>
        </button>
        <h2 className="text-sm font-bold text-ancestral-900 tracking-wide">Contact Requests</h2>
      </div>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-6 pt-6">
        <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => setTab('received')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition duration-200 ${
              tab === 'received' ? 'bg-white text-ancestral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Received ({receivedData?.length || 0})
          </button>
          <button
            onClick={() => setTab('sent')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition duration-200 ${
              tab === 'sent' ? 'bg-white text-ancestral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Sent ({sentData?.length || 0})
          </button>
        </div>

        {/* Request List */}
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-ancestral-500" />
          </div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Inbox className="w-10 h-10 mx-auto text-neutral-300" />
            <p className="text-xs text-neutral-400 font-light">
              {tab === 'received' ? 'No contact requests received yet.' : 'No contact requests sent yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const otherPerson = tab === 'received' ? req.requester : req.owner;
              const statusColor = {
                PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
                APPROVED: 'bg-green-50 text-green-700 border-green-200',
                REJECTED: 'bg-red-50 text-red-700 border-red-200'
              }[req.status];

              return (
                <div
                  key={req.id}
                  className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3 hover:shadow-sm transition duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {otherPerson?.profilePhoto ? (
                        <img src={otherPerson.profilePhoto} alt="" className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-ancestral-50 text-ancestral-700 font-semibold text-sm flex items-center justify-center">
                          {otherPerson?.fullName?.charAt(0) || '?'}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-neutral-800">{otherPerson?.fullName || 'Unknown'}</p>
                        <p className="text-[10px] text-neutral-400">
                          {tab === 'received' ? 'wants your contact info' : `requested their contact info`}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                    <Send className="w-3 h-3" />
                    <span>Requested: {fieldLabels(req.fields)}</span>
                  </div>

                  {req.status === 'PENDING' && tab === 'received' && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setModal({ mode: 'received', request: req })}
                        className="flex-1 py-2 bg-ancestral-600 hover:bg-ancestral-700 text-white rounded-xl text-xs font-semibold transition duration-200 flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Review & Respond
                      </button>
                    </div>
                  )}

                  {req.status === 'APPROVED' && (tab === 'sent') && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setModal({ mode: 'shared', request: req })}
                        className="flex-1 py-2 border border-ancestral-200 hover:bg-ancestral-50 text-ancestral-700 rounded-xl text-xs font-semibold transition duration-200 flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Shared Info
                      </button>
                    </div>
                  )}

                  <p className="text-[9px] text-neutral-300">
                    {new Date(req.createdAt).toLocaleDateString()} · {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <ContactRequestModal
          mode={modal.mode}
          request={modal.request}
          ownerId={modal.request.ownerId}
          ownerName={modal.request.owner?.fullName}
          familyId={familyId}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};

export default ContactRequestsPage;
