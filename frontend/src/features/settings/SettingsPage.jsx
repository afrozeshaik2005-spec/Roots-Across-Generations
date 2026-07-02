import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Settings, Shield, Bell, Key, Users, Palette, HelpCircle } from 'lucide-react';
import api from '../../services/api.js';

import AccountSettingsPanel from './AccountSettingsPanel.jsx';
import PrivacySettingsPanel from '../member-profile/PrivacySettingsPanel.jsx';
import NotificationSettings from '../notifications/NotificationSettings.jsx';
import FamilyMembershipsPanel from './FamilyMembershipsPanel.jsx';
import AppearancePanel from './AppearancePanel.jsx';
import HelpPage from './HelpPage.jsx';
import SessionsPanel from './SessionsPanel.jsx';

export const SettingsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');

  // Fetch current user account details (Google OAuth status, display name, etc.)
  const { data: userDetails, isLoading } = useQuery({
    queryKey: ['userAccountDetails'],
    queryFn: async () => {
      const response = await api.get('/settings/account');
      return response.data?.user;
    }
  });

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-ancestral-50/50">
        <Loader2 className="w-8 h-8 animate-spin text-ancestral-500" />
        <p className="mt-4 text-xs text-neutral-500">Loading your profile preferences workspace...</p>
      </div>
    );
  }

  const tabs = [
    { id: 'account', label: 'Vault Credentials', icon: Key },
    { id: 'privacy', label: 'Privacy Settings', icon: Shield },
    { id: 'notifications', label: 'Notifications Preferences', icon: Bell },
    { id: 'sessions', label: 'Device Login Sessions', icon: Settings },
    { id: 'families', label: 'Family Memberships', icon: Users },
    { id: 'appearance', label: 'Visual Appearance', icon: Palette },
    { id: 'help', label: 'Help & About Page', icon: HelpCircle }
  ];

  return (
    <div className="min-h-screen bg-ancestral-50/50 py-12 px-6 md:px-12 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-ancestral-100/30 blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gold-50/20 blur-3xl"></div>

      <div className="max-w-5xl mx-auto relative z-10 space-y-8">
        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-ancestral-800 transition duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-ancestral-650">
            <Settings className="w-5.5 h-5.5" />
            <h1 className="text-3xl font-display font-bold text-ancestral-900">
              Vault Settings
            </h1>
          </div>
          <p className="text-sm text-neutral-500 font-light">
            Deactivate accounts, reset passwords, manage memberships, toggle notifications, or customize styles.
          </p>
        </div>

        {/* Workspace Layout */}
        <div className="grid md:grid-cols-4 gap-8 items-start">
          {/* Sidebar */}
          <div className="md:col-span-1 bg-white border border-neutral-150 rounded-3xl p-3.5 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-semibold transition ${
                    activeTab === tab.id
                      ? 'bg-ancestral-50/15 text-ancestral-750 font-bold border-l-3 border-ancestral-500'
                      : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Panel content wrapper */}
          <div className="md:col-span-3 glass-panel p-6 md:p-8 rounded-3xl min-h-[50vh]">
            {activeTab === 'account' && <AccountSettingsPanel userDetails={userDetails} />}
            {activeTab === 'privacy' && <PrivacySettingsPanel />}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'sessions' && <SessionsPanel />}
            {activeTab === 'families' && <FamilyMembershipsPanel />}
            {activeTab === 'appearance' && <AppearancePanel userDetails={userDetails} />}
            {activeTab === 'help' && <HelpPage />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
