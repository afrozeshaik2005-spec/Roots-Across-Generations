import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Shield, Cloud } from 'lucide-react';
import { useState } from 'react';
import InviteModal from '../features/family-tree/InviteModal.jsx';
import MyJoinRequests from '../features/join-requests/MyJoinRequests.jsx';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteFamilyId, setInviteFamilyId] = useState(null);

  return (
    <div className="min-h-screen bg-ancestral-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="forest-gradient-gold shadow-md text-white py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🕊</span>
          <span className="font-display font-bold tracking-wider text-gold-200">ROOTS</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-light text-ancestral-100">{user?.email}</span>
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition duration-200"
          >
            <span>Settings</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:py-16 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-display font-semibold text-ancestral-800">
            Welcome to your Family OS
          </h1>
          <p className="text-neutral-500 font-light">
            Your account is set up and authenticated. Let's begin crafting your generational legacy.
          </p>
        </div>

        {/* Families List Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-display font-semibold text-ancestral-805">Your Family Trees</h2>
          {user?.memberships && user.memberships.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {user.memberships.map((m) => (
                <div key={m.familyId} className="glass-panel p-6 rounded-2xl flex flex-col justify-between hover:border-gold-300 transition duration-300">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="bg-gold-50 text-gold-700 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded">
                        {m.role}
                      </span>
                      <div className="flex gap-2">
                        {['FOUNDER', 'HISTORIAN'].includes(m.role) && (
                          <button
                            onClick={() => navigate(`/family/${m.familyId}/join-requests`)}
                            className="text-[10px] font-bold text-ancestral-600 hover:underline"
                          >
                            Review Join Requests
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setInviteFamilyId(m.familyId);
                            setInviteModalOpen(true);
                          }}
                          className="text-[10px] font-bold text-gold-650 hover:underline"
                        >
                          Invite Relatives
                        </button>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-ancestral-800 text-base">{m.familyName}</h3>
                      <span className="text-[10px] text-neutral-400 font-light block">Family Surname: {m.familySurname}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-neutral-100 mt-4">
                    <span className="text-[10px] text-neutral-400 font-mono tracking-wider">
                      {m.readableFamilyId}
                    </span>
                    <button
                      onClick={() => navigate(`/family/${m.familyId}/tree`)}
                      className="px-3.5 py-1.5 forest-gradient text-white rounded-lg text-xs font-semibold shadow hover:shadow-md transition duration-200"
                    >
                      Enter Tree
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 border border-dashed border-neutral-200 rounded-3xl text-center space-y-4 bg-white">
              <div className="text-xs text-neutral-400 font-light max-w-sm mx-auto leading-relaxed">
                You do not belong to any family tree branches yet. Create a new family legacy or import spreadsheet data to start.
              </div>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => navigate('/family/create')}
                  className="px-4 py-2 forest-gradient text-white text-xs font-semibold rounded-xl shadow hover:shadow-md transition"
                >
                  Create Family
                </button>
                <button
                  onClick={() => navigate('/family/import')}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl transition"
                >
                  Bulk Import Excel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* My Join Requests */}
        <MyJoinRequests />

        {/* Removing technical cards (User Profile, Security Settings, Status Mappings) per audit requirements.
            The family tree cards above are now the sole focus. */}
      </main>

      {/* Invite Modal */}
      {inviteModalOpen && inviteFamilyId && (
        <InviteModal
          familyId={inviteFamilyId}
          onClose={() => {
            setInviteModalOpen(false);
            setInviteFamilyId(null);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
