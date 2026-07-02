import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import api from '../../services/api.js';

const MemberCard = ({ member, onNavigate, highlight = false }) => {
  if (!member) {
    return (
      <div className="w-36 h-28 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 flex items-center justify-center">
        <span className="text-[10px] text-neutral-400 italic">Not recorded</span>
      </div>
    );
  }

  const birthYear = member.dob ? new Date(member.dob).getFullYear() : null;
  const deathYear = member.deathDate ? new Date(member.deathDate).getFullYear() : null;
  const lifespan = member.isLiving
    ? birthYear ? `${birthYear} – Present` : null
    : birthYear ? `${birthYear} – ${deathYear || '🕊'}` : null;

  return (
    <button
      onClick={() => onNavigate(member.id)}
      className={`w-36 rounded-2xl border p-3 text-center transition duration-200 hover:shadow-md hover:scale-105 ${
        highlight
          ? 'border-ancestral-400 bg-ancestral-50/60 shadow-sm ring-2 ring-ancestral-200'
          : member.isLiving
            ? 'border-neutral-200/80 bg-white/90 hover:border-ancestral-300'
            : 'border-neutral-200/80 bg-neutral-50/90 grayscale hover:border-neutral-300'
      }`}
    >
      {member.profilePhoto ? (
        <img
          src={member.profilePhoto}
          alt={member.fullName}
          className="w-12 h-12 rounded-full object-cover mx-auto mb-2 ring-2 ring-ancestral-100"
        />
      ) : (
        <div className="w-12 h-12 rounded-full mx-auto mb-2 bg-ancestral-50 text-ancestral-600 flex items-center justify-center font-display text-sm font-semibold ring-2 ring-ancestral-100">
          {member.fullName.charAt(0)}
        </div>
      )}
      <p className="text-[11px] font-semibold text-neutral-800 truncate leading-tight">
        {member.fullName} {!member.isLiving && '🕊'}
      </p>
      {lifespan && (
        <p className="text-[9px] text-neutral-400 mt-0.5">{lifespan}</p>
      )}
      <span className="inline-block mt-1.5 px-2 py-0.5 bg-ancestral-50 text-ancestral-700 border border-ancestral-100 rounded-full text-[8px] font-semibold uppercase tracking-wider">
        {member.relationshipLabel}
      </span>
    </button>
  );
};

const TierLabel = ({ children }) => (
  <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 text-center mb-3">
    {children}
  </p>
);

export const CoreFamilyView = ({ memberId, familyId, shareableLink, onNavigate }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['coreFamily', memberId, familyId, shareableLink],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (familyId) params.append('familyId', familyId);
      if (shareableLink) params.append('shareableLink', shareableLink);
      const response = await api.get(`/members/${memberId}/core-family?${params.toString()}`);
      return response.data;
    },
    enabled: !!memberId
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-ancestral-500" />
        <p className="mt-3 text-xs text-neutral-500">Loading family hierarchy...</p>
      </div>
    );
  }

  if (error || !data?.coreFamily) {
    return (
      <div className="text-center py-16 text-xs text-neutral-500">
        Unable to load core family data.
      </div>
    );
  }

  const { targetMember, coreFamily } = data;
  const {
    paternalGrandparents,
    maternalGrandparents,
    father,
    mother,
    otherParents,
    siblings,
    spouses,
    children
  } = coreFamily;

  return (
    <div className="glass-panel p-8 rounded-3xl space-y-10">
      <h3 className="font-display font-bold text-base text-ancestral-900 border-b border-neutral-100 pb-3">
        Core Family
      </h3>

      {/* Grandparents Tier */}
      {(paternalGrandparents.length > 0 || maternalGrandparents.length > 0) && (
        <div>
          <TierLabel>Grandparents</TierLabel>
          <div className="flex justify-center gap-16">
            <div className="space-y-2">
              <p className="text-[9px] text-neutral-400 text-center uppercase tracking-wider">Paternal</p>
              <div className="flex gap-3 justify-center">
                {paternalGrandparents.length > 0
                  ? paternalGrandparents.map(gp => (
                      <MemberCard key={gp.id} member={gp} onNavigate={onNavigate} />
                    ))
                  : <MemberCard member={null} onNavigate={onNavigate} />}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[9px] text-neutral-400 text-center uppercase tracking-wider">Maternal</p>
              <div className="flex gap-3 justify-center">
                {maternalGrandparents.length > 0
                  ? maternalGrandparents.map(gp => (
                      <MemberCard key={gp.id} member={gp} onNavigate={onNavigate} />
                    ))
                  : <MemberCard member={null} onNavigate={onNavigate} />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Parents Tier */}
      <div>
        <TierLabel>Parents</TierLabel>
        <div className="flex justify-center gap-8">
          <MemberCard member={father} onNavigate={onNavigate} />
          <MemberCard member={mother} onNavigate={onNavigate} />
        </div>
        {otherParents.length > 0 && (
          <div className="flex justify-center gap-3 mt-4 flex-wrap">
            {otherParents.map(p => (
              <MemberCard key={p.id} member={p} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>

      {/* Midlevel Tier: Siblings | Self | Spouses */}
      <div>
        <TierLabel>Siblings &amp; Spouse</TierLabel>
        <div className="flex justify-center items-start gap-6 flex-wrap">
          {siblings.length > 0 && (
            <div className="flex gap-3 flex-wrap justify-center">
              {siblings.map(sib => (
                <MemberCard key={sib.id} member={sib} onNavigate={onNavigate} />
              ))}
            </div>
          )}
          <MemberCard member={targetMember} onNavigate={onNavigate} highlight />
          {spouses.length > 0 && (
            <div className="flex gap-3 flex-wrap justify-center">
              {spouses.map(sp => (
                <MemberCard key={sp.id} member={sp} onNavigate={onNavigate} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Children Tier */}
      <div>
        <TierLabel>Children</TierLabel>
        {children.length > 0 ? (
          <div className="flex justify-center gap-3 flex-wrap">
            {children.map(child => (
              <MemberCard key={child.id} member={child} onNavigate={onNavigate} />
            ))}
          </div>
        ) : (
          <div className="flex justify-center">
            <MemberCard member={null} onNavigate={onNavigate} />
          </div>
        )}
      </div>
    </div>
  );
};

export default CoreFamilyView;
