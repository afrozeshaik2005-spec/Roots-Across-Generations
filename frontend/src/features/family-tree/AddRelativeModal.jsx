import { useState } from 'react';
import { X, Loader2, Info } from 'lucide-react';
import api from '../../services/api.js';

export const AddRelativeModal = ({ familyId, relative, onClose, onSuccess }) => {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    fullName: '',
    nickname: '',
    dob: '',
    birthPlace: '',
    birthVillageCity: '',
    gender: '',
    bloodGroup: '',
    occupation: '',
    education: '',
    phone: '',
    email: '',
    isLiving: true,
    deathDate: '',
    causeOfDeath: '',
    bio: '',
    relationshipType: 'FATHER' // how relative is related to the new member
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName) {
      setError('Full Name is required');
      return;
    }

    if (!formData.dob) {
      setError('Date of Birth is required');
      return;
    }

    if (!formData.gender) {
      setError('Gender is required');
      return;
    }

    if (!formData.phone) {
      setError('Phone is required');
      return;
    }

    if (formData.dob && formData.dob > today) {
      setError('Date of birth cannot be in the future');
      return;
    }

    if (!formData.isLiving && formData.deathDate) {
      if (formData.deathDate > today) {
        setError('Date of death cannot be in the future');
        return;
      }
      if (formData.dob && formData.deathDate < formData.dob) {
        setError('Date of death cannot be before date of birth');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        gender: formData.gender || undefined,
        relativeId: relative.id,
        dob: formData.dob ? new Date(formData.dob).toISOString() : undefined,
        deathDate: !formData.isLiving && formData.deathDate ? new Date(formData.deathDate).toISOString() : undefined,
      };

      const response = await api.post(`/families/${familyId}/members`, payload);
      if (response.data?.success) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to add relative node.');
    } finally {
      setSubmitting(false);
    }
  };

  const relationshipOptions = [
    { value: 'FATHER', label: `Father of ${relative.fullName}` },
    { value: 'MOTHER', label: `Mother of ${relative.fullName}` },
    { value: 'SON', label: `Son of ${relative.fullName}` },
    { value: 'DAUGHTER', label: `Daughter of ${relative.fullName}` },
    { value: 'BROTHER', label: `Brother of ${relative.fullName}` },
    { value: 'SISTER', label: `Sister of ${relative.fullName}` },
    { value: 'HUSBAND', label: `Husband of ${relative.fullName}` },
    { value: 'WIFE', label: `Wife of ${relative.fullName}` },
    { value: 'STEP_FATHER', label: `Step-Father of ${relative.fullName}` },
    { value: 'STEP_MOTHER', label: `Step-Mother of ${relative.fullName}` },
    { value: 'STEP_SON', label: `Step-Son of ${relative.fullName}` },
    { value: 'STEP_DAUGHTER', label: `Step-Daughter of ${relative.fullName}` },
    { value: 'ADOPTED_CHILD', label: `Adopted Child of ${relative.fullName}` },
    { value: 'GUARDIAN', label: `Guardian of ${relative.fullName}` }
  ];

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
          <div>
            <h3 className="font-display font-bold text-lg text-ancestral-900">Add New Relative</h3>
            <p className="text-xs text-neutral-400 font-light mt-0.5">
              Add and link a member relative to <span className="font-semibold text-ancestral-600">{relative.fullName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-200/50 rounded-lg text-neutral-500 transition duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-1.5">
            <Info className="w-4.5 h-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Relationship settings */}
          <div className="bg-ancestral-50/30 p-4 border border-neutral-100 rounded-2xl space-y-3.5">
            <label className="text-xs font-semibold text-ancestral-800 uppercase tracking-wider block">
              Relationship Connection
            </label>
            <select
              name="relationshipType"
              value={formData.relationshipType}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 text-sm text-neutral-600 bg-white"
            >
              {relationshipOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Profile fields */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                Full Name
              </label>
              <input
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                type="text"
                placeholder="Jane Smith"
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-sm bg-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-sm text-neutral-500 bg-white"
              >
                <option value="">Select Gender...</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                Nickname / Call Sign
              </label>
              <input
                name="nickname"
                value={formData.nickname}
                onChange={handleInputChange}
                type="text"
                placeholder="Janey"
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-sm bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                Date of Birth
              </label>
              <input
                name="dob"
                value={formData.dob}
                onChange={handleInputChange}
                type="date"
                max={today}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-sm text-neutral-500 bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                  Blood Group
                </label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-sm text-neutral-500 bg-white"
                >
                  <option value="">Unknown</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                  Occupation
                </label>
                <input
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleInputChange}
                  type="text"
                  placeholder="Writer"
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-sm bg-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                Birth Country / City
              </label>
              <input
                name="birthPlace"
                value={formData.birthPlace}
                onChange={handleInputChange}
                type="text"
                placeholder="Dublin, Ireland"
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-sm bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                Birth Village / Town
              </label>
              <input
                name="birthVillageCity"
                value={formData.birthVillageCity}
                onChange={handleInputChange}
                type="text"
                placeholder="Howth"
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-sm bg-white"
              />
            </div>

            <div className="space-y-1 col-span-2">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                Biography / Details
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                rows={3}
                placeholder="Add life summaries, stories, or achievements..."
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-sm bg-white"
              />
            </div>

            {/* Living status toggle */}
            <div className="col-span-2 py-2 flex items-center gap-3">
              <input
                name="isLiving"
                checked={formData.isLiving}
                onChange={handleInputChange}
                type="checkbox"
                id="isLivingCheckbox"
                className="w-4.5 h-4.5 text-ancestral-500 border-neutral-300 rounded focus:ring-ancestral-400"
              />
              <label htmlFor="isLivingCheckbox" className="text-xs font-semibold text-neutral-700 select-none">
                This person is currently living
              </label>
            </div>

            {/* Deceased details */}
            {!formData.isLiving && (
              <div className="col-span-2 grid md:grid-cols-2 gap-4 p-4 border border-neutral-100 bg-neutral-50/50 rounded-2xl">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                    Date of Death
                  </label>
                  <input
                    name="deathDate"
                    value={formData.deathDate}
                    onChange={handleInputChange}
                    type="date"
                    max={today}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-sm text-neutral-500 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                    Cause of Death
                  </label>
                  <input
                    name="causeOfDeath"
                    value={formData.causeOfDeath}
                    onChange={handleInputChange}
                    type="text"
                    placeholder="Old age"
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-sm bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <button
              onClick={onClose}
              type="button"
              className="px-6 py-3 border border-neutral-200 text-neutral-500 hover:bg-neutral-50 text-sm font-medium rounded-xl transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 forest-gradient hover:bg-ancestral-600 text-white text-sm font-medium rounded-xl flex items-center gap-1.5 shadow transition duration-200"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Add Node</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRelativeModal;
