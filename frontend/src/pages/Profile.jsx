import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, Mail, Phone, Calendar, Briefcase, Users, TreePine, Shield, Share2, Copy, Check, ExternalLink } from 'lucide-react';
import api from '../services/api.js';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: memberProfile, isLoading } = useQuery({
    queryKey: ['memberProfile', user?.memberId],
    queryFn: async () => {
      const response = await api.get(`/members/${user.memberId}`);
      return response.data?.member;
    },
    enabled: !!user?.memberId
  });

  const [shareOpen, setShareOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShareProfile = async (familyId) => {
    if (!familyId || !user?.memberId) return;
    setShareLoading(true);
    try {
      const res = await api.get(`/families/${familyId}/invite-info`);
      const shareableLink = res.data?.shareableLink;
      if (!shareableLink) {
        setShareLoading(false);
        return;
      }
      const url = `${window.location.origin}/member/${user.memberId}?familyId=${familyId}&shareableLink=${encodeURIComponent(shareableLink)}`;
      setShareLink(url);
      setShareOpen(true);
      setShareLoading(false);

      if (navigator.share) {
        navigator.share({
          title: `${memberProfile?.fullName || 'My Profile'} — Roots Across Generations`,
          text: `View my family profile`,
          url
        }).catch(() => {});
      }
    } catch {
      setShareLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ancestral-50">
        <Loader2 className="w-8 h-8 animate-spin text-ancestral-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ancestral-50/50 py-12 px-6 md:px-12 font-sans relative overflow-hidden">
      {/* Background aesthetics */}
      <div className="absolute top-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-ancestral-100/40 blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-gold-50/30 blur-3xl"></div>

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        {/* Back navigation */}
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-ancestral-800 transition duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>

        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/85 border border-neutral-200/80 rounded-3xl p-8 shadow-sm"
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="shrink-0">
              <div className="w-24 h-24 rounded-2xl border-2 border-white shadow-md overflow-hidden bg-ancestral-100 flex items-center justify-center">
                {memberProfile?.profilePhoto ? (
                  <img src={memberProfile.profilePhoto} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">👤</span>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-display font-bold text-ancestral-900 leading-tight">
                  {memberProfile?.fullName || user.email}
                </h1>
                <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-neutral-500">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                {memberProfile?.occupation && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-ancestral-50 text-ancestral-700 border border-ancestral-100 rounded-full text-xs font-medium">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>{memberProfile.occupation}</span>
                  </div>
                )}
                {memberProfile?.phone && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-ancestral-50 text-ancestral-700 border border-ancestral-100 rounded-full text-xs font-medium">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{memberProfile.phone}</span>
                  </div>
                )}
                {memberProfile?.dob && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-ancestral-50 text-ancestral-700 border border-ancestral-100 rounded-full text-xs font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(memberProfile.dob).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Share Profile Button */}
              {user.memberships && user.memberships.length > 0 && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
                  {user.memberships.map((m) => (
                    <button
                      key={m.familyId}
                      onClick={() => handleShareProfile(m.familyId)}
                      disabled={shareLoading}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-ancestral-50 hover:bg-ancestral-100 text-ancestral-700 border border-ancestral-200 rounded-xl text-xs font-semibold shadow-sm transition duration-200 disabled:opacity-60"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share {m.familyName || 'Profile'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Bio */}
        {memberProfile?.bio && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white/85 border border-neutral-200/80 rounded-3xl p-8 shadow-sm"
          >
            <h2 className="text-lg font-display font-bold text-ancestral-900 mb-3">About</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">{memberProfile.bio}</p>
          </motion.div>
        )}

        {/* Family Memberships */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white/85 border border-neutral-200/80 rounded-3xl p-8 shadow-sm"
        >
          <h2 className="text-lg font-display font-bold text-ancestral-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-ancestral-500" />
            Family Memberships
          </h2>

          {user.memberships && user.memberships.length > 0 ? (
            <div className="space-y-3">
              {user.memberships.map((m) => (
                <div
                  key={m.familyId}
                  className="flex items-center justify-between p-4 rounded-2xl bg-ancestral-50/60 border border-ancestral-100/80 hover:border-ancestral-300/50 transition duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-ancestral-500/10 flex items-center justify-center">
                      <TreePine className="w-5 h-5 text-ancestral-500" />
                    </div>
                    <div>
                      <p className="font-display font-semibold text-ancestral-800 text-sm">
                        {m.familyName} {m.familySurname}
                      </p>
                      <p className="text-xs text-neutral-400 font-mono">{m.readableFamilyId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gold-50 text-gold-700 border border-gold-200 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      <Shield className="w-3 h-3" />
                      {m.role}
                    </span>
                    <button
                      onClick={() => navigate(`/family/${m.familyId}/tree`)}
                      className="px-3 py-1.5 forest-gradient text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow-md transition duration-200"
                    >
                      View Tree
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <Users className="w-10 h-10 text-neutral-300 mx-auto" />
              <p className="text-sm text-neutral-500">You are not part of any family tree yet.</p>
              <button
                onClick={() => navigate('/onboarding')}
                className="px-4 py-2 forest-gradient text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow-md transition duration-200"
              >
                Create or Join a Family
              </button>
            </div>
          )}
        </motion.div>

        {/* Account Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white/85 border border-neutral-200/80 rounded-3xl p-8 shadow-sm"
        >
          <h2 className="text-lg font-display font-bold text-ancestral-900 mb-4">Account Details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-ancestral-700 tracking-wider uppercase">User ID</span>
              <p className="text-sm text-neutral-600 font-mono bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200/60 truncate">
                {user.id}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-ancestral-700 tracking-wider uppercase">Member ID</span>
              <p className="text-sm text-neutral-600 font-mono bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200/60 truncate">
                {user.memberId || 'Not linked'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-ancestral-700 tracking-wider uppercase">Email</span>
              <p className="text-sm text-neutral-600 bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200/60">
                {user.email}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-ancestral-700 tracking-wider uppercase">Families Joined</span>
              <p className="text-sm text-neutral-600 bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200/60">
                {user.memberships?.length || 0}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Share Profile Modal */}
      <AnimatePresence>
        {shareOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShareOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl shadow-2xl border border-neutral-200 p-6 w-full max-w-md space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-ancestral-900 text-lg">Share Profile</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">View-only link for {memberProfile?.fullName || 'your profile'}</p>
                </div>
                <button onClick={() => setShareOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400">
                  <span className="sr-only">Close</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="bg-ancestral-50 border border-ancestral-200 rounded-2xl p-4">
                <p className="text-xs text-ancestral-700 font-medium mb-2 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Anyone with this link can view (no login required)
                </p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={shareLink}
                    className="flex-1 text-xs bg-white border border-ancestral-200 rounded-xl px-3 py-2 text-neutral-700 font-mono truncate focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="shrink-0 p-2.5 rounded-xl bg-ancestral-500 text-white hover:bg-ancestral-600 transition duration-200"
                    title="Copy link"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="text-xs text-neutral-400 leading-relaxed">
                The shared profile shows only basic information: name, lifespan, family relationships, and profile photo. Sensitive details like phone, email, and date of birth are hidden.
              </div>

              <button
                onClick={() => setShareOpen(false)}
                className="w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold transition duration-200"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
