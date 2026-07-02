export const TypingIndicator = ({ partnerName }) => {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border border-neutral-100 bg-neutral-50/50 rounded-2xl w-fit font-sans text-[10px] text-neutral-400 font-light">
      <span>{partnerName || 'Relative'} is typing</span>
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-ancestral-500 animate-bounce delay-100" />
        <span className="w-1.5 h-1.5 rounded-full bg-ancestral-500 animate-bounce delay-200" />
        <span className="w-1.5 h-1.5 rounded-full bg-ancestral-500 animate-bounce delay-300" />
      </div>
    </div>
  );
};

export default TypingIndicator;
