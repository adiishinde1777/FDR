import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { RenewalRequest, FDRRecord } from '../../types';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { Repeat, PlusCircle, CheckCircle2, XCircle, ArrowRight, RefreshCw, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const RenewalsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [renewals, setRenewals] = useState<RenewalRequest[]>([]);
  const [fdrs, setFdrs] = useState<FDRRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // New Renewal Request Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [oldFdrId, setOldFdrId] = useState('');
  const [newFdrId, setNewFdrId] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review Modal
  const [reviewModal, setReviewModal] = useState(false);
  const [selectedRenewal, setSelectedRenewal] = useState<RenewalRequest | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewRemarks, setReviewRemarks] = useState('');

  const isInstUser = user?.role === 'INSTITUTION_ADMIN' || user?.role === 'INSTITUTION_STAFF';
  const isApprover = user?.role === 'APPROVING_AUTHORITY' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [renRes, fdrRes] = await Promise.all([
        api.getRenewals(),
        api.getFDRs({ limit: 100 }),
      ]);
      if (renRes.success) setRenewals(renRes.data);
      if (fdrRes.success) setFdrs(fdrRes.data);
    } catch (err) {
      console.error('Failed to load renewals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldFdrId || !reason) return;

    setIsSubmitting(true);
    try {
      const res = await api.createRenewal({
        oldFdrId,
        newFdrId: newFdrId || undefined,
        reason,
      });
      if (res.success) {
        setModalOpen(false);
        setReason('');
        await loadData();
        alert('Renewal / Replacement request submitted successfully.');
      }
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRenewal) return;

    try {
      await api.reviewRenewal(selectedRenewal.id, reviewStatus, reviewRemarks);
      setReviewModal(false);
      setReviewRemarks('');
      await loadData();
      alert(`Renewal request ${reviewStatus}. Historical link preserved.`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Renewal & Replacement Instruments</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain unbroken audit link between expiring deposit certificates and new replacement instruments
          </p>
        </div>

        {isInstUser && (
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm inline-flex items-center"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" /> Submit Replacement Instrument
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading renewal records...</div>
        ) : renewals.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No active renewal or replacement requests found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="table-header">Previous FDR (Expiring)</th>
                  <th className="table-header">Replacement FDR</th>
                  <th className="table-header">Institution</th>
                  <th className="table-header">Submission Date</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {renewals.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="table-cell">
                      <div className="font-mono font-bold text-slate-900">{r.oldFdr?.fdrNumber}</div>
                      <div className="text-[11px] text-slate-500">
                        {r.oldFdr?.issuingBank} • ₹ {r.oldFdr?.depositAmount.toLocaleString()}
                      </div>
                    </td>

                    <td className="table-cell">
                      {r.newFdr ? (
                        <div>
                          <span className="font-mono font-bold text-blue-700">{r.newFdr.fdrNumber}</span>
                          <span className="text-[11px] text-slate-500 block">₹ {r.newFdr.depositAmount.toLocaleString()}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Attached in justification</span>
                      )}
                    </td>

                    <td className="table-cell">
                      <div className="font-semibold text-slate-800">{r.oldFdr?.institution?.name}</div>
                      <div className="text-[10px] text-slate-400">{r.oldFdr?.institution?.officialIdentifier}</div>
                    </td>

                    <td className="table-cell">
                      {new Date(r.submissionDate).toLocaleDateString('en-IN')}
                    </td>

                    <td className="table-cell">
                      <Badge status={r.status} size="sm" />
                    </td>

                    <td className="table-cell text-right space-x-2">
                      <button
                        onClick={() => navigate(`/fdrs/${r.oldFdrId}`)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                      >
                        Inspect Old
                      </button>

                      {isApprover && r.status === 'SUBMITTED' && (
                        <button
                          onClick={() => {
                            setSelectedRenewal(r);
                            setReviewModal(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs"
                        >
                          Review & Sanction
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

      {/* New Renewal Request Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <Repeat className="w-4 h-4 mr-2 text-blue-600" /> Submit Renewal / Replacement Instrument
            </h3>

            <form onSubmit={handleCreateRenewal} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block text-slate-700">Expiring / Matured FDR *</label>
                <select
                  required
                  value={oldFdrId}
                  onChange={(e) => setOldFdrId(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg bg-white"
                >
                  <option value="">Select Expiring FDR to Replace...</option>
                  {fdrs
                    .filter((f) => ['APPROVED', 'MATURED'].includes(f.accountStatus))
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.fdrNumber} - {f.issuingBank} (₹ {f.depositAmount.toLocaleString()})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block text-slate-700">Replacement FDR Draft (Optional)</label>
                <select
                  value={newFdrId}
                  onChange={(e) => setNewFdrId(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg bg-white"
                >
                  <option value="">Select Newly Created Draft FDR (if registered)...</option>
                  {fdrs
                    .filter((f) => f.accountStatus === 'DRAFT')
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.fdrNumber} - {f.issuingBank} (₹ {f.depositAmount.toLocaleString()})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block text-slate-700">Official Justification / Bank Note *</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State reason for replacement (e.g. term maturity rollover, change of bank branch, tenure extension)..."
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && selectedRenewal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> Sanction FDR Renewal / Replacement
            </h3>
            <p className="text-xs text-slate-500">
              Replacing FDR #{selectedRenewal.oldFdr?.fdrNumber}
            </p>

            <form onSubmit={handleReviewRenewal} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block text-slate-700">Sanction Decision</label>
                <div className="mt-1 flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="revStatus"
                      value="APPROVED"
                      checked={reviewStatus === 'APPROVED'}
                      onChange={() => setReviewStatus('APPROVED')}
                    />
                    <span className="text-emerald-700 font-bold">Approve Replacement</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="revStatus"
                      value="REJECTED"
                      checked={reviewStatus === 'REJECTED'}
                      onChange={() => setReviewStatus('REJECTED')}
                    />
                    <span className="text-rose-700 font-bold">Reject</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-semibold block text-slate-700">Sanction Remarks *</label>
                <textarea
                  required
                  rows={3}
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  placeholder="Record formal administrative remarks on replacement instrument validity..."
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setReviewModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700"
                >
                  Commit Sanction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
