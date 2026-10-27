import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Institution } from '../../types';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { Building2, Search, CheckCircle2, XCircle, PlusCircle, ShieldAlert, RefreshCw } from 'lucide-react';

export const InstitutionListPage: React.FC = () => {
  const { user } = useAuth();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Status Modal
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'REJECTED' | 'SUSPENDED'>('ACTIVE');
  const [remarks, setRemarks] = useState('');

  // Add Deposit Obligation Modal
  const [depositModal, setDepositModal] = useState(false);
  const [depInst, setDepInst] = useState<Institution | null>(null);
  const [depRef, setDepRef] = useState('');
  const [depProg, setDepProg] = useState('Engineering & Technology');
  const [depAmount, setDepAmount] = useState('3500000');
  const [depNotes, setDepNotes] = useState('');

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    loadInstitutions();
  }, [search, stateFilter, statusFilter]);

  const loadInstitutions = async () => {
    setLoading(true);
    try {
      const res = await api.getInstitutions({
        search,
        state: stateFilter || undefined,
        status: statusFilter || undefined,
      });
      if (res.success) setInstitutions(res.data);
    } catch (err) {
      console.error('Failed to load institutions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst) return;
    try {
      await api.updateInstitutionStatus(selectedInst.id, newStatus, remarks);
      setSelectedInst(null);
      setRemarks('');
      await loadInstitutions();
      alert(`Institution status updated to ${newStatus}`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleCreateDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depInst || !depRef || !depAmount) return;
    try {
      await api.createSecurityDeposit(depInst.id, {
        depositReference: depRef,
        programCategory: depProg,
        requiredAmount: parseFloat(depAmount),
        notes: depNotes,
      });
      setDepositModal(false);
      setDepRef('');
      await loadInstitutions();
      alert('Security deposit obligation created successfully.');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">AICTE Approved Institutions Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Participating technical colleges, universities, and polytechnics under AICTE purview
          </p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by college name, official AICTE ID, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading institutions...</div>
        ) : institutions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">No institutions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="table-header">AICTE Identifier</th>
                  <th className="table-header">Institution Name</th>
                  <th className="table-header">State & District</th>
                  <th className="table-header">Contact Information</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {institutions.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-50">
                    <td className="table-cell font-mono font-bold text-blue-700">
                      {inst.officialIdentifier}
                    </td>

                    <td className="table-cell font-semibold text-slate-900">
                      <div>{inst.name}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{inst.approvalReference}</div>
                    </td>

                    <td className="table-cell text-slate-700">
                      {inst.district}, {inst.state} ({inst.pinCode})
                    </td>

                    <td className="table-cell">
                      <div className="text-slate-900">{inst.contactEmail}</div>
                      <div className="text-slate-400 text-[11px]">{inst.contactPhone}</div>
                    </td>

                    <td className="table-cell">
                      <Badge status={inst.accountStatus} size="sm" />
                    </td>

                    <td className="table-cell text-right space-x-1.5">
                      {isSuperAdmin && inst.accountStatus === 'PENDING_APPROVAL' && (
                        <button
                          onClick={() => {
                            setSelectedInst(inst);
                            setNewStatus('ACTIVE');
                          }}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold hover:bg-emerald-700 shadow-xs"
                        >
                          Approve Onboarding
                        </button>
                      )}

                      {isSuperAdmin && (
                        <button
                          onClick={() => {
                            setDepInst(inst);
                            setDepRef(`SD-${inst.state.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`);
                            setDepositModal(true);
                          }}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-semibold hover:bg-blue-100"
                        >
                          + Add Security Deposit
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

      {/* Approve / Reject Modal */}
      {selectedInst && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> Review Institution Registration
            </h3>
            <p className="text-xs text-slate-500">
              {selectedInst.name} ({selectedInst.officialIdentifier})
            </p>

            <form onSubmit={handleUpdateStatus} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block text-slate-700">Status Decision</label>
                <div className="mt-1 flex space-x-4">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="instStatus"
                      value="ACTIVE"
                      checked={newStatus === 'ACTIVE'}
                      onChange={() => setNewStatus('ACTIVE')}
                    />
                    <span className="text-emerald-700 font-bold">Approve & Activate</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="instStatus"
                      value="REJECTED"
                      checked={newStatus === 'REJECTED'}
                      onChange={() => setNewStatus('REJECTED')}
                    />
                    <span className="text-rose-700 font-bold">Reject</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-semibold block text-slate-700">Administrative Remarks</label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Record formal approval remarks or rejection justification..."
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedInst(null)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                >
                  Commit Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Security Deposit Modal */}
      {depositModal && depInst && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <Building2 className="w-4 h-4 mr-2 text-blue-600" /> Create Security Deposit Obligation
            </h3>
            <p className="text-xs text-slate-500">
              For: {depInst.name}
            </p>

            <form onSubmit={handleCreateDeposit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block text-slate-700">Deposit Reference *</label>
                <input
                  type="text"
                  required
                  value={depRef}
                  onChange={(e) => setDepRef(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold block text-slate-700">Program Category *</label>
                <select
                  value={depProg}
                  onChange={(e) => setDepProg(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg bg-white"
                >
                  <option value="Engineering & Technology (UG/PG)">Engineering & Technology (UG/PG)</option>
                  <option value="Management Studies (MBA/PGDM)">Management Studies (MBA/PGDM)</option>
                  <option value="Pharmacy (B.Pharm/M.Pharm)">Pharmacy (B.Pharm/M.Pharm)</option>
                  <option value="MCA / Computer Applications">MCA / Computer Applications</option>
                  <option value="Architecture & Planning">Architecture & Planning</option>
                  <option value="Applied Arts & Crafts">Applied Arts & Crafts</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block text-slate-700">Prescribed Deposit Sum (INR) *</label>
                <input
                  type="number"
                  required
                  value={depAmount}
                  onChange={(e) => setDepAmount(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="font-semibold block text-slate-700">Notes</label>
                <textarea
                  rows={2}
                  value={depNotes}
                  onChange={(e) => setDepNotes(e.target.value)}
                  placeholder="Reference AICTE Approval Process Handbook (APH) clause..."
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDepositModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                >
                  Create Obligation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
