import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, Calendar, MapPin, Briefcase, Droplet, Phone, Mail, GraduationCap, Heart, Sparkles, UserPlus, Loader2, Trash2, Shield, Send, CheckCircle, XCircle, Eye } from 'lucide-react';
import api from '../../services/api.js';
import ContactRequestModal from './ContactRequestModal.jsx';

export const ProfileSidebar = ({ memberId, familyId, currentUserMemberId, isHistorian, onClose, onAddRelative, onStartCompare, onRelationshipDeleted }) => {
  const navigate = useNavigate();
  const [contactModal, setContactModal] = useState(null); // { mode: 'request'|'received'|'shared', request? }

  const { data: memberData, isLoading } = useQuery({
    queryKey: ['memberProfile', memberId, currentUserMemberId, familyId],
    queryFn: async () => {
      const response = await api.get(`/members/${memberId}`, {
        params: {
          sourceMemberId: currentUserMemberId || undefined,
          familyId: familyId || undefined
        }
      });
      return response.data?.member;
    },
    enabled: !!memberId
  });

  // Fetch contact request status between current user and this member
  const { data: requestStatusData } = useQuery({
    queryKey: ['contactRequestStatus', memberId, familyId],
    queryFn: async () => {
      const res = await api.get(`/contact-requests/status/${memberId}`, { params: { familyId } });
      return res.data?.request;
    },
    enabled: !!memberId && !!familyId && memberId !== currentUserMemberId
  });

  // Fetch received contact requests (for owners viewing others' profiles)
  const { data: receivedRequestsData } = useQuery({
    queryKey: ['contactRequests', 'received'],
    queryFn: async () => {
      const res = await api.get('/contact-requests/received');
      return res.data?.requests || [];
    },
    enabled: !!memberId && memberId === currentUserMemberId
  });

  const isOwnProfile = memberId === currentUserMemberId;
  const hasPendingRequest = requestStatusData?.status === 'PENDING';
  const hasApprovedRequest = requestStatusData?.status === 'APPROVED';

  if (!memberId) return null;

  const renderTimelineIcon = (type) => {
    switch (type) {
      case 'BORN': return <Sparkles className="w-3.5 h-3.5" />;
      case 'SCHOOL':
      case 'COLLEGE': return <GraduationCap className="w-3.5 h-3.5" />;
      case 'MARRIAGE': return <Heart className="w-3.5 h-3.5" />;
      case 'CAREER': return <Briefcase className="w-3.5 h-3.5" />;
      default: return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  // Determine what contact info to show
  const canSeeContactDirectly = isOwnProfile || isHistorian;
  const showContactViaRequest = hasApprovedRequest && requestStatusData;

  return (
    <>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-neutral-200 shadow-2xl z-50 flex flex-col font-sans"
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Profile Details
          </span>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500 transition duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <LoaderSpinner />
          </div>
        ) : memberData ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Top Profile Card */}
            <div className="text-center space-y-4">
              <div className="relative inline-block">
                {memberData.profilePhoto ? (
                  <img
                    src={memberData.profilePhoto}
                    alt={memberData.fullName}
                    className="w-24 h-24 rounded-3xl object-cover mx-auto ring-4 ring-ancestral-50 shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-3xl bg-ancestral-50 text-ancestral-700 font-display font-semibold text-3xl flex items-center justify-center mx-auto ring-4 ring-ancestral-50 shadow-sm">
                    {memberData.fullName.charAt(0)}
                  </div>
                )}
                {!memberData.isLiving && (
                  <span className="absolute bottom-[-6px] right-[-6px] bg-neutral-200 text-neutral-600 rounded-full w-7 h-7 flex items-center justify-center border border-white text-xs shadow-sm" title="Deceased">
                    🕊
                  </span>
                )}
              </div>

              <div className="space-y-1 text-center flex flex-col items-center">
                <h2 className="text-2xl font-display font-bold text-ancestral-900 leading-tight">
                  {memberData.fullName}
                </h2>
                {memberData.nickname && (
                  <p className="text-sm text-neutral-500 font-light italic">({memberData.nickname})</p>
                )}
                {memberData.calculatedRelationship && (
                  <div className="mt-2.5">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                      Relation to Me
                    </span>
                    <span className="inline-block bg-gold-50 text-gold-700 font-display font-semibold text-xs tracking-wider uppercase px-3 py-1 rounded-full shadow-inner border border-gold-200/50">
                      {memberData.calculatedRelationship}
                    </span>
                  </div>
                )}
                <div className="pt-4 flex flex-col gap-2 w-full max-w-xs">
                  <button
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (familyId) params.append('familyId', familyId);
                      const currentShareableLink = new URLSearchParams(window.location.search).get('shareableLink');
                      if (currentShareableLink) params.append('shareableLink', currentShareableLink);
                      navigate(`/member/${memberId}?${params.toString()}`);
                    }}
                    className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-850 text-white rounded-xl text-xs font-semibold shadow-sm transition duration-200"
                  >
                    View Full Profile
                  </button>
                  <button
                    onClick={() => onStartCompare(memberData)}
                    className="w-full py-2.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-xl text-xs font-semibold shadow-sm transition duration-200"
                  >
                    Compare Relationship
                  </button>
                  {memberData.userId && (
                    <button
                      onClick={() => navigate(`/family/${familyId}/messages?recipientId=${memberData.userId}`)}
                      className="w-full py-2.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-xl text-xs font-semibold shadow-sm transition duration-200"
                    >
                      Send Message
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              {memberData.dob && (
                <div className="bg-neutral-50/50 border border-neutral-100 p-3.5 rounded-2xl">
                  <div className="flex items-center gap-2 text-neutral-400 text-xs font-light">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Born</span>
                  </div>
                  <p className="text-xs font-semibold text-neutral-800 mt-1">
                    {new Date(memberData.dob).toLocaleDateString()}
                  </p>
                </div>
              )}
              {memberData.bloodGroup && (
                <div className="bg-neutral-50/50 border border-neutral-100 p-3.5 rounded-2xl">
                  <div className="flex items-center gap-2 text-neutral-400 text-xs font-light">
                    <Droplet className="w-3.5 h-3.5 text-red-500" />
                    <span>Blood Group</span>
                  </div>
                  <p className="text-xs font-semibold text-neutral-800 mt-1">{memberData.bloodGroup}</p>
                </div>
              )}
              {memberData.birthPlace && (
                <div className="bg-neutral-50/50 border border-neutral-100 p-3.5 rounded-2xl col-span-2">
                  <div className="flex items-center gap-2 text-neutral-400 text-xs font-light">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Birth Place</span>
                  </div>
                  <p className="text-xs font-semibold text-neutral-800 mt-1">{memberData.birthPlace}</p>
                </div>
              )}
              {memberData.occupation && (
                <div className="bg-neutral-50/50 border border-neutral-100 p-3.5 rounded-2xl col-span-2">
                  <div className="flex items-center gap-2 text-neutral-400 text-xs font-light">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Occupation</span>
                  </div>
                  <p className="text-xs font-semibold text-neutral-800 mt-1">{memberData.occupation}</p>
                </div>
              )}
            </div>

            {/* Relationships (with delete for historians) */}
            {isHistorian && (memberData.parents?.length > 0 || memberData.children?.length > 0 || memberData.spouses?.length > 0) && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Relationships</h4>
                <div className="space-y-1.5">
                  {[...(memberData.parents || []), ...(memberData.children || []), ...(memberData.spouses || [])].map((rel) => (
                    <div key={rel.relId || `${rel.id}-${rel.relationship}`} className="flex items-center justify-between p-2 bg-neutral-50/50 border border-neutral-100 rounded-xl group">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold text-ancestral-600 bg-ancestral-50 px-1.5 py-0.5 rounded uppercase shrink-0">
                          {rel.relationship?.toLowerCase().replaceAll('_', ' ')}
                        </span>
                        <span className="text-xs text-neutral-600 truncate">{rel.fullName}</span>
                      </div>
                      {rel.relId && (
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Remove ${rel.relationship?.toLowerCase().replaceAll('_', ' ')} relationship with ${rel.fullName}?`)) return;
                            try {
                              await api.delete('/admin/relationships', {
                                data: { familyId, relationshipId: rel.relId }
                              });
                              if (onRelationshipDeleted) onRelationshipDeleted();
                              onClose();
                            } catch (err) {
                              alert(err.response?.data?.error?.message || 'Failed to delete relationship');
                            }
                          }}
                          className="p-1 text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition duration-150 shrink-0"
                          title="Delete relationship"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Info — REQUEST-BASED */}
            {!isOwnProfile && !isHistorian ? (
              /* Other member's profile — show request UI */
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Contact Info</h4>
                <div className="bg-neutral-50/80 border border-neutral-100 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <Shield className="w-4 h-4" />
                    <span className="text-xs font-light">Contact details are private</span>
                  </div>

                  {hasApprovedRequest && showContactViaRequest ? (
                    /* Approved — show shared data */
                    <div className="space-y-2">
                      {requestStatusData.sharedPhone && (
                        <div className="flex items-center gap-3 text-xs">
                          <Phone className="w-3.5 h-3.5 text-ancestral-500" />
                          <span className="text-neutral-700">{requestStatusData.sharedPhone}</span>
                        </div>
                      )}
                      {requestStatusData.sharedEmail && (
                        <div className="flex items-center gap-3 text-xs">
                          <Mail className="w-3.5 h-3.5 text-ancestral-500" />
                          <span className="text-neutral-700">{requestStatusData.sharedEmail}</span>
                        </div>
                      )}
                      {requestStatusData.sharedAddress && (
                        <div className="flex items-center gap-3 text-xs">
                          <MapPin className="w-3.5 h-3.5 text-ancestral-500" />
                          <span className="text-neutral-700">{requestStatusData.sharedAddress}</span>
                        </div>
                      )}
                      <button
                        onClick={() => setContactModal({ mode: 'shared', request: requestStatusData })}
                        className="text-[10px] text-ancestral-600 hover:text-ancestral-800 font-medium flex items-center gap-1 transition"
                      >
                        <Eye className="w-3 h-3" /> View full shared details
                      </button>
                    </div>
                  ) : hasPendingRequest ? (
                    /* Pending — show waiting state */
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-ancestral-400" />
                      <span>Request pending — waiting for response</span>
                    </div>
                  ) : (
                    /* No request — show request button */
                    <button
                      onClick={() => setContactModal({ mode: 'request' })}
                      className="w-full py-2.5 bg-ancestral-600 hover:bg-ancestral-700 text-white rounded-xl text-xs font-semibold transition duration-200 flex items-center justify-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Request Contact Info
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Own profile or historian — show contact directly */
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Contact Info</h4>
                <div className="space-y-3.5">
                  {memberData.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="w-8 h-8 rounded-lg bg-neutral-50 flex items-center justify-center text-neutral-400">
                        <Phone className="w-4 h-4" />
                      </span>
                      <span className="text-neutral-700">{memberData.phone}</span>
                    </div>
                  )}
                  {memberData.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="w-8 h-8 rounded-lg bg-neutral-50 flex items-center justify-center text-neutral-400">
                        <Mail className="w-4 h-4" />
                      </span>
                      <span className="text-neutral-700">{memberData.email}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bio */}
            {memberData.bio && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Biography</h4>
                <p className="text-xs text-neutral-600 leading-relaxed font-light whitespace-pre-line bg-neutral-50/30 p-4 border border-neutral-100 rounded-2xl">
                  {memberData.bio}
                </p>
              </div>
            )}

            {/* Timeline Events */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Life Timeline</h4>
              {memberData.timelineEvents?.length > 0 ? (
                <div className="relative pl-6 border-l border-neutral-100 space-y-6">
                  {memberData.timelineEvents.map((evt) => (
                    <div key={evt.id} className="relative">
                      <span className="absolute left-[-31px] top-0 w-4 h-4 rounded-full bg-ancestral-50 border-2 border-ancestral-500 flex items-center justify-center text-[8px] text-ancestral-700">
                        {renderTimelineIcon(evt.type)}
                      </span>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-neutral-400 font-light block">
                          {new Date(evt.eventDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                        </span>
                        <h5 className="text-xs font-semibold text-neutral-800">{evt.title}</h5>
                        {evt.description && (
                          <p className="text-[11px] text-neutral-500 font-light leading-relaxed">{evt.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400 font-light italic">No timeline events listed.</p>
              )}
            </div>

            {/* Historian actions */}
            {isHistorian && (
              <div className="pt-4 pb-8 border-t border-neutral-100">
                <button
                  onClick={() => onAddRelative(memberData)}
                  className="w-full py-3.5 border border-ancestral-200 hover:bg-ancestral-50 text-ancestral-700 rounded-2xl font-medium text-xs flex items-center justify-center gap-2 transition duration-200 shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Parent / Spouse / Child</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-center text-neutral-400 font-light">
            Failed to load member profile info.
          </div>
        )}
      </motion.div>

      {/* Contact Request Modal */}
      {contactModal && (
        <ContactRequestModal
          mode={contactModal.mode}
          request={contactModal.request}
          ownerId={memberId}
          ownerName={memberData?.fullName}
          familyId={familyId}
          onClose={() => setContactModal(null)}
        />
      )}
    </>
  );
};

const LoaderSpinner = () => (
  <div className="flex flex-col items-center gap-3">
    <Loader2 className="w-8 h-8 animate-spin text-ancestral-500" />
    <span className="text-xs text-neutral-400">Loading profile...</span>
  </div>
);

export default ProfileSidebar;
