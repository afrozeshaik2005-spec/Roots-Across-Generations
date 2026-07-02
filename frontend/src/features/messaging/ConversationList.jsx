import { User } from 'lucide-react';

export const ConversationList = ({ conversations, activeId, onSelect }) => {
  return (
    <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2 font-sans">
      {conversations.map((c) => {
        const isActive = c.id === activeId;
        const otherMember = c.otherMember || {};
        
        return (
          <div
            key={c.id}
            onClick={() => onSelect(c)}
            className={`p-4 rounded-2xl flex items-center justify-between gap-3 border transition duration-200 cursor-pointer ${
              isActive
                ? 'bg-ancestral-50/20 border-ancestral-400 shadow-sm'
                : 'bg-white border-neutral-100 hover:border-neutral-200 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Profile Avatar */}
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-100 flex items-center justify-center border border-neutral-200 shrink-0">
                {otherMember.profilePhoto ? (
                  <img src={otherMember.profilePhoto} alt={otherMember.fullName} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-neutral-300" />
                )}
              </div>

              {/* Text Summary */}
              <div className="space-y-1 min-w-0">
                <h4 className="font-semibold text-neutral-800 text-xs truncate">
                  {otherMember.fullName}
                </h4>
                <p className="text-[10px] text-neutral-400 font-light truncate max-w-[150px]">
                  {c.lastMessage ? c.lastMessage.content : 'Start a conversation...'}
                </p>
              </div>
            </div>

            {/* Unread badge */}
            {c.unreadCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-ancestral-550 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                {c.unreadCount}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ConversationList;
