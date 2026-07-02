import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, Mail, Phone, Calendar, Briefcase, GraduationCap, Heart, Users, Edit, ShieldAlert, BadgeInfo } from 'lucide-react';
import api from '../../services/api.js';
import PhotoUpload from './PhotoUpload.jsx';
import EditProfileModal from './EditProfileModal.jsx';
import PrivacySettingsPanel from './PrivacySettingsPanel.jsx';
import TimelinePage from './TimelinePage.jsx';
import MemberMemories from '../memories/MemberMemories.jsx';
import CoreFamilyView from './CoreFamilyView.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export const MemberProfile = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  
  const familyId = searchParams.get('familyId');
  const shareableLink = searchParams.get('shareableLink');

  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Fetch Member profile details
  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['memberProfile', memberId, familyId, shareableLink, currentUser?.id],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (familyId) queryParams.append('familyId', familyId);
      if (shareableLink) queryParams.append('shareableLink', shareableLink);
      // We pass the current logged-in member ID as sourceMemberId so relationship calculator works
      if (currentUser?.memberId) {
        queryParams.append('sourceMemberId', currentUser.memberId);
      }

      const response = await api.get(`/members/${memberId}?${queryParams.toString()}`);
      return response.data?.member;
    },
    enabled: !!memberId
  });

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-ancestral-50/50">
        <Loader2 className="w-8 h-8 animate-spin text-ancestral-500" />
        <p className="mt-4 text-xs text-neutral-500">Retrieving archival record...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-ancestral-50/50 space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-500" />
        <h3 className="font-display font-bold text-lg text-neutral-800">Archival Profile Locked</h3>
        <p className="text-xs text-neutral-500 font-light max-w-sm text-center leading-relaxed">
          This record is private. To view this profile, please join this family or verify you have link access.
        </p>
        <button
          onClick={() => navigate('/onboarding')}
          className="px-5 py-2.5 forest-gradient text-white text-xs font-semibold rounded-xl shadow"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const { role } = profile; // OWNER, HISTORIAN, FAMILY_MEMBER, LINK_VIEWER
  const isOwner = role === 'OWNER';
  const isHistorian = role === 'HISTORIAN';
  const canEditProfile = isOwner || (isHistorian && !profile.isLiving) || isHistorian;

  // Determine if active user is Historian or Founder in the family
  const activeMembership = currentUser?.memberships?.find(m => m.familyId === familyId);
  const isUserHistorianOrFounder = activeMembership && ['FOUNDER', 'HISTORIAN'].includes(activeMembership.role);

  // Formatting helper
  const getLifespan = () => {
    if (profile.birthYear || profile.deathYear) {
      return `${profile.birthYear || 'Unknown'} – ${profile.deathYear || (profile.isLiving ? 'Present' : 'Deceased')}`;
    }
    const bYear = profile.dob ? new Date(profile.dob).getFullYear() : 'Unknown';
    const dYear = profile.deathDate ? new Date(profile.deathDate).getFullYear() : (profile.isLiving ? 'Present' : 'Deceased');
    return `${bYear} – ${dYear}`;
  };

  const handleNavigateToRelative = (relId) => {
    const params = new URLSearchParams();
    if (familyId) params.append('familyId', familyId);
    if (shareableLink) params.append('shareableLink', shareableLink);
    navigate(`/member/${relId}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-ancestral-50/50 py-12 px-6 md:px-12 font-sans relative overflow-hidden">
      {/* Background aesthetics */}
      <div className="absolute top-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-ancestral-100/40 blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-gold-50/30 blur-3xl"></div>

      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        {/* Back navigation */}
        <div>
          <button
            onClick={() => {
              if (familyId) {
                navigate(`/family/${familyId}/tree`);
              } else {
                navigate('/dashboard');
              }
            }}
            className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-ancestral-800 transition duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Family Tree</span>
          </button>
        </div>

        {/* Profile Card Header */}
        <div className="bg-white/85 border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row gap-6 items-center md:items-start relative">
          {/* Avatar Photo (Firebase Storage Upload trigger) */}
          <div className="shrink-0">
            {canEditProfile ? (
              <PhotoUpload
                memberId={profile.id}
                currentPhoto={profile.profilePhoto}
                onUploadSuccess={() => refetch()}
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl border-2 border-white shadow-md overflow-hidden bg-neutral-100 flex items-center justify-center">
                {profile.profilePhoto ? (
                  <img src={profile.profilePhoto} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">👤</span>
                )}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="space-y-1">
              <div className="flex flex-col md:flex-row items-center gap-2 flex-wrap justify-center md:justify-start">
                <h1 className="text-2xl md:text-3xl font-display font-bold text-ancestral-900 leading-tight">
                  {profile.fullName}
                </h1>
                {profile.nickname && (
                  <span className="text-xs font-light text-neutral-400">
                    ({profile.nickname})
                  </span>
                )}
                {/* Deceased Badge */}
                {!profile.isLiving && (
                  <span className="bg-neutral-100 text-neutral-600 font-display font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded shadow-sm border border-neutral-200">
                    Deceased 🕊
                  </span>
                )}
                {/* User Role Badge */}
                {profile.role && (
                  <span className="bg-gold-50 border border-gold-200 text-gold-700 font-display font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">
                    {profile.role}
                  </span>
                )}
                {/* Generation Badge (visible to Historian and Founder only) */}
                {isUserHistorianOrFounder && profile.generationNumber !== undefined && (
                  <span className="bg-ancestral-50 border border-ancestral-200 text-ancestral-700 font-display font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">
                    Gen {profile.generationNumber}
                  </span>
                )}
              </div>

              {/* Lifespan */}
              <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs font-medium text-neutral-500">
                <span>{getLifespan()}</span>
              </div>
            </div>

            {/* Relationship & Actions */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              {profile.calculatedRelationship && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-medium">
                  <Users className="w-3.5 h-3.5" />
                  <span>Relationship to Me: <strong>{profile.calculatedRelationship}</strong></span>
                </div>
              )}
              {familyId && (
                <button
                  onClick={() => {
                    navigate(`/family/${familyId}/tree?compareSourceId=${profile.id}&compareSourceName=${encodeURIComponent(profile.fullName)}`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-neutral-900 hover:bg-neutral-850 text-white rounded-full text-xs font-semibold shadow-sm transition duration-200"
                >
                  <Users className="w-3 h-3" />
                  <span>Find Relationship</span>
                </button>
              )}
            </div>

            {profile.bio && (
              <p className="text-xs text-neutral-400 font-light leading-relaxed max-w-xl">
                {profile.bio}
              </p>
            )}
          </div>

          {/* Edit Profile Trigger */}
          {canEditProfile && (
            <button
              onClick={() => setEditing(true)}
              className="absolute top-6 right-6 p-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-500 hover:text-ancestral-800 rounded-xl transition duration-200"
              title="Edit Profile"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Profile / Family tabs */}
        <div className="flex gap-1 p-1 bg-white/60 border border-neutral-200/80 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition duration-200 ${
              activeTab === 'profile'
                ? 'bg-ancestral-700 text-white shadow-sm'
                : 'text-neutral-500 hover:text-ancestral-800 hover:bg-neutral-50'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('family')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition duration-200 ${
              activeTab === 'family'
                ? 'bg-ancestral-700 text-white shadow-sm'
                : 'text-neutral-500 hover:text-ancestral-800 hover:bg-neutral-50'
            }`}
          >
            Family
          </button>
        </div>

        {activeTab === 'family' ? (
          <CoreFamilyView
            memberId={memberId}
            familyId={familyId}
            shareableLink={shareableLink}
            onNavigate={handleNavigateToRelative}
          />
        ) : (
        <>
        {/* Dynamic Details Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Factual data */}
            <div className="glass-panel p-6 rounded-3xl space-y-4">
              <h3 className="font-display font-bold text-base text-ancestral-900 border-b border-neutral-100 pb-3">
                Archival Summary
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-xs">
                {profile.dob && (
                  <div className="space-y-0.5">
                    <span className="text-neutral-400 font-light">Birth Date</span>
                    <span className="font-semibold text-neutral-800 block">
                      {new Date(profile.dob).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                )}
                {profile.birthPlace && (
                  <div className="space-y-0.5">
                    <span className="text-neutral-400 font-light">Birth Place</span>
                    <span className="font-semibold text-neutral-800 block">
                      {profile.birthPlace} {profile.birthVillageCity ? `(${profile.birthVillageCity})` : ''}
                    </span>
                  </div>
                )}
                {profile.bloodGroup && (
                  <div className="space-y-0.5">
                    <span className="text-neutral-400 font-light">Blood Group</span>
                    <span className="font-semibold text-neutral-800 block">{profile.bloodGroup}</span>
                  </div>
                )}
                {profile.gender && (
                  <div className="space-y-0.5">
                    <span className="text-neutral-400 font-light">Gender</span>
                    <span className="font-semibold text-neutral-800 block">
                      {profile.gender === 'M' ? 'Male' : profile.gender === 'F' ? 'Female' : 'Other'}
                    </span>
                  </div>
                )}
                {profile.occupation && (
                  <div className="space-y-0.5">
                    <span className="text-neutral-400 font-light">Occupation</span>
                    <span className="font-semibold text-neutral-800 block">{profile.occupation}</span>
                  </div>
                )}
                {profile.education && (
                  <div className="space-y-0.5 col-span-2">
                    <span className="text-neutral-400 font-light">Education / Qualifications</span>
                    <span className="font-semibold text-neutral-800 block">{profile.education}</span>
                  </div>
                )}
                {profile.phone && (
                  <div className="space-y-0.5">
                    <span className="text-neutral-400 font-light">Contact Phone</span>
                    <span className="font-semibold text-neutral-800 block">{profile.phone}</span>
                  </div>
                )}
                {profile.email && (
                  <div className="space-y-0.5">
                    <span className="text-neutral-400 font-light">Contact Email</span>
                    <span className="font-semibold text-neutral-800 block">{profile.email}</span>
                  </div>
                )}
                {!profile.isLiving && profile.causeOfDeath && (
                  <div className="space-y-0.5 col-span-2 bg-red-50/30 p-3 border border-red-100/50 rounded-xl">
                    <span className="text-red-600/70 font-semibold uppercase tracking-wider text-[9px] block">Cause of Death</span>
                    <span className="font-semibold text-neutral-800 block mt-0.5">{profile.causeOfDeath}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline Milestones */}
            <TimelinePage
              memberId={profile.id}
              timeline={profile.timeline}
              canEdit={canEditProfile}
              onRefresh={() => refetch()}
            />

            {/* Tagged Memories Tab */}
            {role !== 'LINK_VIEWER' && (
              <MemberMemories memberId={profile.id} />
            )}
          </div>

          {/* Right Sidebar: Relationships & Privacy settings */}
          <div className="space-y-6">
            {/* Kinship relations links */}
            <div className="glass-panel p-6 rounded-3xl space-y-4">
              <h3 className="font-display font-bold text-base text-ancestral-900 border-b border-neutral-100 pb-3">
                Kinship Connections
              </h3>

              <div className="space-y-4 text-xs">
                {/* Parents */}
                <div className="space-y-1.5">
                  <span className="text-neutral-400 font-light block">Parents</span>
                  {profile.parents?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.parents.map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleNavigateToRelative(p.id)}
                          className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200/50 rounded-lg text-neutral-700 font-semibold block transition"
                        >
                          {p.fullName}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-neutral-400 italic font-light block">None recorded</span>
                  )}
                </div>

                {/* Spouses */}
                <div className="space-y-1.5">
                  <span className="text-neutral-400 font-light block">Spouse / Partner</span>
                  {profile.spouses?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.spouses.map(s => (
                        <button
                          key={s.id}
                          onClick={() => handleNavigateToRelative(s.id)}
                          className="px-2.5 py-1.5 bg-gold-50/40 hover:bg-gold-50 border border-gold-200 text-neutral-700 font-semibold block transition"
                        >
                          {s.fullName}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-neutral-400 italic font-light block">None recorded</span>
                  )}
                </div>

                {/* Siblings */}
                <div className="space-y-1.5">
                  <span className="text-neutral-400 font-light block">Siblings</span>
                  {profile.siblings?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.siblings.map(sib => (
                        <button
                          key={sib.id}
                          onClick={() => handleNavigateToRelative(sib.id)}
                          className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200/50 rounded-lg text-neutral-700 font-semibold block transition"
                        >
                          {sib.fullName}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-neutral-400 italic font-light block">None recorded</span>
                  )}
                </div>

                {/* Children */}
                <div className="space-y-1.5">
                  <span className="text-neutral-400 font-light block">Children</span>
                  {profile.children?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.children.map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleNavigateToRelative(c.id)}
                          className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200/50 rounded-lg text-neutral-700 font-semibold block transition"
                        >
                          {c.fullName}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-neutral-400 italic font-light block">None recorded</span>
                  )}
                </div>
              </div>
            </div>

            {/* Privacy settings toggles (OWNER only) */}
            {isOwner && (
              <PrivacySettingsPanel
                memberId={profile.id}
                initialPrivacy={profile.privacySettings}
              />
            )}
          </div>
        </div>
        </>
        )}
      </div>

      {/* Edit Form Modal */}
      {editing && (
        <EditProfileModal
          memberId={profile.id}
          initialData={profile}
          onClose={() => setEditing(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
};

export default MemberProfile;
