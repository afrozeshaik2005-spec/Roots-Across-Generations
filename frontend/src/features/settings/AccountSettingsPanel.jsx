import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ShieldCheck, Mail, Lock, User, Trash2 } from 'lucide-react';
import api from '../../services/api.js';

export const AccountSettingsPanel = ({ userDetails }) => {
  const queryClient = useQueryClient();

  const [name, setName] = useState(userDetails?.familyMember?.fullName || '');
  const [email, setEmail] = useState(userDetails?.email || '');
  const [password, setPassword] = useState(''); // password confirm for email change
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // 1. Update account details mutation
  const updateDetailsMutation = useMutation({
    mutationFn: async (payload) => {
      await api.patch('/settings/account', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userAccountDetails'] });
      setPassword('');
      alert('Account details successfully updated!');
    },
    onError: (err) => {
      alert(err.response?.data?.error?.message || 'Failed to update details');
    }
  });

  // 2. Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (payload) => {
      await api.patch('/settings/password', payload);
    },
    onSuccess: () => {
      setOldPassword('');
      setNewPassword('');
      alert('Password changed successfully!');
    },
    onError: (err) => {
      alert(err.response?.data?.error?.message || 'Failed to change password');
    }
  });

  // 3. Soft delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/settings/account');
    },
    onSuccess: () => {
      alert('Your account has been deleted. Redirecting to home...');
      window.location.href = '/login';
    }
  });

  const handleUpdate = (e) => {
    e.preventDefault();
    const payload = {};
    if (name !== userDetails?.familyMember?.fullName) payload.name = name;
    if (email !== userDetails?.email) {
      payload.email = email;
      payload.password = password; // Confirm password
    }

    if (Object.keys(payload).length === 0) {
      alert('No details changed.');
      return;
    }

    updateDetailsMutation.mutate(payload);
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) return;
    changePasswordMutation.mutate({ oldPassword, newPassword });
  };

  const handleDeleteAccount = () => {
    if (!confirm('WARNING: Deleting your account will permanently log you out and deactivate your access profiles. This action is irreversible. Are you absolutely sure?')) return;
    deleteAccountMutation.mutate();
  };

  return (
    <div className="space-y-8 font-sans max-w-lg">
      {/* Account Details Form */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-sm text-neutral-800 flex items-center gap-1.5">
          <User className="w-4 h-4 text-ancestral-650" />
          <span>Personal Credentials</span>
        </h3>
        
        <form onSubmit={handleUpdate} className="space-y-3 bg-white p-5 border border-neutral-150 rounded-3xl">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-neutral-200 focus:border-ancestral-300 rounded-xl focus:outline-none text-xs bg-neutral-50/10 focus:bg-white transition"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-neutral-200 focus:border-ancestral-300 rounded-xl focus:outline-none text-xs bg-neutral-50/10 focus:bg-white transition"
              required
            />
          </div>

          {email !== userDetails?.email && userDetails?.googleId === null && (
            <div className="space-y-1 p-3 bg-amber-50/30 border border-amber-100/60 rounded-xl">
              <label className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block">
                Confirm Password to change email
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Current password..."
                className="w-full px-3.5 py-2.5 border border-amber-200 focus:border-amber-400 rounded-xl focus:outline-none text-xs bg-white"
                required
              />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={updateDetailsMutation.isPending}
              className="px-5 py-2.5 forest-gradient hover:bg-ancestral-600 text-white rounded-xl text-xs font-semibold shadow hover:shadow-md transition"
            >
              {updateDetailsMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Details'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Form (Local Accounts only) */}
      {userDetails?.googleId === null && (
        <div className="space-y-4">
          <h3 className="font-display font-bold text-sm text-neutral-800 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-ancestral-650" />
            <span>Reset Password</span>
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-3 bg-white p-5 border border-neutral-150 rounded-3xl">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">Current Password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-neutral-200 focus:border-ancestral-300 rounded-xl focus:outline-none text-xs bg-neutral-50/10 focus:bg-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-neutral-200 focus:border-ancestral-300 rounded-xl focus:outline-none text-xs bg-neutral-50/10 focus:bg-white"
                required
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="px-5 py-2.5 forest-gradient hover:bg-ancestral-600 text-white rounded-xl text-xs font-semibold shadow hover:shadow-md transition"
              >
                {changePasswordMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Connected Accounts */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-sm text-neutral-800 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-ancestral-650" />
          <span>Connected Accounts</span>
        </h3>

        <div className="bg-white p-4 border border-neutral-150 rounded-3xl flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-neutral-800 block">Google OAuth Provider</span>
            <span className="text-[10px] text-neutral-400 font-light mt-0.5">
              {userDetails?.googleId ? 'Connected to Identity Provider' : 'Not connected'}
            </span>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold ${userDetails?.googleId ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-400'}`}>
            {userDetails?.googleId ? 'Active' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="space-y-4 pt-4 border-t border-neutral-200">
        <h3 className="font-display font-bold text-sm text-red-600 flex items-center gap-1.5">
          <Trash2 className="w-4 h-4" />
          <span>Deactivate Vault Account</span>
        </h3>

        <div className="bg-red-50/30 border border-red-150/65 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-neutral-800 block">Soft-delete my profile account</span>
            <p className="text-[10px] text-neutral-400 font-light leading-normal max-w-sm">
              Deactivating will disconnect active sessions and soft-delete user records. Relatives will still see family tree entries.
            </p>
          </div>
          <button
            onClick={handleDeleteAccount}
            className="px-4 py-2 border border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 rounded-xl text-xs font-semibold transition"
          >
            Deactivate
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsPanel;
