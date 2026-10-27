import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  BarChart3,
  Download,
  Printer,
  TrendingUp,
  Building,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const ReportsPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboardStats();
      if (res.success) setStats(res.data);
    } catch (err) {
      console.error('Failed to load report analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    window.open(api.getExportCSVUrl(), '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Official Analytical Reports & Data Exports</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified financial summaries derived from active persistent database records
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-xs inline-flex items-center"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> Print Report
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm inline-flex items-center"
          >
            <Download className="w-4 h-4 mr-1.5" /> Download Comprehensive CSV
          </button>
        </div>
      </div>

      {/* Summary Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total FDR Instruments</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.totalFdrs || 0}</div>
          <span className="text-[11px] text-slate-400">All registered records</span>
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Gross Deposit Value</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            ₹ {((stats?.totalAmount || 0) / 100000).toFixed(2)} Lakhs
          </div>
          <span className="text-[11px] text-slate-400">Total face value</span>
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Approved Joint Custody</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            ₹ {((stats?.approvedAmount || 0) / 100000).toFixed(2)} Lakhs
          </div>
          <span className="text-[11px] text-slate-400">Compliant with AICTE</span>
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Discrepancy Rate</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">
            {stats?.totalFdrs > 0 ? (((stats?.discrepancies || 0) / stats.totalFdrs) * 100).toFixed(1) : 0}%
          </div>
          <span className="text-[11px] text-slate-400">{stats?.discrepancies || 0} flagged cases</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4">
            Security Deposit Compliance Status
          </h3>
          <div className="h-72">
            {stats?.statusBreakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusBreakdown}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(entry) => `${entry.status}: ${entry.count}`}
                  >
                    {stats.statusBreakdown.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Bank Volume */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4">
            Commercial Bank Custody Volume
          </h3>
          <div className="h-72">
            {stats?.bankDistribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.bankDistribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="bank" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1a56db" radius={[4, 4, 0, 0]} name="Instruments" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No bank data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
