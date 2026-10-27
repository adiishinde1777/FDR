import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { ApprovalCase } from '../../types';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  RefreshCw,
  Building,
  Eye,
  ShieldCheck,
} from 'lucide-react';

export const ApprovalQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [cases, setCases] = useState<ApprovalCase[]>([]);
  const [loading, setLoading] = useState(true);

  // Decision Modal
  const [selectedCase, setSelectedCase] = useState<ApprovalCase | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | 'RETURNED_FOR_CORRECTION'>('APPROVED');
  const [remarks, setRemarks] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const res = await api.getApprovalQueue();
      if (res.success) {
        setCases(res.data);
      }
    } catch (err) {
      console.error('Failed to load approval queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    setIsSubmitting(true);
    try {
      await api.recordApprovalDecision(selectedCase.id, decision, remarks, reason);
      setSelectedCase(null);
      setRemarks('');
      setReason('');
      await loadQueue();
      alert(`Approval decision (${decision}) recorded successfully.`);
    } catch (err: any) {
      alert(`Decision error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Competent Authority Approval Queue</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cases recommended by Verification Officers requiring official administrative sanction
          </p>
        </div>
        <button
          onClick={loadQueue}
          className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 inline-flex items-center shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> Refresh Queue
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading approval cases...</div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No pending cases awaiting approval decisions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="table-header">FDR Number</th>
                  <th className="table-header">Institution</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Stage</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="table-cell font-mono font-bold text-blue-700">
                      {c.fdr?.fdrNumber}
                    </td>

                    <td className="table-cell">
                      <div className="font-semibold text-slate-900">{c.fdr?.institution?.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {c.fdr?.institution?.officialIdentifier} • {c.fdr?.institution?.state}
                      </div>
                    </td>

                    <td className="table-cell font-bold text-slate-900">
                      ₹ {c.fdr?.depositAmount.toLocaleString()}
                    </td>

                    <td className="table-cell">
                      <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {c.stage}
                      </span>
                    </td>

                    <td className="table-cell">
                      <Badge status={c.status} size="sm" />
                    </td>

                    <td className="table-cell text-right space-x-2">
                      <button
                        onClick={() => navigate(`/fdrs/${c.fdrId}`)}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded text-[11px] font-semibold hover:bg-slate-200"
                      >
                        Inspect Dossier
                      </button>

                      {c.status === 'PENDING' && (
                        <button
                          onClick={() => {
                            setSelectedCase(c);
                            setDecision('APPROVED');
                          }}
                          className="px-3 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold hover:bg-emerald-700 shadow-xs"
                        >
                          Decide Case
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

      {/* Decision Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <ShieldCheck className="w-5 h-5 mr-2 text-blue-600" /> Execute Financial Approval Decision
            </h3>
            <p className="text-xs text-slate-500">
              FDR #{selectedCase.fdr?.fdrNumber} • ₹ {selectedCase.fdr?.depositAmount.toLocaleString()} • {selectedCase.fdr?.institution?.name}
            </p>

            <form onSubmit={handleDecision} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block text-slate-700 mb-1">Decision Selection *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDecision('APPROVED')}
                    className={`py-2 px-3 rounded-lg border text-center font-bold transition-all ${
                      decision === 'APPROVED'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    ✓ Approve
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision('RETURNED_FOR_CORRECTION')}
                    className={`py-2 px-3 rounded-lg border text-center font-bold transition-all ${
                      decision === 'RETURNED_FOR_CORRECTION'
                        ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-200'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    ↩ Return
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision('REJECTED')}
                    className={`py-2 px-3 rounded-lg border text-center font-bold transition-all ${
                      decision === 'REJECTED'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-200'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold block text-slate-700">Official Sanction Remarks *</label>
                <textarea
                  required
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Record formal remarks, sanction order references, or conditions..."
                  className="w-full mt-1 p-2.5 border rounded-lg"
                />
              </div>

              {decision !== 'APPROVED' && (
                <div>
                  <label className="font-semibold block text-slate-700">Detailed Reason for Rejection / Return *</label>
                  <textarea
                    required
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Specific policy clause violated or required document correction..."
                    className="w-full mt-1 p-2.5 border rounded-lg bg-rose-50/40"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedCase(null)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording Decision...' : 'Commit Approval Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
