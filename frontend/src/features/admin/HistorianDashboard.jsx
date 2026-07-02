import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Users, Camera, Inbox, ShieldCheck, Database, Calendar, Users2, Settings, ListCollapse } from 'lucide-react';
import api from '../../services/api.js';

export const HistorianDashboard = () => {
  const { familyId } = useParams();
  const navigate = useNavigate();

  // Fetch admin dashboard details
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['adminDashboard', familyId],
    queryFn: async () => {
      const response = await api.get(`/admin/dashboard?familyId=${familyId}`);
      return response.data;
    },
    enabled: !!familyId
  });

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-ancestral-50/50">
        <Loader2 className="w-8 h-8 animate-spin text-ancestral-500" />
        <p className="mt-4 text-xs text-neutral-500">Opening Historian workspace...</p>
      </div>
    );
  }

  const stats = dashboardData?.stats || {};
  const recentActivity = dashboardData?.recentActivity || [];
  const isFirebaseActive = stats.firebaseStatus === 'active';

  const menuItems = [
    { label: 'Members Directory', desc: 'Manage member listings and soft-delete/restore profiles.', path: 'members', icon: Users2 },
    { label: 'Relationship Editor', desc: 'Reassign direct kinship edges between tree nodes.', path: 'relationships', icon: Settings },
    { label: 'Audit Logging Logs', desc: 'Review historical admin actions chronological tables.', path: 'audit-log', icon: ListCollapse },
    { label: 'Family Config & Links', desc: 'Rename surname origins, cover photos, or nominate historians.', path: 'settings', icon: Database }
  ];

  return (
    <div className="min-h-screen bg-ancestral-50/50 py-12 px-6 md:px-12 font-sans relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-ancestral-100/30 blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gold-50/20 blur-3xl"></div>

      <div className="max-w-6xl mx-auto relative z-10 space-y-8">
        {/* Navigation header with health check status */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <button
            onClick={() => navigate(`/family/${familyId}/tree`)}
            className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-ancestral-800 transition duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Tree</span>
          </button>

          {/* Firebase Storage health indicator */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white border border-neutral-200 shadow-sm text-[10px] font-bold tracking-wider uppercase select-none">
            <span className={`w-2.5 h-2.5 rounded-full ${isFirebaseActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-neutral-500">Firebase Storage:</span>
            <span className={isFirebaseActive ? 'text-emerald-600' : 'text-red-600'}>
              {isFirebaseActive ? 'Active (Secure)' : 'Local Fallback'}
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-ancestral-650">
            <ShieldCheck className="w-5.5 h-5.5" />
            <h1 className="text-3xl font-display font-bold text-ancestral-900">
              Historian Workspace
            </h1>
          </div>
          <p className="text-sm text-neutral-500 font-light">
            Manage your family archive records, edit trees relationships, elevate historians, and audit logs.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl space-y-2">
            <span className="text-[10px] font-bold text-neutral-400 uppercase block">Pending Join Claims</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-800">{stats.pendingRequestsCount}</span>
              <span className="text-[10px] text-ancestral-500 font-semibold cursor-pointer hover:underline" onClick={() => navigate(`/family/${familyId}/join-requests`)}>Review</span>
            </div>
          </div>
          <div className="glass-panel p-5 rounded-2xl space-y-2">
            <span className="text-[10px] font-bold text-neutral-400 uppercase block">Total Members</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-800">{stats.totalMembersCount}</span>
              <span className="text-[9px] text-neutral-400 font-light block">+{stats.addedThisMonth} this month</span>
            </div>
          </div>
          <div className="glass-panel p-5 rounded-2xl space-y-2">
            <span className="text-[10px] font-bold text-neutral-400 uppercase block">Vault Memories</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-800">{stats.memoriesCount}</span>
              <span className="text-[9px] text-neutral-400 font-light block">+{stats.memoriesThisMonth} this month</span>
            </div>
          </div>
          <div className="glass-panel p-5 rounded-2xl space-y-2">
            <span className="text-[10px] font-bold text-neutral-400 uppercase block">Role Credentials</span>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-ancestral-700 uppercase tracking-wider block mt-1">Historian</span>
            </div>
          </div>
        </div>

        {/* Workspace controls & Recent activity */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Menu Tools */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="font-display font-bold text-base text-neutral-850">Management Console</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {menuItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => navigate(`/family/${familyId}/admin/${item.path}`)}
                    className="bg-white border border-neutral-200/80 hover:border-gold-300 rounded-3xl p-6 hover:shadow-md transition duration-300 group cursor-pointer flex flex-col justify-between min-h-[140px]"
                  >
                    <div className="space-y-2">
                      <div className="w-9 h-9 rounded-xl bg-ancestral-500/10 text-ancestral-600 flex items-center justify-center">
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <h4 className="font-bold text-neutral-800 text-sm group-hover:text-ancestral-700 transition">
                        {item.label}
                      </h4>
                      <p className="text-[10px] text-neutral-400 font-light leading-normal">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-base text-neutral-850">Audit Activity</h3>
            <div className="glass-panel p-5 rounded-3xl space-y-4 max-h-[300px] overflow-y-auto">
              {recentActivity.length > 0 ? (
                recentActivity.map((log) => (
                  <div key={log.id} className="text-xs space-y-1">
                    <p className="font-light text-neutral-500 leading-normal">
                      <strong className="font-semibold text-neutral-800">{log.actor.fullName}</strong>{' '}
                      completed action <span className="font-bold text-ancestral-750 uppercase text-[9px]">{log.action.replace('_', ' ')}</span>
                    </p>
                    <span className="text-[8px] text-neutral-400 font-light flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center space-y-2">
                  <Inbox className="w-8 h-8 mx-auto text-neutral-300" />
                  <p className="text-xs text-neutral-400 font-light">No logs registered yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistorianDashboard;
