import { memo, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Handle, Position } from '@xyflow/react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';

export const FamilyNode = ({ data, selected }) => {
  const { fullName, profilePhoto, dob, deathDate, isLiving, isLinkViewer } = data;
  const { familyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [relationText, setRelationText] = useState('');
  const [hovered, setHovered] = useState(false);
  const relationFetched = useRef(false);

  // Only fetch relation-to-me on explicit CLICK (selected=true), not on zoom/hover
  // Use a ref to ensure it fires only once per selection
  if (selected && !relationFetched.current) {
    relationFetched.current = true;
    api.get(`/members/${data.id}/relation-to-me`)
      .then(res => {
        if (res.data?.success && res.data?.relationshipLabel) {
          setRelationText(`This is your ${res.data.relationshipLabel}`);
        }
      })
      .catch(() => {});
  }
  if (!selected && relationFetched.current) {
    relationFetched.current = false;
    setRelationText('');
  }

  const birthYear = dob ? new Date(dob).getFullYear() : '???';
  const deathYear = deathDate ? new Date(deathDate).getFullYear() : '';
  const lifespan = isLiving ? `${birthYear} - Present` : `${birthYear} - ${deathYear || '🕊'}`;

  // 2. Conditionally show generation number for Historian/Founder
  const activeMembership = user?.memberships?.find(m => m.familyId === familyId);
  const isHistorianOrFounder = activeMembership && ['FOUNDER', 'HISTORIAN'].includes(activeMembership.role);

  const handleViewProfile = (e) => {
    e.stopPropagation(); // Don't trigger React Flow node click
    if (!data?.id) return; // Guard against undefined member id
    const params = new URLSearchParams();
    if (familyId) params.append('familyId', familyId);
    navigate(`/member/${data.id}?${params.toString()}`);
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Node selection tooltip popover */}
      {relationText && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-neutral-900 text-white text-[10px] font-semibold rounded-lg shadow-md whitespace-nowrap z-50">
          {relationText}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-neutral-900"></div>
        </div>
      )}

      <div
        className={`px-4 py-3 rounded-2xl border bg-white/95 backdrop-blur-sm min-w-[200px] shadow-sm hover:shadow-lg transform hover:scale-108 transition-all duration-150 cursor-pointer ${
          isLiving
            ? 'border-ancestral-400 hover:border-ancestral-600 shadow-ancestral-100/30'
            : 'border-neutral-300 hover:border-neutral-400 grayscale bg-neutral-50/95'
        }`}
      >
        {/* Generation Badge */}
        {isHistorianOrFounder && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[9px] font-semibold">
            Gen {data.generationNumber}
          </span>
        )}

        {/* Handles for tree mapping */}
        {/* Parent-child: parent exports from Bottom, child receives on Top */}
        <Handle type="source" position={Position.Bottom} id="child-out"  className="!bg-ancestral-500 !w-2.5 !h-2.5" />
        <Handle type="target" position={Position.Top}    id="parent-in"  className="!bg-ancestral-500 !w-2.5 !h-2.5" />
        {/* Spouse: left and right horizontal connectors */}
        <Handle type="source" position={Position.Right}  id="spouse-right" className="!bg-gold-500 !w-2 !h-2" />
        <Handle type="target" position={Position.Left}   id="spouse-left"  className="!bg-gold-500 !w-2 !h-2" />


        <div className="flex items-center gap-3">
          {profilePhoto ? (
            <img
              src={profilePhoto}
              alt={fullName}
              className={`w-10 h-10 rounded-full object-cover shrink-0 ${
                isLiving ? 'ring-2 ring-ancestral-200' : 'ring-1 ring-neutral-200'
              }`}
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-display text-sm font-semibold ${
                isLiving
                  ? 'bg-ancestral-50 text-ancestral-600 ring-2 ring-ancestral-100'
                  : 'bg-neutral-200 text-neutral-500'
              }`}
            >
              {fullName.charAt(0)}
            </div>
          )}

          <div className="text-left overflow-hidden">
            <p className="text-xs font-semibold text-neutral-800 hover:text-ancestral-700 truncate leading-tight pr-6">
              {fullName} {!isLiving && '🕊'}
            </p>
            <span className="text-[10px] text-neutral-400 font-light mt-0.5 block tracking-wide">
              {lifespan}
            </span>
          </div>
        </div>

        {/* View Profile button on hover — hidden for link viewers */}
        {!isLinkViewer && (
          <div
            className={`overflow-hidden transition-all duration-200 ease-in-out ${
              hovered ? 'max-h-10 opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'
            }`}
          >
            <button
              onClick={handleViewProfile}
              className="w-full px-3 py-1.5 bg-ancestral-700 hover:bg-ancestral-800 text-white text-[10px] font-semibold rounded-lg transition duration-150 flex items-center justify-center gap-1"
            >
              <span>View Profile</span>
              <span>→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(FamilyNode);
