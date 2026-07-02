import { MapPin, User, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SearchResultCard = ({ result, familyId }) => {
  const navigate = useNavigate();
  const { id, fullName, profilePhoto, generationNumber, birthVillageCity, isLiving, relationship, occupation } = result;

  const handleCardClick = () => {
    navigate(`/member/${id}?familyId=${familyId}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white border border-neutral-200/80 rounded-3xl p-5 hover:border-gold-300 hover:shadow-md transition duration-300 group cursor-pointer flex justify-between items-center"
    >
      <div className="flex items-center gap-4 min-w-0">
        {/* Profile Avatar */}
        <div className="shrink-0 relative">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-neutral-100 flex items-center justify-center border border-neutral-200">
            {profilePhoto ? (
              <img src={profilePhoto} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-neutral-300" />
            )}
          </div>
          {!isLiving && (
            <span className="absolute bottom-[-4px] right-[-4px] bg-neutral-100 border border-neutral-200 text-neutral-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-sm">
              🕊
            </span>
          )}
        </div>

        {/* Text Info */}
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h4 className="font-display font-bold text-neutral-800 text-sm truncate group-hover:text-ancestral-700 transition">
              {fullName}
            </h4>
            {!isLiving && (
              <span className="text-[10px] text-neutral-400 font-light select-none shrink-0">(Deceased)</span>
            )}
          </div>

          {/* Relationship string calculated via BFS */}
          <div className="flex items-center gap-2">
            <span className="bg-gold-50 border border-gold-100 text-gold-700 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0">
              {relationship}
            </span>
            <span className="text-[10px] text-neutral-400 font-light shrink-0">
              Gen {generationNumber}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-neutral-400 font-light truncate">
            {birthVillageCity && (
              <div className="flex items-center gap-0.5 truncate">
                <MapPin className="w-3 h-3 text-neutral-300 shrink-0" />
                <span className="truncate">{birthVillageCity}</span>
              </div>
            )}
            {occupation && (
              <span className="truncate border-l border-neutral-200 pl-3">
                {occupation}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Arrow */}
      <button
        type="button"
        className="p-2 border border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50 text-neutral-400 group-hover:text-ancestral-700 rounded-xl transition duration-200 shrink-0"
      >
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default SearchResultCard;
