import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api, { setAccessToken } from './services/api.js';
import { useAuth } from './context/AuthContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AuthCallback from './pages/AuthCallback.jsx';
import CreateFamily from './pages/CreateFamily.jsx';
import ImportFamily from './pages/ImportFamily.jsx';
import JoinFamily from './pages/JoinFamily.jsx';
import FamilyTree from './features/family-tree/FamilyTree.jsx';
import JoinRequestsPage from './features/join-requests/JoinRequestsPage.jsx';
import ContactRequestsPage from './features/contact-requests/ContactRequestsPage.jsx';
import MemberProfile from './features/member-profile/MemberProfile.jsx';
import MemoriesPage from './features/memories/MemoriesPage.jsx';
import RelationshipExplorer from './features/family-tree/RelationshipExplorer.jsx';
import SearchPage from './features/search/SearchPage.jsx';
import NotificationsPage from './features/notifications/NotificationsPage.jsx';
import HistorianDashboard from './features/admin/HistorianDashboard.jsx';
import MemberManagementPage from './features/admin/MemberManagementPage.jsx';
import RelationshipEditorPage from './features/admin/RelationshipEditorPage.jsx';
import AuditLogPage from './features/admin/AuditLogPage.jsx';
import FamilySettingsPage from './features/admin/FamilySettingsPage.jsx';
import MessagesPage from './features/messaging/MessagesPage.jsx';
import SettingsPage from './features/settings/SettingsPage.jsx';
import NotFound from './pages/NotFound.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

/**
 * RootRedirector — checks auth and redirects to appropriate landing page.
 * Must be used inside AuthProvider context.
 */
function RootRedirector() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-ancestral-50">
        <div className="relative flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-ancestral-500"></div>
          <div className="animate-spin rounded-full h-12 w-12 border-r-2 border-l-2 border-gold-400 absolute"></div>
          <span className="absolute text-xl">🕊</span>
        </div>
        <h2 className="mt-6 font-display font-medium text-ancestral-700 tracking-wide">
          Connecting to Ancestry...
        </h2>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <Routes>
              {/* Root URL — smart redirect based on auth status */}
              <Route path="/" element={<RootRedirector />} />

              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/join/:familyId" element={<JoinFamily />} />
              <Route path="/member/:memberId" element={<MemberProfile />} />
              <Route path="/family/:familyId/tree" element={<FamilyTree />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/family/create" element={<CreateFamily />} />
                <Route path="/family/import" element={<ImportFamily />} />
                <Route path="/family/:familyId/join-requests" element={<JoinRequestsPage />} />
                <Route path="/family/:familyId/contact-requests" element={<ContactRequestsPage />} />
                <Route path="/family/:familyId/memories" element={<MemoriesPage />} />
                <Route path="/family/:familyId/relationships" element={<RelationshipExplorer />} />
                <Route path="/family/:familyId/search" element={<SearchPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/family/:familyId/messages" element={<MessagesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                
                {/* Admin / Historian routes */}
                <Route path="/family/:familyId/admin" element={<HistorianDashboard />} />
                <Route path="/family/:familyId/admin/members" element={<MemberManagementPage />} />
                <Route path="/family/:familyId/admin/relationships" element={<RelationshipEditorPage />} />
                <Route path="/family/:familyId/admin/audit-log" element={<AuditLogPage />} />
                <Route path="/family/:familyId/admin/settings" element={<FamilySettingsPage />} />

                <Route path="/dashboard" element={<Dashboard />} />
              </Route>

              {/* Fallback NotFound Page */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
