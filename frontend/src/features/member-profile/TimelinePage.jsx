import { useState } from 'react';
import { Calendar, Trash2, Plus, X, Award, Briefcase, Heart, BookOpen, GraduationCap, Milestone, Loader2 } from 'lucide-react';
import api from '../../services/api.js';

export const TimelinePage = ({ memberId, timeline, canEdit, onRefresh }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventDate: '',
    iconType: 'OTHER'
  });

  const iconMap = {
    BORN: Milestone,
    EDUCATION: BookOpen,
    GRADUATION: GraduationCap,
    CAREER: Briefcase,
    MARRIAGE: Heart,
    RETIREMENT: Award,
    DEATH: Milestone,
    OTHER: Calendar
  };

  const iconColors = {
    BORN: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    EDUCATION: 'bg-blue-100 text-blue-700 border-blue-200',
    GRADUATION: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    CAREER: 'bg-sky-100 text-sky-700 border-sky-200',
    MARRIAGE: 'bg-rose-100 text-rose-700 border-rose-200',
    RETIREMENT: 'bg-amber-100 text-amber-700 border-amber-200',
    DEATH: 'bg-neutral-100 text-neutral-700 border-neutral-200',
    OTHER: 'bg-neutral-50 text-neutral-500 border-neutral-100'
  };

  const handleInputChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.eventDate) {
      setError('Title and Event Date are required');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post(`/members/${memberId}/timeline`, formData);
      if (response.data?.success) {
        onRefresh();
        setShowAddForm(false);
        setFormData({ title: '', description: '', eventDate: '', iconType: 'OTHER' });
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to add timeline event.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to remove this milestone event?')) return;

    try {
      const response = await api.delete(`/members/${memberId}/timeline/${eventId}`);
      if (response.data?.success) {
        onRefresh();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete timeline event');
    }
  };

  return (
    <div className="glass-panel p-6 rounded-3xl space-y-6">
      <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
        <h3 className="font-display font-bold text-base text-ancestral-900">Life Milestones</h3>
        {canEdit && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-3 py-1.5 border border-ancestral-200 text-ancestral-600 hover:bg-ancestral-50 rounded-lg text-xs font-semibold transition"
          >
            {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{showAddForm ? 'Close Form' : 'Add Event'}</span>
          </button>
        )}
      </div>

      {/* Add Custom Event Form */}
      {showAddForm && (
        <form onSubmit={handleAddEvent} className="p-4 border border-neutral-100 bg-neutral-50/50 rounded-2xl space-y-4">
          <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-wide">New Timeline Milestone</h4>
          {error && <p className="text-xs text-red-500">{error}</p>}
          
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase block">Title</label>
              <input
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                type="text"
                placeholder="First Career Step"
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase block">Milestone Date</label>
                <input
                  name="eventDate"
                  value={formData.eventDate}
                  onChange={handleInputChange}
                  type="date"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none text-neutral-500 bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase block">Icon Category</label>
                <select
                  name="iconType"
                  value={formData.iconType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none text-neutral-500 bg-white"
                >
                  <option value="EDUCATION">Education</option>
                  <option value="GRADUATION">Graduation</option>
                  <option value="CAREER">Career</option>
                  <option value="MARRIAGE">Marriage</option>
                  <option value="RETIREMENT">Retirement</option>
                  <option value="OTHER">Other Milestone</option>
                </select>
              </div>
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase block">Description / Details</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={2}
                placeholder="Provide summaries, stories, or achievements..."
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              disabled={submitting}
              type="submit"
              className="px-4 py-2 forest-gradient text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition"
            >
              {submitting && <Loader2 className="w-3 animate-spin" />}
              <span>Save Milestone</span>
            </button>
          </div>
        </form>
      )}

      {/* Vertical Timeline */}
      {timeline && timeline.length > 0 ? (
        <div className="relative pl-6 border-l border-neutral-100 space-y-8 py-2">
          {timeline.map((event) => {
            const Icon = iconMap[event.iconType || 'OTHER'] || Calendar;
            const colors = iconColors[event.iconType || 'OTHER'] || iconColors.OTHER;

            return (
              <div key={event.id} className="relative group">
                {/* Bullet Node */}
                <div className={`absolute left-[-35px] top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-sm z-10 transition duration-300 group-hover:scale-105 ${colors}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>

                {/* Content Box */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gold-600 uppercase tracking-wider">
                      {new Date(event.eventDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    {canEdit && event.isCustom && (
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-600 rounded transition duration-200"
                        title="Delete Milestone"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <h4 className="font-display font-semibold text-neutral-800 text-sm">{event.title}</h4>
                  {event.description && (
                    <p className="text-xs text-neutral-400 font-light leading-relaxed max-w-lg">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-neutral-400 font-light text-center py-6">
          No chronological milestones set.
        </p>
      )}
    </div>
  );
};

export default TimelinePage;
