import { useState } from 'react';
import { X, Search, User } from 'lucide-react';

export const StartConversationModal = ({ members, currentMemberId, onClose, onSelectMember }) => {
  const [query, setQuery] = useState('');

  // Filter members list excluding current user
  const filteredMembers = members.filter(
    (m) =>
      m.id !== currentMemberId &&
      m.fullName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
          <div>
            <h3 className="font-display font-bold text-base text-ancestral-900">Start Conversation</h3>
            <p className="text-[10px] text-neutral-400 font-light mt-0.5">
              Select a family member to begin 1-on-1 private chat
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-200/50 rounded-lg text-neutral-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-4 border-b border-neutral-50 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search relatives by name..."
            className="w-full pl-9 pr-4 py-2 border border-neutral-200 focus:border-ancestral-300 rounded-xl focus:outline-none text-xs bg-neutral-50/50 focus:bg-white transition"
          />
          <Search className="w-4 h-4 text-neutral-400 absolute left-7 top-5 pointer-events-none" />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-neutral-50">
          {filteredMembers.length > 0 ? (
            filteredMembers.map((m) => (
              <div
                key={m.id}
                onClick={() => onSelectMember(m.id)}
                className="py-3 px-2 hover:bg-neutral-50/55 rounded-xl cursor-pointer flex items-center gap-3 transition"
              >
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-neutral-100 flex items-center justify-center border border-neutral-200">
                  {m.profilePhoto ? (
                    <img src={m.profilePhoto} alt={m.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-neutral-300" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-semibold text-neutral-800 block">{m.fullName}</span>
                  <span className="text-[9px] text-neutral-400 font-light">Gen {m.generationNumber || 'Unknown'}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-neutral-400 font-light">
              No family members found matching query.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StartConversationModal;
