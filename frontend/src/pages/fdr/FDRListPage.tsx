import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { FDRRecord } from '../../types';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Download,
  PlusCircle,
  Eye,
  AlertTriangle,
  Building,
  RefreshCw,
} from 'lucide-react';

export const FDRListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [records, setRecords] = useState<FDRRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [page, setPage] = useState(1);

  const isInstUser = user?.role === 'INSTITUTION_ADMIN' || user?.role === 'INSTITUTION_STAFF';

  useEffect(() => {
    loadFDRs();
  }, [search, selectedStatus, selectedBank, page]);

  const loadFDRs = async () => {
    setLoading(true);
    try {
      const res = await api.getFDRs({
        search,
        status: selectedStatus || undefined,
        bank: selectedBank || undefined,
        page,
        limit: 10,
      });
      if (res.success) {
        setRecords(res.data);
        setTotal(res.pagination.total);
      }
    } catch (err) {
      console.error('Failed to load FDR records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    window.open(api.getExportCSVUrl(), '_blank');
  };

  const statusTabs = [
    { label: 'All Records', value: '' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Under Review', value: 'UNDER_REVIEW' },
    { label: 'Discrepant', value: 'DISCREPANT' },
    { label: 'Submitted', value: 'SUBMITTED' },
    { label: 'Matured', value: 'MATURED' },
    { label: 'Drafts', value: 'DRAFT' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Fixed Deposit Receipts (FDR) Repository</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Security deposits held in joint custody for AICTE approval compliance
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-sm inline-flex items-center transition-colors"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> Export CSV
          </button>

          {isInstUser && (
            <button
              onClick={() => navigate('/fdrs/new')}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm inline-flex items-center transition-colors"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" /> Submit New FDR
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 border-b border-slate-100">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setSelectedStatus(tab.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedStatus === tab.value
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Bank Filter Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by FDR number, bank name, branch, or institution..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={selectedBank}
              onChange={(e) => {
                setSelectedBank(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">All Scheduled Banks</option>
              <option value="State Bank of India">State Bank of India</option>
              <option value="Punjab National Bank">Punjab National Bank</option>
              <option value="Canara Bank">Canara Bank</option>
              <option value="Bank of Baroda">Bank of Baroda</option>
              <option value="HDFC Bank">HDFC Bank</option>
            </select>
          </div>
        </div>
      </div>

      {/* FDR Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Loading records from database...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold">No FDR records match the specified filters</p>
            <p className="text-xs text-slate-400">Try adjusting your search criteria or status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-header">FDR Number</th>
                  <th className="table-header">Institution</th>
                  <th className="table-header">Issuing Bank & Branch</th>
                  <th className="table-header text-right">Deposit Amount</th>
                  <th className="table-header">Maturity Date</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="table-cell font-mono font-bold text-blue-700">
                      <div className="flex items-center space-x-1.5">
                        <span>{r.fdrNumber}</span>
                        {r.isPotentialDuplicate && (
                          <span title="Flagged potential duplicate">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="table-cell">
                      <div className="font-semibold text-slate-900">{r.institution?.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center mt-0.5">
                        <Building className="w-3 h-3 mr-1 text-slate-400" />
                        {r.institution?.officialIdentifier} • {r.institution?.state}
                      </div>
                    </td>

                    <td className="table-cell">
                      <div className="font-medium text-slate-800">{r.issuingBank}</div>
                      <div className="text-[11px] text-slate-500">{r.bankBranch}</div>
                    </td>

                    <td className="table-cell text-right font-bold text-slate-900">
                      ₹ {r.depositAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="table-cell">
                      <div className="text-slate-800 font-medium">
                        {new Date(r.maturityDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Issued: {new Date(r.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>

                    <td className="table-cell">
                      <Badge status={r.accountStatus} size="sm" />
                    </td>

                    <td className="table-cell text-center">
                      <button
                        onClick={() => navigate(`/fdrs/${r.id}`)}
                        className="p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50 transition-colors"
                        title="View Full FDR Details & History"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {records.length} of {total} total records</span>
          <div className="flex space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={records.length < 10}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
