import { useNavigate, useSearchParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

const ROLE_BADGE_COLORS = {
  FOUNDER: 'bg-amber-100 text-amber-800 border-amber-200',
  HISTORIAN: 'bg-blue-100 text-blue-800 border-blue-200',
  ADMIN: 'bg-red-100 text-red-800 border-red-200',
  MEMBER: 'bg-green-100 text-green-800 border-green-200',
  FAMILY_MEMBER: 'bg-green-100 text-green-800 border-green-200',
};

const RelativeCard = ({ member, relationship }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shareableLink = searchParams.get('shareableLink');
  const familyId = searchParams.get('familyId');

  const birthYear = member.dob ? new Date(member.dob).getFullYear() : null;
  const deathYear = member.deathDate ? new Date(member.deathDate).getFullYear() : null;
  const lifespan = member.isLiving
    ? birthYear ? `${birthYear} – Present` : null
    : birthYear ? `${birthYear} – ${deathYear || '🕊'}` : null;

  const handleViewProfile = () => {
    const params = new URLSearchParams();
    if (familyId) params.append('familyId', familyId);
    if (shareableLink) params.append('shareableLink', shareableLink);
    navigate(`/member/${member.id}?${params.toString()}`);
  };

  return (
    <div className="bg-white/90 border border-neutral-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition duration-200 w-64">
      <div className="flex items-center gap-3">
        {member.profilePhoto ? (
          <img
            src={member.profilePhoto}
            alt={member.fullName}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-ancestral-100 shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-ancestral-50 text-ancestral-600 flex items-center justify-center font-display text-sm font-semibold ring-2 ring-ancestral-100 shrink-0">
            {member.fullName?.charAt(0) || '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ancestral-900 truncate leading-tight">
            {member.fullName} {!member.isLiving && '🕊'}
          </p>
          {lifespan && (
            <p className="text-[10px] text-neutral-400 mt-0.5">{lifespan}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {relationship && (
              <span className="inline-block px-2 py-0.5 bg-ancestral-50 text-ancestral-700 border border-ancestral-100 rounded-full text-[9px] font-semibold uppercase tracking-wider">
                {relationship.replace('_', ' ')}
              </span>
            )}
            {member.role && ROLE_BADGE_COLORS[member.role] && (
              <span className={`inline-block px-2 py-0.5 border rounded-full text-[9px] font-semibold uppercase tracking-wider ${ROLE_BADGE_COLORS[member.role]}`}>
                {member.role}
              </span>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={handleViewProfile}
        className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-ancestral-50 hover:bg-ancestral-100 text-ancestral-700 border border-ancestral-200 rounded-xl text-xs font-semibold transition duration-200"
      >
        <ExternalLink className="w-3 h-3" />
        View Profile
      </button>
    </div>
  );
};

export default RelativeCard;
