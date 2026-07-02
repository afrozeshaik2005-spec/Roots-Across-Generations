import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ArrowLeft, ShieldAlert, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import api from '../../services/api.js';

export const AuditLogPage = () => {
  const { familyId } = useParams();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const limit = 10;

  // 1. Fetch paginated audit logs
  const { data, isLoading } = useQuery({
    queryKey: ['adminAuditLog', familyId, page],
    queryFn: async () => {
      const response = await api.get(`/admin/audit-log?familyId=${familyId}&page=${page}&limit=${limit}`);
      return response.data;
    },
    enabled: !!familyId
  });

  const logs = data?.logs || [];
  const pagination = data?.pagination || { total: 0, pages: 1 };

  const formatDetails = (log) => {
    try {
      const details = JSON.parse(log.details);
      if (details.memberName) {
        return `Member: ${details.memberName}`;
      }
      if (details.appointedHistorianName) {
        return `Appointed Historian: ${details.appointedHistorianName}`;
      }
      if (details.type) {
        return `Type: ${details.type}`;
      }
      if (details.updatedFamilySettings) {
        return 'Updated Family configurations settings';
      }
      return log.details;
    } catch (e) {
      return log.details || 'No additional details';
    }
  };

  return (
    <div className="min-h-screen bg-ancestral-50/50 py-12 px-6 md:px-12 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-ancestral-100/30 blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gold-50/20 blur-3xl"></div>

      <div className="max-w-4xl mx-auto relative z-10 space-y-8">
        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate(`/family/${familyId}/admin`)}
            className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-ancestral-800 transition duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Workspace</span>
          </button>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-ancestral-650">
            <ShieldAlert className="w-5.5 h-5.5" />
            <h1 className="text-3xl font-display font-bold text-ancestral-900">
              Audit Logs
            </h1>
          </div>
          <p className="text-sm text-neutral-500 font-light">
            Comprehensive history of administrative actions executed by Historians in this family tree.
          </p>
        </div>

        {/* Logs Table */}
        <div className="glass-panel p-6 rounded-3xl space-y-6 overflow-hidden">
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-ancestral-500" />
            </div>
          ) : logs.length > 0 ? (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100 text-neutral-450 uppercase font-semibold tracking-wider">
                      <th className="py-3.5 pr-4">Historian</th>
                      <th className="py-3.5 px-4">Action</th>
                      <th className="py-3.5 px-4">Details</th>
                      <th className="py-3.5 pl-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50 text-neutral-600 font-light">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-neutral-50/20">
                        <td className="py-4 pr-4 font-semibold text-neutral-800">
                          {log.actor?.fullName || 'System'}
                        </td>
                        <td className="py-4 px-4">
                          <span className="bg-neutral-100 text-neutral-700 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                            {log.action.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-4 truncate max-w-[200px]" title={log.details}>
                          {formatDetails(log)}
                        </td>
                        <td className="py-4 pl-4 text-neutral-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {pagination.pages > 1 && (
                <div className="flex justify-between items-center pt-4 border-t border-neutral-100">
                  <span className="text-[10px] text-neutral-400 font-light">
                    Showing Page {page} of {pagination.pages} ({pagination.total} total actions logs)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(p - 1, 1))}
                      disabled={page === 1}
                      className="p-1.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-500 disabled:opacity-50 transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(p + 1, pagination.pages))}
                      disabled={page === pagination.pages}
                      className="p-1.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-500 disabled:opacity-50 transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center space-y-2">
              <Inbox className="w-8 h-8 mx-auto text-neutral-300" />
              <p className="text-xs text-neutral-400 font-light">No logs logged yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogPage;
