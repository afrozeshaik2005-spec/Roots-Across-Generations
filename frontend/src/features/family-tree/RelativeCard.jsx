import { useNavigate, useSearchParams } from 'react-router-dom';
import { ExternalLink, TreePine } from 'lucide-react';

const ROLE_BADGE_COLORS = {
  FOUNDER: 'bg-amber-100 text-amber-800 border-amber-200',
  HISTORIAN: 'bg-blue-100 text-blue-800 border-blue-200',
  ADMIN: 'bg-red-100 text-red-800 border-red-200',
  MEMBER: 'bg-green-100 text-green-800 border-green-200',
  FAMILY_MEMBER: 'bg-green-100 text-green-800 border-green-200',
};

const RELATIONSHIP_LABELS = {
  FATHER: 'Father', MOTHER: 'Mother',
  SON: 'Son', DAUGHTER: 'Daughter',
  HUSBAND: 'Husband', WIFE: 'Wife',
  BROTHER: 'Brother', SISTER: 'Sister',
  STEP_FATHER: 'Step-Father', STEP_MOTHER: 'Step-Mother',
  STEP_SON: 'Step-Son', STEP_DAUGHTER: 'Step-Daughter',
  ADOPTED_CHILD: 'Adopted Child', GUARDIAN: 'Guardian',
};

const RelativeCard = ({ member, relationship }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shareableLink = searchParams.get('shareableLink');
  const familyId = searchParams.get('familyId');

  const birthYear = member.dob ? new Date(member.dob).getFullYear() : null;
  const deathYear = member.deathDate ? new Date(member.deathDate).getFullYear() : null;
  const lifespan = member.isLiving
    ? birthYear ? `${birthYear} – Present` : 'Living'
    : birthYear ? `${birthYear} – ${deathYear || '🕊'}` : 'Deceased';

  const handleViewProfile = () => {
    const params = new URLSearchParams();
    if (familyId) params.append('familyId', familyId);
    if (shareableLink) params.append('shareableLink', shareableLink);
    navigate(`/member/${member.id}?${params.toString()}`);
  };

  const relationshipLabel = relationship
    ? (RELATIONSHIP_LABELS[relationship] || relationship.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()))
    : null;

  return (
    <div className="bg-white/95 border border-neutral-200/80 rounded-2xl p-5 shadow-lg hover:shadow-xl transition duration-200 w-72 backdrop-blur-sm">
      {/* Header: Photo + Name */}
      <div className="flex items-center gap-3.5">
        {member.profilePhoto ? (
          <img
            src={member.profilePhoto}
            alt={member.fullName}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-ancestral-100 shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-ancestral-100 text-ancestral-600 flex items-center justify-center font-display text-lg font-bold ring-2 ring-ancestral-200 shrink-0">
            {member.fullName?.charAt(0) || '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ancestral-900 truncate leading-tight">
            {member.fullName} {!member.isLiving && '🕊'}
          </p>
          {member.nickname && (
            <p className="text-[10px] text-neutral-400 italic truncate">"{member.nickname}"</p>
          )}
          <p className="text-[11px] text-neutral-500 mt-0.5 font-medium">{lifespan}</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
        {relationshipLabel && (
          <span className="inline-block px-2.5 py-0.5 bg-ancestral-50 text-ancestral-700 border border-ancestral-200 rounded-full text-[10px] font-bold uppercase tracking-wider">
            {relationshipLabel}
          </span>
        )}
        {member.role && ROLE_BADGE_COLORS[member.role] && (
          <span className={`inline-block px-2.5 py-0.5 border rounded-full text-[10px] font-bold uppercase tracking-wider ${ROLE_BADGE_COLORS[member.role]}`}>
            {member.role}
          </span>
        )}
        {member.generationNumber && (
          <span className="inline-block px-2 py-0.5 bg-neutral-100 text-neutral-600 border border-neutral-200 rounded-full text-[9px] font-semibold">
            Gen {member.generationNumber}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="mt-3 space-y-1.5 text-[11px] text-neutral-500">
        {birthYear && (
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400">Born:</span>
            <span className="font-medium text-neutral-700">{birthYear}</span>
          </div>
        )}
        {!member.isLiving && deathYear && (
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400">Died:</span>
            <span className="font-medium text-neutral-700">{deathYear}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-neutral-400">Status:</span>
          <span className={`font-medium ${member.isLiving ? 'text-green-600' : 'text-neutral-500'}`}>
            {member.isLiving ? 'Living' : 'Deceased'}
          </span>
        </div>
      </div>

      {/* View Profile Button */}
      <button
        onClick={handleViewProfile}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#1a3c2a] to-[#2d5a3f] hover:from-[#15302a] hover:to-[#245035] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition duration-200"
      >
        <TreePine className="w-3.5 h-3.5" />
        View Full Profile
      </button>
    </div>
  );
};

export default RelativeCard;
