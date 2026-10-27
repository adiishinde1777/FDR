import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { VerificationCase } from '../../types';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import {
  CheckSquare,
  AlertTriangle,
  FileText,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const VerificationQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [cases, setCases] = useState<VerificationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<VerificationCase | null>(null);

  // Modals state
  const [obsModal, setObsModal] = useState(false);
  const [obsType, setObsType] = useState('DATA_MISMATCH');
  const [obsRemarks, setObsRemarks] = useState('');
  const [obsFieldName, setObsFieldName] = useState('jointName');
  const [obsEntered, setObsEntered] = useState('');
  const [obsObserved, setObsObserved] = useState('');

  const [completeModal, setCompleteModal] = useState(false);
  const [outcome, setOutcome] = useState<'RECOMMENDED_APPROVAL' | 'RECOMMENDED_REJECTION'>('RECOMMENDED_APPROVAL');
  const [completeRemarks, setCompleteRemarks] = useState('');

  const [externalModal, setExternalModal] = useState(false);
  const [extType, setExtType] = useState('MANUAL_DOCUMENT_CHECK');
  const [extRef, setExtRef] = useState('');
  const [extNotes, setExtNotes] = useState('');

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const res = await api.getVerificationQueue();
      if (res.success) {
        setCases(res.data);
      }
    } catch (err) {
      console.error('Failed to load verification queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToMe = async (caseId: string) => {
    try {
      await api.assignVerification(caseId, user!.id);
      await loadQueue();
    } catch (err: any) {
      alert(`Assignment failed: ${err.message}`);
    }
  };

  const handleRecordObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    try {
      await api.recordObservation(selectedCase.id, {
        observationType: obsType,
        fieldName: obsFieldName,
        enteredValue: obsEntered,
        observedValue: obsObserved,
        remarks: obsRemarks,
      });
      setObsModal(false);
      setObsRemarks('');
      await loadQueue();
      alert('Discrepancy observation recorded and institution notified.');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleRecordExternal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    try {
      await api.recordExternalVerification(selectedCase.id, {
        verificationType: extType,
        verificationReference: extRef,
        notes: extNotes,
      });
      setExternalModal(false);
      setExtRef('');
      await loadQueue();
      alert('External verification reference recorded accurately.');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleCompleteVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    try {
      await api.completeVerification(selectedCase.id, outcome, completeRemarks);
      setCompleteModal(false);
      setCompleteRemarks('');
      await loadQueue();
      alert(`Verification completed with outcome: ${outcome}`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Verification & Scrutiny Queue</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dedicated officer workbench for document review, discrepancy flagging, and external cross-checks
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
          <div className="p-12 text-center text-xs text-slate-400">Loading verification queue...</div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No pending verification cases in the queue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="table-header">FDR Instrument</th>
                  <th className="table-header">Institution</th>
                  <th className="table-header">Assigned Officer</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Scrutiny Outcome</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="table-cell">
                      <div className="font-mono font-bold text-blue-700">{c.fdr?.fdrNumber}</div>
                      <div className="text-slate-500">
                        {c.fdr?.issuingBank} • ₹ {c.fdr?.depositAmount.toLocaleString()}
                      </div>
                    </td>

                    <td className="table-cell">
                      <div className="font-semibold text-slate-900">{c.fdr?.institution?.name}</div>
                      <div className="text-[11px] text-slate-400">{c.fdr?.institution?.officialIdentifier}</div>
                    </td>

                    <td className="table-cell">
                      {c.assignedOfficer ? (
                        <div className="font-medium text-slate-800">{c.assignedOfficer.fullName}</div>
                      ) : (
                        <button
                          onClick={() => handleAssignToMe(c.id)}
                          className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-semibold text-[11px] hover:bg-blue-100"
                        >
                          + Assign to Me
                        </button>
                      )}
                    </td>

                    <td className="table-cell">
                      <Badge status={c.status} size="sm" />
                    </td>

                    <td className="table-cell">
                      <Badge status={c.outcome} size="sm" />
                    </td>

                    <td className="table-cell text-right space-x-1">
                      <button
                        onClick={() => navigate(`/fdrs/${c.fdrId}`)}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded text-[11px] font-semibold hover:bg-slate-200"
                      >
                        Inspect FDR
                      </button>

                      <button
                        onClick={() => {
                          setSelectedCase(c);
                          setObsModal(true);
                        }}
                        className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[11px] font-semibold hover:bg-amber-100"
                      >
                        Flag Discrepancy
                      </button>

                      <button
                        onClick={() => {
                          setSelectedCase(c);
                          setExternalModal(true);
                        }}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-semibold hover:bg-blue-100"
                      >
                        External Cross-Check
                      </button>

                      <button
                        onClick={() => {
                          setSelectedCase(c);
                          setCompleteModal(true);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-semibold hover:bg-emerald-700 shadow-xs"
                      >
                        Complete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Observation / Discrepancy Modal */}
      {obsModal && selectedCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-rose-600" /> Record Discrepancy Observation
            </h3>
            <p className="text-xs text-slate-500">
              FDR #{selectedCase.fdr?.fdrNumber} • {selectedCase.fdr?.institution?.name}
            </p>

            <form onSubmit={handleRecordObservation} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block text-slate-700">Observation Type</label>
                <select
                  value={obsType}
                  onChange={(e) => setObsType(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg bg-white"
                >
                  <option value="DATA_MISMATCH">Data Mismatch</option>
                  <option value="DOCUMENT_ILLEGIBLE">Document Illegible</option>
                  <option value="BANK_BRANCH_DISCREPANCY">Bank Branch / IFSC Discrepancy</option>
                  <option value="AMOUNT_MISMATCH">Amount Mismatch</option>
                  <option value="DATE_ERROR">Validity / Date Error</option>
                  <option value="GENERAL_NOTE">General Observation Note</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block text-slate-700">Specific Discrepant Field</label>
                <input
                  type="text"
                  value={obsFieldName}
                  onChange={(e) => setObsFieldName(e.target.value)}
                  placeholder="e.g. jointName, depositAmount"
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block text-slate-700">Entered Value</label>
                  <input
                    type="text"
                    value={obsEntered}
                    onChange={(e) => setObsEntered(e.target.value)}
                    placeholder="Value submitted"
                    className="w-full mt-1 p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold block text-slate-700">Observed in Scrutiny</label>
                  <input
                    type="text"
                    value={obsObserved}
                    onChange={(e) => setObsObserved(e.target.value)}
                    placeholder="Observed fact"
                    className="w-full mt-1 p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block text-slate-700">Official Scrutiny Remarks *</label>
                <textarea
                  required
                  rows={3}
                  value={obsRemarks}
                  onChange={(e) => setObsRemarks(e.target.value)}
                  placeholder="Explain exact issue and corrective action required from the institution..."
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setObsModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700"
                >
                  Flag Discrepancy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record External Verification Modal */}
      {externalModal && selectedCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2 text-blue-600" /> Record External Cross-Check Reference
            </h3>
            <p className="text-xs text-slate-500">
              Accurately record bank confirmation letter or manual verification evidence without fabricating APIs.
            </p>

            <form onSubmit={handleRecordExternal} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block text-slate-700">Verification Source Type</label>
                <select
                  value={extType}
                  onChange={(e) => setExtType(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg bg-white"
                >
                  <option value="MANUAL_DOCUMENT_CHECK">Manual Physical / Stamp Verification</option>
                  <option value="BANK_LETTER_VERIFIED">Bank Confirmation Letter on Letterhead</option>
                  <option value="BANK_API_CONFIRMED">Authorized Bank Verification Network (If Available)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block text-slate-700">Verification Reference No. / Letter No. *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SBI/CP/CONF/2026/089"
                  value={extRef}
                  onChange={(e) => setExtRef(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold block text-slate-700">Notes & Evidence Details</label>
                <textarea
                  rows={2}
                  value={extNotes}
                  onChange={(e) => setExtNotes(e.target.value)}
                  placeholder="Branch manager contact, verification seal confirmed, date..."
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setExternalModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                >
                  Record Reference
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Verification Modal */}
      {completeModal && selectedCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <CheckSquare className="w-4 h-4 mr-2 text-emerald-600" /> Complete Officer Scrutiny
            </h3>

            <form onSubmit={handleCompleteVerification} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block text-slate-700">Recommended Decision</label>
                <div className="mt-1 flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="outcome"
                      value="RECOMMENDED_APPROVAL"
                      checked={outcome === 'RECOMMENDED_APPROVAL'}
                      onChange={() => setOutcome('RECOMMENDED_APPROVAL')}
                    />
                    <span className="text-emerald-700 font-bold">Recommend for Approval</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="outcome"
                      value="RECOMMENDED_REJECTION"
                      checked={outcome === 'RECOMMENDED_REJECTION'}
                      onChange={() => setOutcome('RECOMMENDED_REJECTION')}
                    />
                    <span className="text-rose-700 font-bold">Recommend Rejection</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-semibold block text-slate-700">Official Scrutiny Remarks *</label>
                <textarea
                  required
                  rows={3}
                  value={completeRemarks}
                  onChange={(e) => setCompleteRemarks(e.target.value)}
                  placeholder="Summary of document scrutiny, bank check, and recommendation..."
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCompleteModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700"
                >
                  Submit Scrutiny Outcome
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
