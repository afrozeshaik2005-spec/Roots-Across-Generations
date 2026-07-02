import { Calendar, MapPin, Tag, Download, Trash2, X, FileText, EyeOff } from 'lucide-react';
import api from '../../services/api.js';

export const MemoryDetailPage = ({ memory, currentUserMemberId, isHistorian, onClose, onDeleteSuccess }) => {
  const { id, title, description, type, fileUrl, memoryDate, location, isPrivate, uploaderId, tags } = memory;

  const canDelete = uploaderId === currentUserMemberId || isHistorian;

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to archive and delete this family memory?')) return;

    try {
      const response = await api.delete(`/memories/${id}`);
      if (response.data?.success) {
        onDeleteSuccess();
        onClose();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete memory');
    }
  };

  const renderMedia = () => {
    switch (type) {
      case 'PHOTO':
        return (
          <img
            src={fileUrl}
            alt={title}
            className="w-full max-h-[60vh] object-contain rounded-2xl bg-neutral-900"
          />
        );
      case 'VIDEO':
        return (
          <video
            src={fileUrl}
            className="w-full max-h-[60vh] object-contain rounded-2xl bg-neutral-900"
            controls
            autoPlay
          />
        );
      case 'DOCUMENT':
        return (
          <div className="w-full min-h-[300px] border border-neutral-100 bg-neutral-50 rounded-2xl flex flex-col items-center justify-center space-y-4">
            <FileText className="w-16 h-16 text-gold-500" />
            <div className="text-center space-y-1">
              <span className="text-xs font-semibold text-neutral-700 block">Archived PDF / Document</span>
              <span className="text-[10px] text-neutral-400 font-light block">Attachment exists in secure storage</span>
            </div>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 forest-gradient text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </a>
          </div>
        );
      case 'STORY':
        return (
          <div className="w-full min-h-[250px] border border-neutral-100 bg-ancestral-50/10 rounded-2xl p-6 md:p-8 flex flex-col justify-between">
            <p className="text-sm text-neutral-600 leading-relaxed font-light whitespace-pre-line">
              {description}
            </p>
            <span className="text-[10px] text-ancestral-600 font-bold uppercase tracking-wider block mt-6">
              Archived Family Chronicle
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
          <div className="flex items-center gap-2">
            {isPrivate && (
              <span className="bg-neutral-900 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1">
                <EyeOff className="w-3 h-3" />
                <span>Private</span>
              </span>
            )}
            <h3 className="font-display font-bold text-base text-ancestral-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-200/50 rounded-lg text-neutral-500 transition duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable details */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Media box */}
          <div className="w-full flex items-center justify-center">
            {renderMedia()}
          </div>

          {/* Details & description info */}
          <div className="grid md:grid-cols-3 gap-6 pt-4 border-t border-neutral-100">
            <div className="md:col-span-2 space-y-4">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-neutral-400 font-light">
                {memoryDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-neutral-400" />
                    <span className="font-medium text-neutral-700">
                      {new Date(memoryDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                )}
                {location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-neutral-400" />
                    <span className="font-medium text-neutral-700">{location}</span>
                  </div>
                )}
              </div>

              {type !== 'STORY' && description && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Description</span>
                  <p className="text-xs text-neutral-500 font-light leading-relaxed whitespace-pre-line">
                    {description}
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar Tags */}
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Tagged Relatives</span>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {tags && tags.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 bg-neutral-50 border border-neutral-100 p-2 rounded-xl">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-200">
                        {t.member.profilePhoto ? (
                          <img src={t.member.profilePhoto} alt={t.member.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-[10px]">👤</span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-neutral-700 truncate">{t.member.fullName}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delete trigger */}
              {canDelete && (
                <div className="pt-4 border-t border-neutral-100">
                  <button
                    onClick={handleDelete}
                    className="w-full py-2.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Archive Memory</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryDetailPage;
