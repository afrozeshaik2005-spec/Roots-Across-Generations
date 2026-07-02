import { Calendar, FileText, Check, X, Edit, Phone, Mail } from 'lucide-react';

export const JoinRequestCard = ({ request, members, onAccept, onReject, onEdit }) => {
  const { id, fullName, dob, email, phone, relationshipType, relatedToMemberId, proofUrl, targetMemberName } = request;

  // Prefer targetMemberName from backend-enriched response (most reliable).
  // Fall back to local member lookup, then 'Unknown Member' if member was deleted.
  const localMember = members?.find(m => m.id === relatedToMemberId);
  const relativeName = targetMemberName || localMember?.fullName || 'Unknown Member';

  const formatRelType = (type) => {
    return type.replace('_', ' ').toLowerCase();
  };

  return (
    <div className="bg-white/80 border border-neutral-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition duration-300">
      <div className="space-y-4">
        {/* Requester Header */}
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-display font-bold text-ancestral-900 text-lg leading-tight">
              {fullName}
            </h4>
            <div className="flex items-center gap-1.5 text-neutral-400 text-xs mt-1 font-light">
              <Calendar className="w-3.5 h-3.5" />
              <span>DOB: {new Date(dob).toLocaleDateString()}</span>
            </div>
          </div>
          <span className="bg-ancestral-50 border border-ancestral-200 text-ancestral-700 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full">
            Pending
          </span>
        </div>

        {/* Contact info */}
        <div className="space-y-1 text-xs text-neutral-500 font-light border-t border-neutral-100 pt-3">
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-neutral-400" />
            <span>{email}</span>
          </div>
          {phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-neutral-400" />
              <span>{phone}</span>
            </div>
          )}
        </div>

        {/* Claimed Relationship */}
        <div className="bg-neutral-50/50 p-4 border border-neutral-100 rounded-2xl text-xs space-y-1">
          <p className="text-neutral-400 font-light">Claimed Relationship:</p>
          <p className="font-medium text-neutral-800 leading-normal">
            Claims to be the <span className="font-semibold text-ancestral-600">{formatRelType(relationshipType)}</span> of <span className="font-semibold text-neutral-700">{relativeName}</span>.
          </p>
        </div>

        {/* Proof Document */}
        {proofUrl && (
          <div className="border border-neutral-100 hover:border-gold-300 bg-white/70 p-3 rounded-2xl flex items-center justify-between transition duration-200">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gold-500" />
              <span className="text-xs font-semibold text-neutral-700 truncate max-w-[150px]">
                Verification Proof
              </span>
            </div>
            <a
              href={proofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-bold text-gold-600 hover:underline"
            >
              View Document
            </a>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 pt-4 border-t border-neutral-100 grid grid-cols-3 gap-2">
        <button
          onClick={() => onReject(id)}
          className="py-2.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
          title="Decline Request"
        >
          <X className="w-3.5 h-3.5" />
          <span>Decline</span>
        </button>

        <button
          onClick={() => onEdit(request)}
          className="py-2.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
          title="Edit Relationship Link"
        >
          <Edit className="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>

        <button
          onClick={() => onAccept(id)}
          className="py-2.5 forest-gradient text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 shadow-sm transition"
          title="Approve Request"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Approve</span>
        </button>
      </div>
    </div>
  );
};

export default JoinRequestCard;
