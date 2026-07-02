import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Mail, MapPin, CheckCircle, XCircle, Send, Loader2 } from 'lucide-react';
import api from '../../services/api.js';

const FIELD_OPTIONS = [
  { value: 'PHONE', label: 'Phone Number', icon: Phone },
  { value: 'EMAIL', label: 'Email Address', icon: Mail },
  { value: 'ADDRESS', label: 'Address / Location', icon: MapPin },
  { value: 'ALL', label: 'All Contact Details', icon: Send }
];

/**
 * ContactRequestModal
 *
 * Two modes:
 *  1. "request" — user selects fields and sends request
 *  2. "received" — owner sees request and can approve/reject
 *  3. "sent" — requester sees status of their sent request
 */
export const ContactRequestModal = ({ mode, request, ownerId, ownerName, familyId, onClose }) => {
  const queryClient = useQueryClient();
  const [selectedFields, setSelectedFields] = useState([]);

  // CREATE request mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/contact-requests', { ownerId, familyId, fields: selectedFields });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactRequestStatus', ownerId, familyId] });
      onClose();
    }
  });

  // APPROVE mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch(`/contact-requests/${request.id}/approve`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactRequests'] });
      onClose();
    }
  });

  // REJECT mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch(`/contact-requests/${request.id}/reject`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactRequests'] });
      onClose();
    }
  });

  const toggleField = (field) => {
    if (field === 'ALL') {
      setSelectedFields(['ALL']);
      return;
    }
    setSelectedFields(prev => {
      const withoutAll = prev.filter(f => f !== 'ALL');
      if (withoutAll.includes(field)) {
        return withoutAll.filter(f => f !== field);
      }
      return [...withoutAll, field];
    });
  };

  // ── REQUEST MODE ────────────────────────────────────────
  if (mode === 'request') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Request Contact Info</h3>
                <p className="text-xs text-neutral-500 mt-0.5">from {ownerName}</p>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-400 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {FIELD_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => toggleField(value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-medium transition duration-150 ${
                    selectedFields.includes(value)
                      ? 'border-ancestral-400 bg-ancestral-50 text-ancestral-800'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                  {selectedFields.includes(value) && <CheckCircle className="w-4 h-4 ml-auto text-ancestral-500" />}
                </button>
              ))}
            </div>

            <button
              onClick={() => createMutation.mutate()}
              disabled={!selectedFields.length || createMutation.isPending}
              className="w-full py-2.5 bg-ancestral-600 hover:bg-ancestral-700 disabled:bg-neutral-300 text-white rounded-xl text-xs font-semibold transition duration-200 flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{createMutation.isPending ? 'Sending...' : 'Send Request'}</span>
            </button>

            {createMutation.isError && (
              <p className="text-xs text-red-500 text-center">{createMutation.error?.response?.data?.error?.message || 'Failed to send request'}</p>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── RECEIVED MODE (owner approves/rejects) ──────────────
  if (mode === 'received') {
    const fieldLabels = request.fields.map(f => f === 'ALL' ? 'all details' : f.toLowerCase()).join(', ');
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Contact Info Request</h3>
                <p className="text-xs text-neutral-500 mt-0.5">from {request.requester?.fullName || 'Unknown'}</p>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-400 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-neutral-50 rounded-xl p-4 text-xs text-neutral-600">
              <p className="font-medium text-neutral-800 mb-1">Requested fields:</p>
              <p className="capitalize">{fieldLabels}</p>
            </div>

            {request.status === 'PENDING' ? (
              <div className="flex gap-3">
                <button
                  onClick={() => rejectMutation.mutate()}
                  disabled={rejectMutation.isPending}
                  className="flex-1 py-2.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-semibold transition duration-200 flex items-center justify-center gap-1.5"
                >
                  {rejectMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  Reject
                </button>
                <button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="flex-1 py-2.5 bg-ancestral-600 hover:bg-ancestral-700 text-white rounded-xl text-xs font-semibold transition duration-200 flex items-center justify-center gap-1.5"
                >
                  {approveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Approve
                </button>
              </div>
            ) : (
              <p className="text-xs text-center text-neutral-400">This request has already been {request.status.toLowerCase()}.</p>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── SHARED DATA MODE (requester sees approved data) ─────
  if (mode === 'shared') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Contact Info Shared</h3>
                <p className="text-xs text-neutral-500 mt-0.5">by {request.owner?.fullName || ownerName}</p>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-400 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {request.sharedPhone && (
                <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                  <Phone className="w-4 h-4 text-ancestral-500 shrink-0" />
                  <span className="text-xs text-neutral-800 font-medium">{request.sharedPhone}</span>
                </div>
              )}
              {request.sharedEmail && (
                <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                  <Mail className="w-4 h-4 text-ancestral-500 shrink-0" />
                  <span className="text-xs text-neutral-800 font-medium">{request.sharedEmail}</span>
                </div>
              )}
              {request.sharedAddress && (
                <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                  <MapPin className="w-4 h-4 text-ancestral-500 shrink-0" />
                  <span className="text-xs text-neutral-800 font-medium">{request.sharedAddress}</span>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition duration-200"
            >
              Done
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
};

export default ContactRequestModal;
