import { useState, useRef } from 'react';
import { Camera, Loader2, User } from 'lucide-react';
import api from '../../services/api.js';

export const PhotoUpload = ({ memberId, currentPhoto, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await api.post(`/members/${memberId}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data?.success) {
        onUploadSuccess(response.data.profilePhoto);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to upload photo to Firebase Storage.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative group w-28 h-28 rounded-full border-4 border-white shadow-lg overflow-hidden bg-neutral-100 flex items-center justify-center">
        {currentPhoto ? (
          <img
            src={currentPhoto}
            alt="Profile Avatar"
            className="w-full h-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <User className="w-12 h-12 text-neutral-300" />
        )}

        {/* Upload Overlay */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 bg-neutral-900/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition duration-200"
          type="button"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Camera className="w-5 h-5" />
              <span className="text-[10px] mt-1 font-medium">Change Photo</span>
            </>
          )}
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {error && <span className="text-[10px] text-red-500 text-center font-medium mt-1">{error}</span>}
    </div>
  );
};

export default PhotoUpload;
