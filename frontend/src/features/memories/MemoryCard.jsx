import { Calendar, MapPin, Tag, Film, FileText, BookOpen, EyeOff } from 'lucide-react';

export const MemoryCard = ({ memory, onClick }) => {
  const { title, type, fileUrl, memoryDate, location, isPrivate, tags } = memory;

  const renderThumbnail = () => {
    switch (type) {
      case 'PHOTO':
        return (
          <img
            src={fileUrl}
            alt={title}
            className="w-full h-44 object-cover group-hover:scale-102 transition duration-300"
          />
        );
      case 'VIDEO':
        return (
          <div className="w-full h-44 bg-neutral-950 flex items-center justify-center relative overflow-hidden">
            <video src={fileUrl} className="w-full h-full object-cover opacity-60" muted />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white">
                <Film className="w-5 h-5" />
              </span>
            </div>
          </div>
        );
      case 'DOCUMENT':
        return (
          <div className="w-full h-44 bg-neutral-50 flex flex-col items-center justify-center border-b border-neutral-100 relative">
            <FileText className="w-10 h-10 text-gold-500" />
            <span className="text-[10px] text-neutral-400 mt-2 font-semibold uppercase tracking-wider">
              Document Archive
            </span>
          </div>
        );
      case 'STORY':
        return (
          <div className="w-full h-44 bg-ancestral-50/20 p-5 border-b border-neutral-100 flex flex-col justify-between">
            <div className="space-y-2">
              <BookOpen className="w-5 h-5 text-ancestral-500" />
              <p className="text-xs text-neutral-400 font-light line-clamp-4 leading-relaxed">
                {memory.description || 'A family story waiting to be told...'}
              </p>
            </div>
            <span className="text-[10px] text-ancestral-600 font-bold uppercase tracking-wider">
              Written Story
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white border border-neutral-200/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition duration-300 group cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Media Thumbnail */}
        <div className="relative overflow-hidden bg-neutral-100">
          {renderThumbnail()}
          {isPrivate && (
            <span className="absolute top-3 left-3 bg-neutral-900/60 backdrop-blur-sm text-white p-1.5 rounded-lg text-xs flex items-center gap-1 shadow-sm">
              <EyeOff className="w-3.5 h-3.5" />
              <span>Private</span>
            </span>
          )}
        </div>

        {/* Text Info */}
        <div className="p-5 space-y-3">
          <h4 className="font-display font-bold text-neutral-800 text-base group-hover:text-ancestral-700 transition">
            {title}
          </h4>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-neutral-400 font-light">
            {memoryDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{new Date(memoryDate).toLocaleDateString()}</span>
              </div>
            )}
            {location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{location}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tagged Members footer */}
      {tags && tags.length > 0 && (
        <div className="px-5 pb-5 pt-2 flex items-center justify-between border-t border-neutral-50">
          <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-light">
            <Tag className="w-3 h-3" />
            <span>Tagged:</span>
          </div>
          <div className="flex -space-x-1.5 overflow-hidden">
            {tags.map((t) => (
              <div
                key={t.id}
                className="w-5 h-5 rounded-full border border-white bg-neutral-100 flex items-center justify-center overflow-hidden"
                title={t.member.fullName}
              >
                {t.member.profilePhoto ? (
                  <img src={t.member.profilePhoto} alt={t.member.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[8px]">👤</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryCard;
