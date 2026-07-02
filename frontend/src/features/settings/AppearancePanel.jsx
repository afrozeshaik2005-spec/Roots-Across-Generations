import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Palette } from 'lucide-react';
import api from '../../services/api.js';

export const AppearancePanel = ({ userDetails }) => {
  const queryClient = useQueryClient();

  const [theme, setTheme] = useState(userDetails?.theme || 'light');
  const [language, setLanguage] = useState(userDetails?.language || 'en');
  const [dateFormat, setDateFormat] = useState(userDetails?.dateFormat || 'DD/MM/YYYY');

  // Save preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.patch('/settings/preferences', payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['userAccountDetails'] });
      // Apply theme to document element
      if (data.user?.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      alert('Preferences successfully updated!');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    savePreferencesMutation.mutate({ theme, language, dateFormat });
  };

  return (
    <div className="space-y-6 font-sans max-w-lg">
      <div className="border-b border-neutral-100 pb-4">
        <h3 className="font-display font-bold text-sm text-neutral-800 flex items-center gap-1.5">
          <Palette className="w-4.5 h-4.5 text-ancestral-650" />
          <span>Appearance & Preferences</span>
        </h3>
        <p className="text-[10px] text-neutral-400 font-light mt-0.5">
          Customize your application theme, display language, and chronological formats
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-5 border border-neutral-150 rounded-3xl">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">Visual Theme</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-neutral-200 focus:border-ancestral-300 rounded-xl focus:outline-none text-xs bg-white text-neutral-600"
          >
            <option value="light">Light Mode</option>
            <option value="dark">Dark Mode</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">Display Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-neutral-200 focus:border-ancestral-300 rounded-xl focus:outline-none text-xs bg-white text-neutral-600"
          >
            <option value="en">English (US)</option>
            <option value="es">Español</option>
            <option value="te">Telugu</option>
            <option value="hi">Hindi</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">Date Formatting</label>
          <select
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-neutral-200 focus:border-ancestral-300 rounded-xl focus:outline-none text-xs bg-white text-neutral-600"
          >
            <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 29/06/2026)</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 06/29/2026)</option>
          </select>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={savePreferencesMutation.isPending}
            className="px-5 py-2.5 forest-gradient hover:bg-ancestral-600 text-white rounded-xl text-xs font-semibold shadow hover:shadow-md transition"
          >
            {savePreferencesMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AppearancePanel;
