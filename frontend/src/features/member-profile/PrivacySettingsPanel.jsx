import { useState } from 'react';
import { Shield, Loader2, Check } from 'lucide-react';
import api from '../../services/api.js';

export const PrivacySettingsPanel = ({ memberId, initialPrivacy }) => {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [settings, setSettings] = useState({
    hidePhone: initialPrivacy?.hidePhone || false,
    hideEmail: initialPrivacy?.hideEmail || false,
    hideDob: initialPrivacy?.hideDob || false,
    hideOccupation: initialPrivacy?.hideOccupation || false,
    hidePhotos: initialPrivacy?.hidePhotos || false
  });

  const handleToggle = async (field) => {
    const nextVal = !settings[field];
    setSettings(prev => ({ ...prev, [field]: nextVal }));
    setSuccess(false);

    setSaving(true);
    try {
      const payload = {
        ...settings,
        [field]: nextVal
      };
      await api.patch(`/members/${memberId}/privacy`, payload);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to update privacy controls:', err);
      // rollback
      setSettings(prev => ({ ...prev, [field]: !nextVal }));
    } finally {
      setSaving(false);
    }
  };

  const options = [
    { key: 'hidePhone', label: 'Hide Phone Number', description: 'Restricts display to family members only.' },
    { key: 'hideEmail', label: 'Hide Email Address', description: 'Restricts email visibility on your tree profile.' },
    { key: 'hideDob', label: 'Hide Date of Birth', description: 'Filters out exact birth days, showing only your birth year.' },
    { key: 'hideOccupation', label: 'Hide Occupation', description: 'Hides career and professional titles.' },
    { key: 'hidePhotos', label: 'Hide Portrait Photos', description: 'Hides profile photo avatars from tree view.' }
  ];

  return (
    <div className="glass-panel p-6 rounded-3xl space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
        <div className="flex items-center gap-2 text-ancestral-700">
          <Shield className="w-5 h-5" />
          <h3 className="font-display font-bold text-base text-ancestral-900">Privacy Exclusions</h3>
        </div>
        <div className="flex items-center gap-1.5 min-h-[20px]">
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-ancestral-500" />}
          {success && (
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>Saved Settings</span>
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {options.map((opt) => {
          const isActive = settings[opt.key];
          return (
            <div key={opt.key} className="flex justify-between items-center py-1">
              <div className="space-y-0.5 max-w-[80%]">
                <span className="text-xs font-semibold text-neutral-800 block">{opt.label}</span>
                <span className="text-[10px] text-neutral-400 font-light leading-normal block">
                  {opt.description}
                </span>
              </div>

              {/* Custom Toggle Switch */}
              <button
                onClick={() => handleToggle(opt.key)}
                disabled={saving}
                className={`w-10 h-5.5 rounded-full relative transition duration-300 focus:outline-none ${
                  isActive ? 'bg-ancestral-600' : 'bg-neutral-200'
                }`}
                type="button"
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full bg-white absolute top-0.5 shadow-sm transition duration-300 ${
                    isActive ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PrivacySettingsPanel;
