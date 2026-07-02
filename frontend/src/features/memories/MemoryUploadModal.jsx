import { useState } from 'react';
import { X, Loader2, Info, UploadCloud, Tag } from 'lucide-react';
import api from '../../services/api.js';

export const MemoryUploadModal = ({ familyId, members, onClose, onSuccess }) => {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    memoryDate: '',
    location: '',
    type: 'PHOTO',
    isPrivate: false,
    taggedMemberIds: []
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleTagToggle = (memberId) => {
    setFormData(prev => {
      const alreadyTagged = prev.taggedMemberIds.includes(memberId);
      const nextTags = alreadyTagged
        ? prev.taggedMemberIds.filter(id => id !== memberId)
        : [...prev.taggedMemberIds, memberId];
      return { ...prev, taggedMemberIds: nextTags };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title) {
      setError('Title is required');
      return;
    }

    if (formData.type !== 'STORY' && !file) {
      setError('Attachment file is required');
      return;
    }

    setSubmitting(true);

    const data = new FormData();
    data.append('familyId', familyId);
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('memoryDate', formData.memoryDate);
    data.append('location', formData.location);
    data.append('type', formData.type);
    data.append('isPrivate', formData.isPrivate);
    data.append('taggedMemberIds', JSON.stringify(formData.taggedMemberIds));
    if (file) {
      data.append('file', file);
    }

    try {
      const response = await api.post('/memories', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data?.success) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to archive memory.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
          <div>
            <h3 className="font-display font-bold text-lg text-ancestral-900">Archive a Memory</h3>
            <p className="text-xs text-neutral-400 font-light mt-0.5">
              Upload photos, videos, files, or log written family history
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                Memory Title
              </label>
              <input
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                type="text"
                placeholder="Summer Wedding in Dublin"
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-sm bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                  Archive Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-sm text-neutral-500 bg-white"
                >
                  <option value="PHOTO">Photo Album</option>
                  <option value="VIDEO">Video Recording</option>
                  <option value="DOCUMENT">Document (PDF/DOC)</option>
                  <option value="STORY">Written Story</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                  Date of Event
                </label>
                <input
                  name="memoryDate"
                  value={formData.memoryDate}
                  onChange={handleInputChange}
                  type="date"
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-sm text-neutral-500 bg-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                Location
              </label>
              <input
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                type="text"
                placeholder="Dublin, Ireland"
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-sm bg-white"
              />
            </div>

            {/* Privacy toggle */}
            <div className="flex items-center justify-between p-4 border border-neutral-100 bg-neutral-50/30 rounded-2xl md:mt-2">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-neutral-700 block">Mark Private</span>
                <span className="text-[10px] text-neutral-400 font-light block">
                  Only tagged members & historians will see it
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
                className={`w-10 h-5.5 rounded-full relative transition duration-300 focus:outline-none ${
                  formData.isPrivate ? 'bg-ancestral-600' : 'bg-neutral-200'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full bg-white absolute top-0.5 shadow-sm transition duration-300 ${
                    formData.isPrivate ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* File Upload (Required if type !== STORY) */}
            {formData.type !== 'STORY' && (
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                  Memory File
                </label>
                <div className="border-2 border-dashed border-neutral-200 hover:border-ancestral-300 bg-neutral-50/50 rounded-2xl p-6 text-center cursor-pointer relative group transition">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept={formData.type === 'PHOTO' ? 'image/*' : formData.type === 'VIDEO' ? 'video/*' : '.pdf,.doc,.docx'}
                  />
                  <div className="space-y-2">
                    <UploadCloud className="w-8 h-8 mx-auto text-neutral-400 group-hover:text-ancestral-600 transition" />
                    <p className="text-xs text-neutral-500 font-light">
                      {file ? (
                        <span className="font-semibold text-ancestral-700">{file.name}</span>
                      ) : (
                        <span>Drag and drop or click to select memory attachment</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                Story Text / Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                placeholder={formData.type === 'STORY' ? 'Write the family legend or custom story memory details here...' : 'Optional description details...'}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none text-sm bg-white"
                required={formData.type === 'STORY'}
              />
            </div>

            {/* Member tag selector */}
            <div className="col-span-2 space-y-2">
              <div className="flex items-center gap-1 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                <Tag className="w-3.5 h-3.5" />
                <span>Tag Family Members</span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 border border-neutral-100 rounded-2xl bg-neutral-50/20">
                {members.map((m) => {
                  const isTagged = formData.taggedMemberIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleTagToggle(m.id)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                        isTagged
                          ? 'bg-ancestral-550 border-ancestral-600 text-white shadow-sm'
                          : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      {m.fullName}
                    </button>
                  );
                })}
              </div>
            </div>
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
              <span>Archive Memory</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemoryUploadModal;
