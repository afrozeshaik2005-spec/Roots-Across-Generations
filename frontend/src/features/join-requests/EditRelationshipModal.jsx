import { useState } from 'react';
import { X, Loader2, Info } from 'lucide-react';
import api from '../../services/api.js';

export const EditRelationshipModal = ({ request, members, onClose, onSuccess }) => {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [relationshipType, setRelationshipType] = useState(request.relationshipType);

  // Prefer targetMemberName from backend-enriched response.
  // Fall back to local member lookup, then a safe placeholder.
  const localMember = members?.find(m => m.id === request.relatedToMemberId);
  const relativeName = request.targetMemberName || localMember?.fullName || 'Unknown Member';

  const relationshipOptions = [
    { value: 'FATHER', label: `Father of ${relativeName}` },
    { value: 'MOTHER', label: `Mother of ${relativeName}` },
    { value: 'SON', label: `Son of ${relativeName}` },
    { value: 'DAUGHTER', label: `Daughter of ${relativeName}` },
    { value: 'BROTHER', label: `Brother of ${relativeName}` },
    { value: 'SISTER', label: `Sister of ${relativeName}` },
    { value: 'HUSBAND', label: `Husband of ${relativeName}` },
    { value: 'WIFE', label: `Wife of ${relativeName}` },
    { value: 'STEP_FATHER', label: `Step-Father of ${relativeName}` },
    { value: 'STEP_MOTHER', label: `Step-Mother of ${relativeName}` },
    { value: 'STEP_SON', label: `Step-Son of ${relativeName}` },
    { value: 'STEP_DAUGHTER', label: `Step-Daughter of ${relativeName}` },
    { value: 'ADOPTED_CHILD', label: `Adopted Child of ${relativeName}` },
    { value: 'GUARDIAN', label: `Guardian of ${relativeName}` }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await api.patch(`/join-requests/${request.id}/edit`, {
        relationshipType
      });

      if (response.data?.success) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update relationship type.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
          <div>
            <h3 className="font-display font-bold text-base text-ancestral-900">Edit Relationship Type</h3>
            <p className="text-xs text-neutral-400 font-light mt-0.5">
              Modify how {request.fullName} connects to {relativeName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-200/50 rounded-lg text-neutral-500 transition duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-1.5">
            <Info className="w-4.5 h-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
              Relationship Type
            </label>
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value)}
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 text-sm text-neutral-600 bg-white"
            >
              {relationshipOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <button
              onClick={onClose}
              type="button"
              className="px-5 py-2.5 border border-neutral-200 text-neutral-500 hover:bg-neutral-50 text-xs font-medium rounded-xl transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 forest-gradient hover:bg-ancestral-600 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 shadow transition duration-200"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Change</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRelationshipModal;
