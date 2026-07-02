import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Link2, Users, Calendar, Mail, Phone, Info, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

// Relationship statement options — first-person, unambiguous
const RELATIONSHIP_STATEMENTS = [
  { value: 'FATHER',       label: "I am this person's Father" },
  { value: 'MOTHER',       label: "I am this person's Mother" },
  { value: 'SON',          label: "I am this person's Son" },
  { value: 'DAUGHTER',     label: "I am this person's Daughter" },
  { value: 'BROTHER',      label: "I am this person's Brother" },
  { value: 'SISTER',       label: "I am this person's Sister" },
  { value: 'HUSBAND',      label: "I am this person's Husband" },
  { value: 'WIFE',         label: "I am this person's Wife" },
  { value: 'STEP_FATHER',  label: "I am this person's Step Father" },
  { value: 'STEP_MOTHER',  label: "I am this person's Step Mother" },
  { value: 'STEP_SON',     label: "I am this person's Step Son" },
  { value: 'STEP_DAUGHTER',label: "I am this person's Step Daughter" },
  { value: 'ADOPTED_CHILD',label: "I am this person's Adopted Child" },
  { value: 'GUARDIAN',     label: "I am under this person's Guardianship" }
];

/**
 * Derives live preview text from the selected relationship and the
 * existing member's known relationships (parents, children, siblings).
 * This is fetched from the API dynamically — no hardcoded names.
 */
function derivePreview(relationshipType, member) {
  if (!member) return { lines: [] };

  const name = member.fullName || 'this person';
  const first = name.split(' ')[0];

  const lines = [];

  switch (relationshipType) {
    case 'FATHER':
      lines.push(`→ You will become ${first}'s father`);
      lines.push(`→ You will appear one generation above ${first}`);
      if (member.children?.length > 0) {
        lines.push(`→ ${first}'s children will become your grandchildren`);
      }
      break;
    case 'MOTHER':
      lines.push(`→ You will become ${first}'s mother`);
      lines.push(`→ You will appear one generation above ${first}`);
      if (member.children?.length > 0) {
        lines.push(`→ ${first}'s children will become your grandchildren`);
      }
      break;
    case 'SON':
      lines.push(`→ You will become ${first}'s son`);
      lines.push(`→ You will appear one generation below ${first}`);
      if (member.parents?.length > 0) {
        const parentNames = member.parents.map(p => p.fullName).join(' and ');
        lines.push(`→ ${parentNames} will become your grandparents`);
      }
      break;
    case 'DAUGHTER':
      lines.push(`→ You will become ${first}'s daughter`);
      lines.push(`→ You will appear one generation below ${first}`);
      if (member.parents?.length > 0) {
        const parentNames = member.parents.map(p => p.fullName).join(' and ');
        lines.push(`→ ${parentNames} will become your grandparents`);
      }
      break;
    case 'BROTHER':
      lines.push(`→ You will be added as another child of ${first}'s parents`);
      lines.push(`→ You and ${first} will become siblings`);
      if (member.parents?.length > 0) {
        const parentNames = member.parents.map(p => p.fullName).join(' and ');
        lines.push(`→ ${parentNames} will become your parents`);
      }
      if (member.siblings?.length > 0) {
        const siblingNames = member.siblings.map(s => s.fullName).join(', ');
        lines.push(`→ You will also be a sibling of ${siblingNames}`);
      }
      break;
    case 'SISTER':
      lines.push(`→ You will be added as another child of ${first}'s parents`);
      lines.push(`→ You and ${first} will become siblings`);
      if (member.parents?.length > 0) {
        const parentNames = member.parents.map(p => p.fullName).join(' and ');
        lines.push(`→ ${parentNames} will become your parents`);
      }
      if (member.siblings?.length > 0) {
        const siblingNames = member.siblings.map(s => s.fullName).join(', ');
        lines.push(`→ You will also be a sibling of ${siblingNames}`);
      }
      break;
    case 'HUSBAND':
      lines.push(`→ You will become ${first}'s husband`);
      lines.push(`→ You will appear at the same generation as ${first}`);
      if (member.parents?.length > 0) {
        const parentNames = member.parents.map(p => p.fullName).join(' and ');
        lines.push(`→ ${parentNames} will become your in-laws`);
      }
      if (member.children?.length > 0) {
        lines.push(`→ ${first}'s children will become your step-children`);
      }
      break;
    case 'WIFE':
      lines.push(`→ You will become ${first}'s wife`);
      lines.push(`→ You will appear at the same generation as ${first}`);
      if (member.parents?.length > 0) {
        const parentNames = member.parents.map(p => p.fullName).join(' and ');
        lines.push(`→ ${parentNames} will become your in-laws`);
      }
      if (member.children?.length > 0) {
        lines.push(`→ ${first}'s children will become your step-children`);
      }
      break;
    case 'STEP_FATHER':
      lines.push(`→ You will become ${first}'s step father`);
      lines.push(`→ You will appear one generation above ${first}`);
      lines.push(`→ ${first} will become your step child`);
      break;
    case 'STEP_MOTHER':
      lines.push(`→ You will become ${first}'s step mother`);
      lines.push(`→ You will appear one generation above ${first}`);
      lines.push(`→ ${first} will become your step child`);
      break;
    case 'STEP_SON':
      lines.push(`→ You will become ${first}'s step son`);
      lines.push(`→ You will appear one generation below ${first}`);
      lines.push(`→ ${first} will become your step parent`);
      break;
    case 'STEP_DAUGHTER':
      lines.push(`→ You will become ${first}'s step daughter`);
      lines.push(`→ You will appear one generation below ${first}`);
      lines.push(`→ ${first} will become your step parent`);
      break;
    case 'ADOPTED_CHILD':
      lines.push(`→ You will become ${first}'s adopted child`);
      lines.push(`→ You will appear one generation below ${first}`);
      if (member.spouses?.length > 0) {
        const spouseNames = member.spouses.map(s => s.fullName).join(' and ');
        lines.push(`→ ${first} and ${spouseNames} will become your adoptive parents`);
      }
      break;
    case 'GUARDIAN':
      lines.push(`→ You will be placed under ${first}'s guardianship`);
      lines.push(`→ ${first} will become your legal guardian`);
      lines.push(`→ Your biological lineage generation will not be altered`);
      break;
    default:
      lines.push(`→ You will be linked to ${first}`);
      break;
  }

  return lines;
}

