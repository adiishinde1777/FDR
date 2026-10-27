import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AuditEventItem } from '../../types';
import { ScrollText, Search, Shield, Eye, RefreshCw, Terminal } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditEventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [selectedDetails, setSelectedDetails] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, [search, resourceFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({
        search,
        resourceType: resourceFilter || undefined,
        limit: 50,
      });
      if (res.success) {
        setLogs(res.data);
        setTotal(res.pagination.total);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Append-Only Application Audit Trail</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable legal ledger recording security events, mutations, approvals, and access logs
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 inline-flex items-center shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> Refresh Audit Ledger
        </button>
      </div>

      {/* Filter Row */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by actor email, action name, or resource ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="">All Resource Types</option>
            <option value="FDR">FDR Instruments</option>
            <option value="APPROVAL">Approval Decisions</option>
            <option value="VERIFICATION">Verification Scrutiny</option>
            <option value="DOCUMENT">Document Upload/Download</option>
            <option value="AUTH">Authentication Events</option>
            <option value="INSTITUTION">Institution Records</option>
            <option value="RELEASE">Release Requests</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading audit events...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">No audit events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="table-header">Timestamp</th>
                  <th className="table-header">Actor</th>
                  <th className="table-header">Action Executed</th>
                  <th className="table-header">Resource Type</th>
                  <th className="table-header">Correlation ID</th>
                  <th className="table-header text-center">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 font-sans">
                    <td className="table-cell whitespace-nowrap text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>

                    <td className="table-cell">
                      <div className="font-semibold text-slate-900">{log.actorEmail || 'System / Anonymous'}</div>
                      <div className="text-[10px] text-slate-400">{log.actorRole || 'SYSTEM'}</div>
                    </td>

                    <td className="table-cell">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                        {log.action}
                      </span>
                    </td>

                    <td className="table-cell">
                      <span className="font-semibold text-slate-700">{log.resourceType}</span>
                      {log.resourceId && (
                        <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">
                          {log.resourceId}
                        </span>
                      )}
                    </td>

                    <td className="table-cell font-mono text-[10px] text-slate-400">
                      {log.details ? 'tracked' : 'N/A'}
                    </td>

                    <td className="table-cell text-center">
                      {log.details && (
                        <button
                          onClick={() => setSelectedDetails(log.details || null)}
                          className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-[10px] font-semibold"
                        >
                          View Diff
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <Terminal className="w-4 h-4 mr-2 text-blue-600" /> Audit Event Payload Details
            </h3>

            <pre className="p-4 bg-slate-900 text-emerald-400 rounded-lg text-xs font-mono overflow-x-auto max-h-80 whitespace-pre-wrap">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(selectedDetails), null, 2);
                } catch {
                  return selectedDetails;
                }
              })()}
            </pre>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedDetails(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
