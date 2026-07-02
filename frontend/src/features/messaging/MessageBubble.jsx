import { useState } from 'react';
import { Check, CheckCheck, Trash2 } from 'lucide-react';

export const MessageBubble = ({ message, isSender, onSoftDelete }) => {
  const [hovered, setHovered] = useState(false);
  const { id, content, createdAt, isRead } = message;

  const formattedTime = new Date(createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div
      className={`flex w-full group relative ${isSender ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`flex flex-col space-y-1 max-w-[70%] font-sans`}>
        {/* Chat message content box */}
        <div
          className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed relative ${
            isSender
              ? 'forest-gradient text-white rounded-tr-none'
              : 'bg-neutral-100 text-neutral-800 rounded-tl-none border border-neutral-200/50'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{content}</p>
        </div>

        {/* Timestamp and receipts */}
        <div className={`flex items-center gap-1.5 text-[9px] text-neutral-400 font-light ${isSender ? 'justify-end' : 'justify-start'}`}>
          <span>{formattedTime}</span>
          {isSender && (
            <span>
              {isRead ? (
                <CheckCheck className="w-3.5 h-3.5 text-ancestral-650" />
              ) : (
                <Check className="w-3.5 h-3.5 text-neutral-300" />
              )}
            </span>
          )}
        </div>
      </div>

      {/* Hovered soft delete actions option */}
      {hovered && (
        <button
          onClick={() => onSoftDelete(id)}
          className={`absolute top-1/2 transform -translate-y-1/2 p-1.5 hover:bg-neutral-100 hover:text-red-500 rounded-lg text-neutral-300 transition duration-200 ${
            isSender ? 'left-[-40px]' : 'right-[-40px]'
          }`}
          title="Delete for me"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default MessageBubble;
