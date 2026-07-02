import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2, User } from 'lucide-react';
import api from '../../services/api.js';
import { useSocket } from '../../context/SocketContext.jsx';
import MessageBubble from './MessageBubble.jsx';
import TypingIndicator from './TypingIndicator.jsx';

export const ChatWindow = ({ conversation, currentMemberId }) => {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const scrollRef = useRef(null);

  const { id: conversationId, otherMember = {} } = conversation;
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // 1. Fetch conversation messages
  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ['conversationMessages', conversationId],
    queryFn: async () => {
      const response = await api.get(`/messages/conversations/${conversationId}`);
      return response.data?.messages || [];
    },
    enabled: !!conversationId
  });

  // 2. Real-time Sockets Listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for new messages
    const handleNewMessage = (msg) => {
      if (msg.conversationId === conversationId) {
        queryClient.setQueryData(['conversationMessages', conversationId], (old = []) => {
          if (old.some(m => m.id === msg.id)) return old;
          return [...old, msg];
        });

        // Mark as read immediately on client side if chat window active
        api.patch(`/messages/${msg.id}/read`).then(() => {
          queryClient.invalidateQueries({ queryKey: ['conversationMessages', conversationId] });
        }).catch(() => {});
      }
    };

    // Listen for read receipts
    const handleReadReceipt = (receipt) => {
      if (receipt.conversationId === conversationId) {
        queryClient.setQueryData(['conversationMessages', conversationId], (old = []) => {
          return old.map(m => m.id === receipt.messageId ? { ...m, isRead: true } : m);
        });
      }
    };

    // Listen for typing indicator
    const handleTyping = (data) => {
      if (data.conversationId === conversationId && data.senderId === otherMember.id) {
        setIsTyping(data.typing);
      }
    };

    socket.on('message_received', handleNewMessage);
    socket.on('read_receipt', handleReadReceipt);
    socket.on('typing_indicator', handleTyping);

    // Mark existing unread messages as read when opening conversation
    const unreadMessages = messages.filter(m => m.receiverMemberId === currentMemberId && !m.isRead);
    for (const msg of unreadMessages) {
      api.patch(`/messages/${msg.id}/read`).catch(() => {});
    }

    return () => {
      socket.off('message_received', handleNewMessage);
      socket.off('read_receipt', handleReadReceipt);
      socket.off('typing_indicator', handleTyping);
    };
  }, [socket, conversationId, otherMember.id, messages, currentMemberId, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // 3. Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (text) => {
      const response = await api.post(`/messages/conversations/${conversationId}`, { content: text });
      return response.data?.message;
    },
    onSuccess: (newMsg) => {
      setContent('');
      queryClient.setQueryData(['conversationMessages', conversationId], (old = []) => [...old, newMsg]);
      queryClient.invalidateQueries({ queryKey: ['conversationsList'] });
    }
  });

  // 4. Soft delete message mutation
  const deleteMutation = useMutation({
    mutationFn: async (messageId) => {
      await api.delete(`/messages/${messageId}`);
    },
    onSuccess: (_, messageId) => {
      queryClient.setQueryData(['conversationMessages', conversationId], (old = []) => {
        return old.filter(m => m.id !== messageId);
      });
      queryClient.invalidateQueries({ queryKey: ['conversationsList'] });
    }
  });

  // Typing event emits
  const handleKeyDown = () => {
    if (!socket) return;

    socket.emit('typing_start', {
      conversationId,
      senderId: currentMemberId,
      receiverId: otherMember.id
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', {
        conversationId,
        senderId: currentMemberId,
        receiverId: otherMember.id
      });
    }, 2000);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!content.trim() || sendMutation.isPending) return;
    sendMutation.mutate(content.trim());

    if (socket) {
      socket.emit('typing_stop', {
        conversationId,
        senderId: currentMemberId,
        receiverId: otherMember.id
      });
    }
  };

  return (
    <div className="flex flex-col h-[70vh] bg-white border border-neutral-200/80 rounded-3xl overflow-hidden shadow-sm font-sans">
      {/* Header partner panel */}
      <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl overflow-hidden bg-neutral-100 flex items-center justify-center border border-neutral-200 shrink-0">
          {otherMember.profilePhoto ? (
            <img src={otherMember.profilePhoto} alt={otherMember.fullName} className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-neutral-300" />
          )}
        </div>
        <div>
          <h4 className="font-semibold text-neutral-800 text-xs">{otherMember.fullName}</h4>
          <span className="text-[9px] text-neutral-400 font-light block">Generational Chat</span>
        </div>
      </div>

      {/* Messages Thread Feed */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-neutral-50/30">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-ancestral-500" />
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isSender={msg.senderMemberId === currentMemberId}
              onSoftDelete={(id) => deleteMutation.mutate(id)}
            />
          ))
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-neutral-400 font-light">
            No messages logged yet. Type below to begin.
          </div>
        )}

        {isTyping && <TypingIndicator partnerName={otherMember.fullName} />}
        <div ref={scrollRef} />
      </div>

      {/* Input Form Bar */}
      <form onSubmit={handleSend} className="p-4 border-t border-neutral-100 flex items-center gap-3">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type message here..."
          className="flex-1 px-4 py-3 border border-neutral-200 focus:border-ancestral-300 rounded-xl focus:outline-none text-xs bg-neutral-50/20 focus:bg-white transition"
          required
        />
        <button
          type="submit"
          disabled={!content.trim() || sendMutation.isPending}
          className="p-3 forest-gradient hover:bg-ancestral-600 text-white rounded-xl shadow transition duration-200 shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
