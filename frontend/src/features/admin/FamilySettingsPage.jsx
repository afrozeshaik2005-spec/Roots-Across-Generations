import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Settings, RefreshCw, Copy, Check, Users } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export const FamilySettingsPage = () => {
  const { familyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [copied, setCopied] = useState(false);
  const [elevateMemberId, setElevateMemberId] = useState('');

  // 1. Fetch family details
  const { data: family, isLoading } = useQuery({
    queryKey: ['familyDetails', familyId],
    queryFn: async () => {
      const response = await api.get(`/families/join-info/${familyId}`);
      return response.data?.family;
    },
    enabled: !!familyId
  });

  // 2. Fetch members list for elevation
  const { data: members = [] } = useQuery({
    queryKey: ['adminMembers', familyId],
    queryFn: async () => {
      const response = await api.get(`/admin/members?familyId=${familyId}`);
      return response.data?.members || [];
    },
    enabled: !!familyId
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    originVillageCity: '',
    coverPhoto: ''
  });

  // Populate form defaults when family loaded
  useEffect(() => {
    if (family) {
      setFormData({
        name: family.name || '',
        description: family.description || '',
        originVillageCity: family.originVillageCity || '',
        coverPhoto: family.coverPhoto || ''
      });
    }
  }, [family]);

  // Determine if founder
  const currentMembership = user?.memberships?.find(m => m.familyId === familyId);
  const isFounder = currentMembership?.role === 'FOUNDER';

  // 3. Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (payload) => {
      await api.patch('/admin/family-settings', { familyId, ...payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyDetails', familyId] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard', familyId] });
      alert('Family configurations updated!');
    }
  });

  // 4. Elevate historian mutation
  const elevateMutation = useMutation({
    mutationFn: async (memberId) => {
      await api.patch('/admin/appoint-historian', { familyId, memberId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMembers', familyId] });
      alert('Member nominated as additional Family Historian!');
      setElevateMemberId('');
    },
    onError: (err) => {
      alert(err.response?.data?.error?.message || 'Nomination failed');
    }
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    saveSettingsMutation.mutate(formData);
  };

  const handleRegenerateLinks = () => {
    if (!confirm('Are you sure you want to regenerate the invite shareable link and QR code? Previous links will become obsolete.')) return;
    saveSettingsMutation.mutate({ ...formData, regenerateLinks: true });
  };

  const handleCopyLink = () => {
    if (family?.shareableLink) {
      navigator.clipboard.writeText(family.shareableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleElevateSubmit = (e) => {
    e.preventDefault();
    if (!elevateMemberId) return;
    elevateMutation.mutate(elevateMemberId);
  };

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
              Family Settings
            </h1>
          </div>
          <p className="text-sm text-neutral-500 font-light">
            Edit Surname origin details, cover photos, or manage invitation links and Historian nominations.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Left / Settings Form */}
          <div className="md:col-span-2 glass-panel p-6 rounded-3xl">
            {isLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-ancestral-500" />
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                    Family / Surname Tree Name
                  </label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    type="text"
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-xs bg-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                    Origin Village / City
                  </label>
                  <input
                    name="originVillageCity"
                    value={formData.originVillageCity}
                    onChange={handleInputChange}
                    type="text"
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-xs bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                    Cover Photo URL
                  </label>
                  <input
                    name="coverPhoto"
                    value={formData.coverPhoto}
                    onChange={handleInputChange}
                    type="text"
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-xs bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                    Tree Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-xs bg-white"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-neutral-100">
                  <button
                    type="submit"
                    disabled={saveSettingsMutation.isPending}
                    className="px-6 py-3 forest-gradient hover:bg-ancestral-600 text-white text-sm font-medium rounded-xl flex items-center gap-1.5 shadow transition"
                  >
                    {saveSettingsMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Save Config</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right / Shareable Link & Appoint Historian */}
          <div className="space-y-6">
            {/* Shareable Link Card */}
            <div className="glass-panel p-5 rounded-3xl space-y-4">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Invite Credentials</span>
              
              {family?.qrCodeUrl && (
                <div className="flex items-center justify-center p-3 border border-neutral-100 bg-neutral-50/20 rounded-2xl">
                  <img src={family.qrCodeUrl} alt="Family QR Code" className="w-32 h-32" />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between border border-neutral-200 p-2.5 rounded-xl bg-white">
                  <span className="text-[10px] text-neutral-400 font-light truncate max-w-[150px]">
                    {family?.shareableLink}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="p-1.5 hover:bg-neutral-100 text-neutral-500 hover:text-ancestral-750 rounded-lg transition"
                    title="Copy Link"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <button
                  onClick={handleRegenerateLinks}
                  className="w-full py-2.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 hover:text-neutral-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate Credentials</span>
                </button>
              </div>
            </div>

            {/* Appoint Historian (Founder Only) */}
            {isFounder && (
              <div className="glass-panel p-5 rounded-3xl space-y-4">
                <div className="flex items-center gap-1.5 border-b border-neutral-100 pb-2">
                  <Users className="w-4 h-4 text-ancestral-600" />
                  <span className="text-[10px] font-bold text-neutral-800 uppercase tracking-wider">
                    Nominate Historian
                  </span>
                </div>

                <form onSubmit={handleElevateSubmit} className="space-y-3">
                  <select
                    value={elevateMemberId}
                    onChange={(e) => setElevateMemberId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-xs focus:outline-none bg-white text-neutral-500"
                    required
                  >
                    <option value="">Select Member...</option>
                    {members
                      .filter(m => !m.isDeleted && m.memberships?.some(mem => mem.role === 'MEMBER'))
                      .map(m => (
                        <option key={m.id} value={m.id}>{m.fullName}</option>
                      ))}
                  </select>

                  <button
                    type="submit"
                    disabled={elevateMutation.isPending}
                    className="w-full py-2.5 forest-gradient text-white rounded-xl text-xs font-semibold shadow hover:shadow-md transition"
                  >
                    Appoint Historian
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilySettingsPage;
