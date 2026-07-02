import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Users, HelpCircle } from 'lucide-react';
import api from '../../services/api.js';

export const RelationshipExplorer = () => {
  const { familyId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [memberOneId, setMemberOneId] = useState(searchParams.get('memberOneId') || '');
  const [memberTwoId, setMemberTwoId] = useState(searchParams.get('memberTwoId') || '');
  const [result, setResult] = useState('');
  const [path, setPath] = useState([]);
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch all members of the family (accessible to all members)
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['explorerMembers', familyId],
    queryFn: async () => {
      const response = await api.get(`/families/${familyId}/members`);
      return response.data?.members || [];
    },
    enabled: !!familyId
  });

  const handleCompare = useCallback(async (overrideMemberOneId, overrideMemberTwoId) => {
    // If called from onClick event handler, the first arg is a React SyntheticEvent object. We ignore it.
    const m1 = typeof overrideMemberOneId === 'string' ? overrideMemberOneId : memberOneId;
    const m2 = typeof overrideMemberTwoId === 'string' ? overrideMemberTwoId : memberTwoId;

    if (!m1 || !m2) {
      alert('Please select two family members');
      return;
    }
    if (m1 === m2) {
      setResult('Self');
      setPath([]);
      setExplanation('You are comparing a member with themselves.');
      return;
    }

    setLoading(true);
    setResult('');
    setPath([]);
    setExplanation('');
    try {
      // Query dedicated relationship endpoint
      const response = await api.get(`/families/${familyId}/relationship?sourceId=${m1}&targetId=${m2}`);
      if (response.data?.success) {
        setResult(response.data.label || 'Relative');
        setPath(response.data.path || []);
        setExplanation(response.data.explanation || '');
      } else {
        setResult('Connection details could not be resolved');
      }
    } catch (err) {
      setResult('No Direct Connection Found');
    } finally {
      setLoading(false);
    }
  }, [familyId, memberOneId, memberTwoId]);

  // Automatically trigger comparison when both IDs are pre-filled from URL query params
  useEffect(() => {
    const m1 = searchParams.get('memberOneId');
    const m2 = searchParams.get('memberTwoId');
    if (m1 && m2 && members.length > 0) {
      handleCompare(m1, m2);
    }
    // Only run once after members list loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

  const getMemberName = (id) => {
    const member = members.find(m => m.id === id);
    return member ? member.fullName : '';
  };

  const nameNodes = path.filter((_, idx) => idx % 2 === 0);

  return (
    <div className="min-h-screen bg-ancestral-50/50 py-12 px-6 md:px-12 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-ancestral-100/30 blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gold-50/20 blur-3xl"></div>

      <div className="max-w-3xl mx-auto relative z-10 space-y-8">
        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate(`/family/${familyId}/tree`)}
            className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-ancestral-800 transition duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Family Tree</span>
          </button>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-ancestral-650">
            <Users className="w-5.5 h-5.5" />
            <h1 className="text-3xl font-display font-bold text-ancestral-900">
              Relationship Explorer
            </h1>
          </div>
          <p className="text-sm text-neutral-500 font-light">
            Compare any two members of the family tree to trace their calculated kinship.
          </p>
        </div>

        {/* Content Explorer Panel */}
        <div className="glass-panel p-6 md:p-8 rounded-3xl">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-ancestral-500" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6 items-center">
                {/* Member 1 Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                    First Member
                  </label>
                  <select
                    value={memberOneId}
                    onChange={(e) => {
                      setMemberOneId(e.target.value);
                      setResult('');
                      setPath([]);
                      setExplanation('');
                    }}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-xs focus:outline-none bg-white text-neutral-600 animate-fade-in"
                  >
                    <option value="">Select Member...</option>
                    {members.filter(m => !m.isDeleted).map(m => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                </div>

                {/* Member 2 Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                    Second Member
                  </label>
                  <select
                    value={memberTwoId}
                    onChange={(e) => {
                      setMemberTwoId(e.target.value);
                      setResult('');
                      setPath([]);
                      setExplanation('');
                    }}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-xs focus:outline-none bg-white text-neutral-600 animate-fade-in"
                  >
                    <option value="">Select Member...</option>
                    {members.filter(m => !m.isDeleted).map(m => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleCompare}
                  disabled={loading || !memberOneId || !memberTwoId}
                  className="px-6 py-3 forest-gradient hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-xl flex items-center gap-1.5 shadow transition"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Calculate Relationship</span>
                </button>
              </div>

              {/* Result display */}
              {(result || loading) && (
                <div className="space-y-6 mt-6 animate-fade-in">
                  {/* Kinship summary card */}
                  <div className="p-6 bg-neutral-50/50 border border-neutral-100 rounded-2xl flex flex-col items-center gap-2">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      Resolved Kinship
                    </span>
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                    ) : (
                      <div className="text-center space-y-1">
                        <span className="text-lg font-bold text-ancestral-800 uppercase tracking-wider block">
                          {result}
                        </span>
                        {result !== 'No Direct Connection Found' && result !== 'Self' && (
                          <p className="text-[11px] text-neutral-400 font-light">
                            {getMemberName(memberTwoId)} is the <span className="font-semibold text-neutral-600">{result.toLowerCase()}</span> of {getMemberName(memberOneId)}
                          </p>
                        )}
                        {result === 'Self' && (
                          <p className="text-[11px] text-neutral-400 font-light">
                            This is the same person.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Flow Path Diagram */}
                  {!loading && nameNodes.length > 0 && (
                    <div className="bg-white border border-neutral-100/85 p-6 rounded-2xl space-y-4 shadow-sm">
                      <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider text-center">
                        Relationship Path
                      </h4>
                      <div className="flex flex-col items-center justify-center space-y-2 py-4">
                        {nameNodes.map((node, idx) => (
                          <div key={idx} className="flex flex-col items-center">
                            {idx > 0 && (
                              <div className="flex flex-col items-center my-1.5">
                                <div className="w-0.5 h-3.5 bg-neutral-300"></div>
                                <span className="bg-ancestral-55 text-ancestral-800 font-display font-semibold text-[9px] uppercase tracking-wider px-3 py-1 rounded-full border border-ancestral-200 shadow-sm my-1">
                                  {path[idx * 2 - 1]?.label}
                                </span>
                                <div className="w-0.5 h-3.5 bg-neutral-300"></div>
                              </div>
                            )}
                            <span className="px-4 py-2 bg-neutral-50 border border-neutral-200/60 rounded-xl text-xs font-semibold text-neutral-700 shadow-sm">
                              {node.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Natural Language Explanation */}
                  {!loading && explanation && (
                    <div className="p-5 bg-gold-50/20 border border-gold-200/50 rounded-2xl flex items-start gap-3">
                      <HelpCircle className="w-5 h-5 text-gold-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-gold-800 uppercase tracking-wider">
                          Explanation
                        </h4>
                        <p className="text-xs text-neutral-600 leading-relaxed font-light">
                          {explanation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RelationshipExplorer;