export const JoinFamily = () => {
  const { familyId } = useParams();
  const navigate = useNavigate();
  const { user, loading: loadingAuth } = useAuth();

  const [family, setFamily] = useState(null);
  const [loadingFamily, setLoadingFamily] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedMemberProfile, setSelectedMemberProfile] = useState(null);
  const [previewLines, setPreviewLines] = useState([]);
  // Track which fields have been touched for validation
  const [touched, setTouched] = useState({});

  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    email: user?.email || '',
    phone: '',
    gender: '',
    relatedToMemberId: '',
    relationshipType: 'FATHER',
    proofFile: null,
    notes: ''
  });

  // Set today's date for max DOB validation
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchFamilyInfo = async () => {
      try {
        const response = await api.get(`/families/join-info/${familyId}`);
        if (response.data?.success) {
          setFamily(response.data.family);
        }
      } catch (err) {
        setError('Could not retrieve family invitation details. Verify the link ID.');
      } finally {
        setLoadingFamily(false);
      }
    };
    fetchFamilyInfo();
  }, [familyId]);

  // Fetch selected member's profile for preview generation
  useEffect(() => {
    if (!formData.relatedToMemberId) {
      setSelectedMemberProfile(null);
      setPreviewLines([]);
      return;
    }

    const fetchMemberProfile = async () => {
      try {
        const response = await api.get(`/members/${formData.relatedToMemberId}/core-family`, {
          params: { familyId: family?.id }
        });
        if (response.data?.success) {
          const core = response.data;
          setSelectedMemberProfile(core.targetMember);
          // Build enhanced member with relations
          const enhancedMember = {
            ...core.targetMember,
            parents: core.coreFamily?.father ? [core.coreFamily.father] : [],
            children: core.coreFamily?.children || [],
            siblings: core.coreFamily?.siblings || [],
            spouses: core.coreFamily?.spouses || []
          };
          // Add mother too
          if (core.coreFamily?.mother) {
            enhancedMember.parents.push(core.coreFamily.mother);
          }
          if (formData.relationshipType) {
            setPreviewLines(derivePreview(formData.relationshipType, enhancedMember));
          }
        }
      } catch (err) {
        // Silent fail for preview
        setSelectedMemberProfile(null);
        setPreviewLines([]);
      }
    };

    fetchMemberProfile();
  }, [formData.relatedToMemberId, formData.relationshipType, family?.id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, proofFile: e.target.files[0] }));
    }
  };

  // Validation
  const requiredFields = ['fullName', 'dob', 'gender', 'phone'];


  const missingFields = requiredFields.filter(f => !String(formData[f] || '').trim());
  const canSubmit = missingFields.length === 0 && formData.relatedToMemberId && formData.relationshipType;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Touch all fields to show errors
    setTouched({
      fullName: true,
      dob: true,
      gender: true,
      phone: true,

      relatedToMemberId: true,
      relationshipType: true
    });

    if (!canSubmit) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.dob > today) {
      setError('Date of birth cannot be in the future');
      return;
    }

    if (!formData.gender) {
      setError('Please select your gender');
      return;
    }

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('familyId', family.id);
      payload.append('fullName', formData.fullName);
      payload.append('dob', formData.dob);
      payload.append('gender', formData.gender);
      payload.append('email', formData.email);
      payload.append('phone', formData.phone);

      payload.append('relatedToMemberId', formData.relatedToMemberId);
      payload.append('relationshipType', formData.relationshipType);
      if (formData.notes) {
        payload.append('notes', formData.notes);
      }
      if (formData.proofFile) {
        payload.append('proof', formData.proofFile);
      }

      await api.post('/join-requests', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to submit join request.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({ ...prev, email: user.email }));
    }
  }, [user]);

  if (loadingFamily || loadingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-ancestral-50 font-sans">
        <Loader2 className="w-10 h-10 animate-spin text-ancestral-500" />
        <p className="mt-4 text-sm text-neutral-500 font-light">Retrieving invitation info...</p>
      </div>
    );
  }

  if (error && !family) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-ancestral-50 font-sans">
        <div className="max-w-md w-full glass-panel p-8 rounded-3xl text-center space-y-4">
          <div className="inline-flex w-12 h-12 rounded-xl bg-red-100 text-red-600 items-center justify-center font-bold text-lg">!</div>
          <h2 className="text-xl font-display font-bold text-ancestral-900">Invite Code Invalid</h2>
          <p className="text-sm text-neutral-500 font-light leading-relaxed">{error}</p>
          <button onClick={() => navigate('/onboarding')} className="w-full py-3 forest-gradient text-white rounded-xl font-medium text-sm transition">
            Go to Onboarding
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-ancestral-50 font-sans">
        <div className="max-w-md w-full glass-panel p-8 rounded-3xl text-center space-y-6">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gold-50 text-gold-700 items-center justify-center font-bold text-2xl animate-pulse">🕊</div>
          <h2 className="text-2xl font-display font-bold text-ancestral-900">Account Required</h2>
          <p className="text-sm text-neutral-500 font-light leading-relaxed">
            An account is required to join this family tree. Please log in or create a new account to submit your request to join <span className="font-semibold text-ancestral-600">{family?.name || 'the family'}</span>.
          </p>
          <div className="space-y-3 pt-2">
            <button onClick={() => navigate(`/login?redirectTo=${encodeURIComponent(window.location.pathname)}`)} className="w-full py-3.5 forest-gradient text-white rounded-xl font-semibold text-sm transition hover:shadow-md">
              Log In to Your Account
            </button>
            <button onClick={() => navigate(`/signup?redirectTo=${encodeURIComponent(window.location.pathname)}`)} className="w-full py-3.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-semibold text-sm transition">
              Create a New Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ancestral-50 py-12 px-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-ancestral-100 opacity-40 blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gold-50 opacity-30 blur-3xl"></div>

      <div className="max-w-3xl mx-auto relative z-10 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-4xl">🕊</span>
          <h1 className="text-3xl font-display font-bold text-ancestral-900">
            Request to Join Family
          </h1>
          <p className="text-sm text-neutral-500 font-light">
            You are requesting to join the family tree of <span className="font-semibold text-ancestral-600">{family.name}</span> (Surname: {family.surname})
          </p>
        </div>

        {submitted ? (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-8 rounded-3xl space-y-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-2">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>
            <h2 className="text-2xl font-display font-bold text-ancestral-900">Request Submitted!</h2>
            <p className="text-sm text-neutral-500 font-light max-w-md mx-auto leading-relaxed">
              Your request was routed to your selected family relative. Once they approve and verify the relationship link, you will be automatically added to the tree.
            </p>
            <div className="pt-4">
              <button onClick={() => navigate('/dashboard')} className="px-8 py-3.5 forest-gradient hover:bg-ancestral-600 text-white font-medium rounded-xl shadow-md transition duration-200 text-sm">
                Go to Dashboard
              </button>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-8 space-y-6">
              <div className="glass-panel p-6 rounded-3xl space-y-6">
                <h3 className="font-display font-semibold text-base text-ancestral-900 pb-2 border-b border-neutral-100">
                  Your Personal Details
                </h3>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-1">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      type="text"
                      placeholder="Sarah Smith"
                      maxLength={100}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 text-sm bg-white/70 ${touched.fullName && !formData.fullName.trim() ? 'border-red-300 bg-red-50/30' : 'border-neutral-200'}`}
                      required
                    />
                    {touched.fullName && !formData.fullName.trim() && (
                      <p className="text-[10px] text-red-500 mt-0.5">Full name is required</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="dob"
                        value={formData.dob}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        type="date"
                        max={today}
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none text-sm bg-white/70 ${touched.dob && !formData.dob ? 'border-red-300 bg-red-50/30' : 'border-neutral-200'}`}
                        required
                      />
                      {touched.dob && !formData.dob && (
                        <p className="text-[10px] text-red-500 mt-0.5">Date of birth is required</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none text-sm bg-white/70 ${touched.gender && !formData.gender ? 'border-red-300 bg-red-50/30' : 'border-neutral-200'}`}
                        required
                      >
                        <option value="">Select Gender...</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      {touched.gender && !formData.gender && (
                        <p className="text-[10px] text-red-500 mt-0.5">Gender is required</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      type="tel"
                      placeholder="+1 555-0122"
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none text-sm bg-white/70 ${touched.phone && !formData.phone.trim() ? 'border-red-300 bg-red-50/30' : 'border-neutral-200'}`}
                      required
                    />
                    {touched.phone && !formData.phone.trim() && (
                      <p className="text-[10px] text-red-500 mt-0.5">Phone is required</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                      Email Address
                    </label>
                    <input
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      type="email"
                      placeholder="sarah@family.com"
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-sm bg-white/70"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              {/* Relationship Link Card — first-person statements */}
              <div className="glass-panel p-6 rounded-3xl space-y-6">
                <h3 className="font-display font-semibold text-base text-ancestral-900 pb-2 border-b border-neutral-100">
                  How are you related?
                </h3>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                      I know my relative in this tree
                    </label>
                    <select
                      name="relatedToMemberId"
                      value={formData.relatedToMemberId}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-sm text-neutral-600 bg-white/70"
                      required
                    >
                      <option value="">Select Family Member...</option>
                      {family.memberships?.map(m => (
                        <option key={m.member.id} value={m.member.id}>
                          {m.member.fullName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                      I am their:
                    </label>
                    <select
                      name="relationshipType"
                      value={formData.relationshipType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-sm text-neutral-600 bg-white/70"
                      required
                    >
                      {RELATIONSHIP_STATEMENTS.map(t => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Live Preview Panel */}
                  {formData.relatedToMemberId && formData.relationshipType && previewLines.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-ancestral-50/70 border border-ancestral-200 rounded-2xl p-4 space-y-2"
                    >
                      <p className="text-[10px] font-bold text-ancestral-600 uppercase tracking-wider">
                        Preview
                      </p>
                      <p className="text-xs font-semibold text-ancestral-800">
                        Claim: "{RELATIONSHIP_STATEMENTS.find(s => s.value === formData.relationshipType)?.label}"
                      </p>
                      <div className="space-y-1">
                        {previewLines.map((line, i) => (
                          <p key={i} className="text-[11px] text-neutral-600 font-light">{line}</p>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                      Attach Verification Proof (Optional)
                    </label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="w-full text-xs text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gold-50 file:text-gold-700 hover:file:bg-gold-100 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                      Optional Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="Add any additional context or information..."
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-sm bg-white/70 resize-none font-sans"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-4 space-y-6">
              <div className="glass-panel p-6 rounded-3xl space-y-4">
                <div className="w-10 h-10 rounded-xl bg-ancestral-500/10 flex items-center justify-center text-ancestral-600">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="font-display font-semibold text-ancestral-900">About {family.name}</h4>
                <p className="text-xs text-neutral-500 leading-relaxed font-light">
                  {family.description || 'This family tree has been set up to catalog ancestral history and link generations.'}
                </p>
                {family.originVillageCity && (
                  <p className="text-xs text-neutral-400 font-light">
                    Origin: <span className="font-semibold text-neutral-600">{family.originVillageCity}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || !canSubmit}
                className="w-full py-4 forest-gradient hover:bg-ancestral-600 text-white font-medium rounded-2xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Submit Request</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default JoinFamily;
