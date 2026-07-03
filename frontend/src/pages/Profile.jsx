import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, Mail, Phone, Calendar, Briefcase, Users, TreePine, Shield } from 'lucide-react';
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
    </div>
  );
};

export default Profile;
