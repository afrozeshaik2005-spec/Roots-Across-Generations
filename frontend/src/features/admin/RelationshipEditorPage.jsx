import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Settings, ArrowRight, Check } from 'lucide-react';
import api from '../../services/api.js';

export const RelationshipEditorPage = () => {
  const { familyId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [personId, setPersonId] = useState('');
  const [relatedPersonId, setRelatedPersonId] = useState('');
  const [relationshipType, setRelationshipType] = useState('FATHER');
  const [currentRelText, setCurrentRelText] = useState('');
  const [checking, setChecking] = useState(false);

  // 1. Fetch all members
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['adminMembers', familyId],
    queryFn: async () => {
      const response = await api.get(`/admin/members?familyId=${familyId}`);
      return response.data?.members || [];
    },
    enabled: !!familyId
  });

  // Calculate current relationship when personId or relatedPersonId changes
  useEffect(() => {
    if (!personId || !relatedPersonId || personId === relatedPersonId) {
      setCurrentRelText('');
      return;
    }

    const checkRelationship = async () => {
      setChecking(true);
      try {
        // Query profile which calculates relationships automatically
        const response = await api.get(`/members/${relatedPersonId}?familyId=${familyId}&sourceMemberId=${personId}`);
        const memberData = response.data?.member;
        if (memberData) {
          const parentMatch = memberData.parents?.find(p => p.id === personId);
          const childMatch = memberData.children?.find(c => c.id === personId);
          const spouseMatch = memberData.spouses?.find(s => s.id === personId);

          if (parentMatch) {
            setCurrentRelText(`Source member is the ${parentMatch.relationship} of Target member`);
          } else if (childMatch) {
            // Source member is the child of Target member. Let's find source's gender.
            const sourceMember = members.find(m => m.id === personId);
            const sourceGender = sourceMember?.gender;
            const relationshipLabel = sourceGender === 'M' ? 'Son' : sourceGender === 'F' ? 'Daughter' : 'Child';
            setCurrentRelText(`Source member is the ${relationshipLabel} of Target member`);
          } else if (spouseMatch) {
            setCurrentRelText(`Spousal link: Source member is the ${spouseMatch.relationship} of Target member`);
          } else if (memberData.calculatedRelationship && memberData.calculatedRelationship !== 'No Direct Connection Found') {
            setCurrentRelText(memberData.calculatedRelationship);
          } else {
            setCurrentRelText('No direct relationship resolved');
          }
        } else {
          setCurrentRelText('No direct relationship resolved');
        }
      } catch (err) {
        setCurrentRelText('No direct connection found');
      } finally {
        setChecking(false);
      }
    };

    checkRelationship();
  }, [personId, relatedPersonId, familyId, members]);

  // 2. Edit relationship mutation
  const editRelMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/admin/relationships', {
        familyId,
        personId,
        relatedPersonId,
        type: relationshipType
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyTree', familyId] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard', familyId] });
      alert('Relationship successfully reassigned!');
      // Reset selections
      setPersonId('');
      setRelatedPersonId('');
      setCurrentRelText('');
    },
    onError: (err) => {
      alert(err.response?.data?.error?.message || 'Failed to update relationship');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!personId || !relatedPersonId) {
      alert('Please select both family members');
      return;
    }
    if (personId === relatedPersonId) {
      alert('Cannot link a family member to themselves');
      return;
    }
    editRelMutation.mutate();
  };

  const relationshipOptions = [
    { key: 'FATHER', label: 'Father' },
    { key: 'MOTHER', label: 'Mother' },
    { key: 'SON', label: 'Son' },
    { key: 'DAUGHTER', label: 'Daughter' },
    { key: 'BROTHER', label: 'Brother' },
    { key: 'SISTER', label: 'Sister' },
    { key: 'HUSBAND', label: 'Husband' },
    { key: 'WIFE', label: 'Wife' },
    { key: 'STEP_FATHER', label: 'Step Father' },
    { key: 'STEP_MOTHER', label: 'Step Mother' },
    { key: 'ADOPTED_CHILD', label: 'Adopted Child' }
  ];

  return (
    <div className="min-h-screen bg-ancestral-50/50 py-12 px-6 md:px-12 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-ancestral-100/30 blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gold-50/20 blur-3xl"></div>

      <div className="max-w-4xl mx-auto relative z-10 space-y-8">
        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate(`/family/${familyId}/admin`)}
            className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-ancestral-800 transition duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Workspace</span>
          </button>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-ancestral-650">
            <Settings className="w-5.5 h-5.5" />
            <h1 className="text-3xl font-display font-bold text-ancestral-900">
              Relationship Editor
            </h1>
          </div>
          <p className="text-sm text-neutral-500 font-light">
            Edit direct parenting or spousal relationship links between any two members in the family.
          </p>
        </div>

        {/* Content editor */}
        <div className="glass-panel p-6 md:p-8 rounded-3xl">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-ancestral-500" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6 items-center">
                {/* Person 1 Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                    Source Member
                  </label>
                  <select
                    value={personId}
                    onChange={(e) => setPersonId(e.target.value)}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-xs focus:outline-none bg-white text-neutral-600"
                    required
                  >
                    <option value="">Select Member...</option>
                    {members.filter(m => !m.isDeleted).map(m => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                </div>

                {/* Arrow indicator */}
                <div className="flex flex-col items-center justify-center p-2 text-neutral-400">
                  <ArrowRight className="w-5 h-5 hidden md:block" />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mt-1">
                    Relationship
                  </span>
                </div>

                {/* Person 2 Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                    Target Member
                  </label>
                  <select
                    value={relatedPersonId}
                    onChange={(e) => setRelatedPersonId(e.target.value)}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-xs focus:outline-none bg-white text-neutral-600"
                    required
                  >
                    <option value="">Select Member...</option>
                    {members.filter(m => !m.isDeleted).map(m => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Current calculated path display */}
              {personId && relatedPersonId && (
                <div className="p-4 bg-neutral-50/50 border border-neutral-100 rounded-2xl flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                    Current Calculated Connection
                  </span>
                  {checking ? (
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                  ) : (
                    <span className="text-xs font-bold text-ancestral-750 uppercase tracking-wider">
                      {currentRelText}
                    </span>
                  )}
                </div>
              )}

              {/* Relationship Type link selector */}
              <div className="space-y-1.5 max-w-sm mx-auto">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block text-center">
                  Select New Direct Relationship Link
                </label>
                <p className="text-[10px] text-neutral-400 font-light text-center leading-normal mb-3">
                  (Sets the direct relationship link representing: "Source Member is the [Relationship] of Target Member")
                </p>
                <select
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-xs focus:outline-none bg-white text-neutral-600"
                >
                  {relationshipOptions.map(opt => (
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Submit */}
              <div className="flex justify-end pt-4 border-t border-neutral-100">
                <button
                  type="submit"
                  disabled={editRelMutation.isPending}
                  className="px-6 py-3 forest-gradient hover:bg-ancestral-600 text-white text-sm font-medium rounded-xl flex items-center gap-1.5 shadow transition"
                >
                  {editRelMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Relationship Link</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RelationshipEditorPage;
