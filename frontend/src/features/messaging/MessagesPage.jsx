import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowLeft, MessageSquare, Plus, MailOpen } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import ConversationList from './ConversationList.jsx';
import ChatWindow from './ChatWindow.jsx';
import StartConversationModal from './StartConversationModal.jsx';

export const MessagesPage = () => {
  const { familyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeConversation, setActiveConversation] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // 1. Fetch conversations list
  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['conversationsList', familyId],
    queryFn: async () => {
      const response = await api.get(`/messages/conversations?familyId=${familyId}`);
      return response.data?.conversations || [];
    },
    enabled: !!familyId
  });

  // 2. Fetch family tree members (to nominate for chat conversations)
  const { data: treeData } = useQuery({
    queryKey: ['familyTree', familyId],
    queryFn: async () => {
      const response = await api.get(`/families/${familyId}/tree`);
      return response.data;
    },
    enabled: !!familyId
  });

  const members = treeData?.members || [];

  // 3. Real-time: refresh conversation list when a message arrives
  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = () => {
      queryClient.invalidateQueries({ queryKey: ['conversationsList', familyId] });
    };

    socket.on('message_received', handleMessageReceived);
    return () => { socket.off('message_received', handleMessageReceived); };
  }, [socket, familyId, queryClient]);

  // 3. Start conversation mutation
  const startChatMutation = useMutation({
    mutationFn: async (targetMemberId) => {
      const response = await api.post('/messages/conversations', { familyId, targetMemberId });
      return response.data?.conversation;
    },
    onSuccess: (newConv) => {
      queryClient.invalidateQueries({ queryKey: ['conversationsList', familyId] });
      setModalOpen(false);
      
      // Select the conversation
      // Calculate other member details
      const otherMemberDetails = members.find(m => m.id === (newConv.memberOneId === user.memberId ? newConv.memberTwoId : newConv.memberOneId));
      setActiveConversation({
        id: newConv.id,
        otherMember: otherMemberDetails || {}
      });
    }
  });

  const handleStartChat = (targetMemberId) => {
    startChatMutation.mutate(targetMemberId);
  };

  return (
    <div className="min-h-screen bg-ancestral-50/50 py-12 px-6 md:px-12 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-ancestral-100/30 blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gold-50/20 blur-3xl"></div>

      <div className="max-w-6xl mx-auto relative z-10 space-y-8">
        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate(`/family/${familyId}/tree`)}
            className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-ancestral-800 transition duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Tree</span>
          </button>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-ancestral-650">
            <MessageSquare className="w-5.5 h-5.5" />
            <h1 className="text-3xl font-display font-bold text-ancestral-900">
              Family Messaging
            </h1>
          </div>
          <p className="text-sm text-neutral-500 font-light">
            Converse in real-time, 1-on-1 with approved relatives inside your family tree.
          </p>
        </div>

        {/* Split Feed Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Left: Conversations list */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-bold text-sm text-neutral-800">Chats List</h3>
              <button
                onClick={() => setModalOpen(true)}
                className="p-1.5 bg-ancestral-500 hover:bg-ancestral-600 text-white rounded-xl flex items-center justify-center transition"
                title="New Chat"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {isLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-ancestral-500" />
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                activeId={activeConversation?.id}
                onSelect={(conv) => setActiveConversation(conv)}
              />
            )}
          </div>

          {/* Right: Active chat window */}
          <div className="md:col-span-2">
            {activeConversation ? (
              <ChatWindow
                key={activeConversation.id}
                conversation={activeConversation}
                currentMemberId={user?.memberId}
              />
            ) : (
              <div className="h-[70vh] bg-white border border-neutral-200/80 rounded-3xl flex flex-col items-center justify-center space-y-4 shadow-sm p-8">
                <div className="w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center border border-neutral-100 text-neutral-400">
                  <MailOpen className="w-5 h-5" />
                </div>
                <div className="text-center space-y-1 max-w-sm">
                  <h3 className="font-semibold text-neutral-850 font-display text-sm">Select a conversation</h3>
                  <p className="text-[11px] text-neutral-400 font-light leading-relaxed">
                    Choose an existing chat thread from the left or click the "+" button to start messaging another relative.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Start conversation modal */}
      {modalOpen && (
        <StartConversationModal
          members={members}
          currentMemberId={user?.memberId}
          onClose={() => setModalOpen(false)}
          onSelectMember={handleStartChat}
        />
      )}
    </div>
  );
};

export default MessagesPage;
