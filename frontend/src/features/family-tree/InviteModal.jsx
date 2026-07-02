import { useState, useEffect } from 'react';
import { X, Copy, Check, Download, Loader2, Link2 } from 'lucide-react';
import api from '../../services/api.js';

export const InviteModal = ({ familyId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteData, setInviteData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchInviteInfo = async () => {
      try {
        const res = await api.get(`/families/${familyId}/invite-info`);
        if (res.data?.success) {
          setInviteData(res.data);
        } else {
          setError('Failed to fetch invitation details.');
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Failed to load invite info.');
      } finally {
        setLoading(false);
      }
    };

    if (familyId) {
      fetchInviteInfo();
    }
  }, [familyId]);

  const handleCopyLink = () => {
    if (!inviteData?.shareableLink) return;
    navigator.clipboard.writeText(inviteData.shareableLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = async () => {
    if (!inviteData?.qrCodeUrl) return;
    try {
      const response = await fetch(inviteData.qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${inviteData.familyName || 'family'}_join_qr.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download QR code', err);
      // Fallback: open in new tab
      window.open(inviteData.qrCodeUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden transform scale-100 transition-transform">
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
          <div>
            <h3 className="font-display font-bold text-lg text-ancestral-900">Invite Relatives</h3>
            <p className="text-xs text-neutral-400 font-light mt-0.5">
              Share the tree with other generation branches
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-200/50 rounded-lg text-neutral-500 transition duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-ancestral-500" />
              <p className="text-xs text-neutral-400">Fetching secure invite link...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-xs rounded-2xl text-center">
              {error}
            </div>
          ) : inviteData ? (
            <>
              {/* Family details */}
              <div className="text-center space-y-1">
                <h4 className="font-display font-bold text-base text-ancestral-800">
                  {inviteData.familyName}
                </h4>
                <span className="inline-block bg-gold-50 text-gold-700 text-[10px] font-mono tracking-wider px-2 py-0.5 rounded border border-gold-200/40">
                  ID: {inviteData.readableFamilyId}
                </span>
              </div>

              {/* Shareable Link Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Shareable Join Link
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 flex items-center gap-2 overflow-hidden">
                    <Link2 className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span className="text-xs text-neutral-600 truncate select-all">
                      {inviteData.shareableLink}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className={`px-4 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold shadow-sm transition duration-200 ${
                      copied
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* QR Code */}
              {inviteData.qrCodeUrl && (
                <div className="flex flex-col items-center space-y-4 pt-2">
                  <div className="p-3 bg-white border border-neutral-200/80 rounded-2xl shadow-inner">
                    <img
                      src={inviteData.qrCodeUrl}
                      alt="Join QR Code"
                      className="w-40 h-40 object-contain"
                    />
                  </div>
                  <button
                    onClick={handleDownloadQR}
                    className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-850 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow transition duration-200"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download QR Code</span>
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default InviteModal;
