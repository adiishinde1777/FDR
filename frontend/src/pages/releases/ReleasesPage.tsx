import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ReleaseRefundRequest, FDRRecord } from '../../types';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { DollarSign, PlusCircle, CheckSquare, ShieldCheck, Building, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ReleasesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [requests, setRequests] = useState<ReleaseRefundRequest[]>([]);
  const [fdrs, setFdrs] = useState<FDRRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFdrId, setSelectedFdrId] = useState('');
  const [requestType, setRequestType] = useState('FULL_RELEASE');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [reason, setReason] = useState('');
  const [conditions, setConditions] = useState<string[]>([
    'AICTE NOC / Closure Certificate received',
    'No pending student grievances or regulatory inquiries',
    'State Directorate of Technical Education concurrence letter attached',
  ]);

  // Decision Modal
  const [decisionModal, setDecisionModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState<ReleaseRefundRequest | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | 'ADDITIONAL_INFO_REQUIRED'>('APPROVED');
  const [decisionRemarks, setDecisionRemarks] = useState('');

  // Settlement Modal (UTR recording)
  const [settlementModal, setSettlementModal] = useState(false);
  const [utrRef, setUtrRef] = useState('');
  const [settleRemarks, setSettleRemarks] = useState('');

  const isInstUser = user?.role === 'INSTITUTION_ADMIN' || user?.role === 'INSTITUTION_STAFF';
  const isApprover = user?.role === 'APPROVING_AUTHORITY' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [relRes, fdrRes] = await Promise.all([
        api.getReleases(),
        api.getFDRs({ limit: 100 }),
      ]);
      if (relRes.success) setRequests(relRes.data);
      if (fdrRes.success) setFdrs(fdrRes.data);
    } catch (err) {
      console.error('Failed to load release requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    const fdr = fdrs.find((f) => f.id === selectedFdrId);
    if (!fdr || !requestedAmount || !reason) return;

    try {
      const res = await api.createRelease({
        institutionId: fdr.institutionId,
        securityDepositId: fdr.securityDepositId || fdr.institutionId,
        fdrId: fdr.id,
        requestType,
        requestedAmount: parseFloat(requestedAmount),
        reason,
        conditionChecklist: conditions,
      });

      if (res.success) {
        setModalOpen(false);
        setReason('');
        await loadData();
        alert('Release request submitted successfully for administrative review.');
      }
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    }
  };

  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;
    try {
      await api.decideRelease(selectedReq.id, decision, decisionRemarks);
      setDecisionModal(false);
      setDecisionRemarks('');
      await loadData();
      alert(`Decision (${decision}) recorded successfully.`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !utrRef) return;
    try {
      await api.settleRelease(selectedReq.id, utrRef, settleRemarks);
      setSettlementModal(false);
      setUtrRef('');
      await loadData();
      alert('External settlement reference recorded and instrument successfully marked as Released.');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Security Deposit Release & Refund Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Formal release requests following course closure, intake surrender, or approved fulfillment
          </p>
        </div>

        {isInstUser && (
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm inline-flex items-center"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" /> Submit Release Request
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading release requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No active release or refund requests found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="table-header">Request No.</th>
                  <th className="table-header">Institution</th>
                  <th className="table-header">FDR Reference</th>
                  <th className="table-header">Type</th>
                  <th className="table-header text-right">Requested Sum</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="table-cell font-mono font-bold text-slate-900">
                      {r.requestNumber}
                    </td>

                    <td className="table-cell">
                      <div className="font-semibold text-slate-900">{r.institution?.name}</div>
                      <div className="text-[11px] text-slate-400">{r.institution?.officialIdentifier}</div>
                    </td>

                    <td className="table-cell">
                      <span className="font-mono font-bold text-blue-700">{r.fdr?.fdrNumber}</span>
                      <span className="text-[11px] text-slate-400 block">{r.fdr?.issuingBank}</span>
                    </td>

                    <td className="table-cell font-medium text-slate-700">{r.requestType.replace(/_/g, ' ')}</td>

                    <td className="table-cell text-right font-bold text-slate-900">
                      ₹ {r.requestedAmount.toLocaleString()}
                    </td>

                    <td className="table-cell">
                      <Badge status={r.status} size="sm" />
                    </td>

                    <td className="table-cell text-right space-x-2">
                      {isApprover && r.status === 'SUBMITTED' && (
                        <button
                          onClick={() => {
                            setSelectedReq(r);
                            setDecisionModal(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs"
                        >
                          Review & Decide
                        </button>
                      )}

                      {isApprover && r.status === 'APPROVED' && (
                        <button
                          onClick={() => {
                            setSelectedReq(r);
                            setSettlementModal(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-xs"
                        >
                          Record UTR Settlement
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

      {/* New Request Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-blue-600" /> Security Deposit Release / Refund Request
            </h3>

            <form onSubmit={handleCreateRelease} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block text-slate-700">Select FDR to Release *</label>
                <select
                  required
                  value={selectedFdrId}
                  onChange={(e) => {
                    setSelectedFdrId(e.target.value);
                    const selected = fdrs.find((f) => f.id === e.target.value);
                    if (selected) setRequestedAmount(String(selected.depositAmount));
                  }}
                  className="w-full mt-1 p-2 border rounded-lg bg-white"
                >
                  <option value="">Choose an Approved or Matured FDR...</option>
                  {fdrs
                    .filter((f) => ['APPROVED', 'MATURED'].includes(f.accountStatus))
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.fdrNumber} - {f.issuingBank} (₹ {f.depositAmount.toLocaleString()})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block text-slate-700">Request Type</label>
                  <select
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
                    className="w-full mt-1 p-2 border rounded-lg bg-white"
                  >
                    <option value="FULL_RELEASE">Full Release</option>
                    <option value="PARTIAL_RELEASE">Partial Release</option>
                    <option value="SURRENDER">Course Surrender</option>
                    <option value="REFUND">Excess Deposit Refund</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block text-slate-700">Claimed Amount (INR) *</label>
                  <input
                    type="number"
                    required
                    value={requestedAmount}
                    onChange={(e) => setRequestedAmount(e.target.value)}
                    className="w-full mt-1 p-2 border rounded-lg font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block text-slate-700">Justification & Regulatory Authority *</label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Closure of 2nd shift MCA program as sanctioned by AICTE Council Order..."
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>

              {/* Mandatory Checklist */}
              <div>
                <label className="font-semibold block text-slate-700 mb-1">Pre-condition Compliance Checklist *</label>
                <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  {conditions.map((c, i) => (
                    <label key={i} className="flex items-center space-x-2 text-[11px] text-slate-700 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                >
                  Submit Release Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decision Modal */}
      {decisionModal && selectedReq && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <ShieldCheck className="w-5 h-5 mr-2 text-emerald-600" /> Sanction Release / Refund Request
            </h3>
            <p className="text-xs text-slate-500">
              Request #{selectedReq.requestNumber} • ₹ {selectedReq.requestedAmount.toLocaleString()}
            </p>

            <form onSubmit={handleDecision} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block text-slate-700">Official Decision</label>
                <div className="mt-1 flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="decision"
                      value="APPROVED"
                      checked={decision === 'APPROVED'}
                      onChange={() => setDecision('APPROVED')}
                    />
                    <span className="text-emerald-700 font-bold">Sanction Release</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="decision"
                      value="REJECTED"
                      checked={decision === 'REJECTED'}
                      onChange={() => setDecision('REJECTED')}
                    />
                    <span className="text-rose-700 font-bold">Reject</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-semibold block text-slate-700">Decision Remarks *</label>
                <textarea
                  required
                  rows={3}
                  value={decisionRemarks}
                  onChange={(e) => setDecisionRemarks(e.target.value)}
                  placeholder="State formal council order sanction or rejection reasoning..."
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDecisionModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                >
                  Commit Sanction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settlement Modal (UTR recording) */}
      {settlementModal && selectedReq && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <Building className="w-5 h-5 mr-2 text-blue-600" /> Record External Settlement Reference
            </h3>
            <p className="text-xs text-slate-500">
              Record bank transfer UTR number or bank sanction order. Accurately tracks financial closure without fabricating API transfers.
            </p>

            <form onSubmit={handleSettlement} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block text-slate-700">Bank UTR / Settlement Order Reference *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR-SBIN-2026-99182374"
                  value={utrRef}
                  onChange={(e) => setUtrRef(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold block text-slate-700">Closure Remarks</label>
                <textarea
                  rows={2}
                  value={settleRemarks}
                  onChange={(e) => setSettleRemarks(e.target.value)}
                  placeholder="Fund released via bank branch transfer to college account..."
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSettlementModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700"
                >
                  Finalize & Close FDR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
