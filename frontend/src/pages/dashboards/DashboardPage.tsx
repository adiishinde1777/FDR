import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import {
  FileSpreadsheet,
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  FileCheck2,
  ArrowRight,
  RefreshCw,
  CalendarDays,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, alertsRes] = await Promise.all([
        api.getDashboardStats(),
        api.getMaturityAlerts(),
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (alertsRes.success) setAlerts(alertsRes.data);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAmountINR = (num: number) => {
    if (!num) return '₹ 0';
    if (num >= 10000000) {
      return `₹ ${(num / 10000000).toFixed(2)} Cr`;
    }
    if (num >= 100000) {
      return `₹ ${(num / 100000).toFixed(2)} Lakh`;
    }
    return `₹ ${num.toLocaleString('en-IN')}`;
  };

  const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2 text-slate-500 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span>Loading validated dashboard metrics...</span>
        </div>
      </div>
    );
  }

  const role = user?.role;
  const isInstUser = role === 'INSTITUTION_ADMIN' || role === 'INSTITUTION_STAFF';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {role?.replace(/_/g, ' ')} DASHBOARD
            </span>
            <span className="text-xs text-slate-400">• Realtime Relational Storage</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Welcome, {user?.fullName}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isInstUser
              ? `Assigned Institution: ${user?.institutions?.[0]?.name || 'Registered College'} (${user?.institutions?.[0]?.officialIdentifier || 'AICTE'})`
              : 'AICTE Security Deposit & Fixed Deposit Receipt Administrative Portal'}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {isInstUser ? (
            <button
              onClick={() => navigate('/fdrs/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm inline-flex items-center"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Submit New FDR
            </button>
          ) : (
            <button
              onClick={() => navigate('/verification')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm inline-flex items-center"
            >
              <FileCheck2 className="w-4 h-4 mr-1.5" /> Scrutiny Queue
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Active Deposits"
          value={formatAmountINR(stats?.approvedAmount || stats?.totalAmount || 0)}
          subtitle={`${stats?.totalFdrs || 0} registered instruments`}
          icon={TrendingUp}
          variant="green"
        />

        <StatCard
          title={isInstUser ? 'Under Scrutiny' : 'Pending Verification'}
          value={stats?.pendingVerifications || 0}
          subtitle="Awaiting officer verification"
          icon={Clock}
          variant="amber"
          badge={stats?.pendingVerifications > 0 ? 'Actionable' : undefined}
        />

        <StatCard
          title="Discrepancies Flagged"
          value={stats?.discrepancies || 0}
          subtitle="Require human review or response"
          icon={AlertTriangle}
          variant={stats?.discrepancies > 0 ? 'rose' : 'slate'}
          badge={stats?.discrepancies > 0 ? 'Requires Scrutiny' : undefined}
        />

        <StatCard
          title="Maturing within 30 Days"
          value={stats?.upcomingMaturityCount || 0}
          subtitle="Scheduled reminder jobs active"
          icon={CalendarDays}
          variant="purple"
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              FDR Lifecycle Status Breakdown
            </h3>
            <span className="text-xs text-slate-400">Database Live</span>
          </div>

          <div className="h-64">
            {stats?.statusBreakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusBreakdown}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
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
                No FDR records recorded
              </div>
            )}
          </div>
        </div>

        {/* Issuing Bank Distribution Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Issuing Scheduled Commercial Banks
            </h3>
            <span className="text-xs text-slate-400">By Instrument Count</span>
          </div>

          <div className="h-64">
            {stats?.bankDistribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.bankDistribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="bank" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1a56db" radius={[4, 4, 0, 0]} name="FDRs" />
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

      {/* Urgent Alerts and Actions Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Active Urgency & Maturity Alerts
            </h3>
          </div>
          <button
            onClick={() => navigate('/maturity')}
            className="text-xs text-blue-600 hover:underline font-semibold flex items-center"
          >
            Maturity Timeline <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {(!alerts || (alerts.matured?.length === 0 && alerts.urgent7Days?.length === 0 && alerts.warning15Days?.length === 0)) ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No immediate critical maturity warnings detected.
            </div>
          ) : (
            <>
              {alerts.matured?.map((item: any) => (
                <div key={item.id} className="p-4 hover:bg-slate-50 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                    <div>
                      <p className="font-bold text-slate-900">
                        FDR #{item.fdrNumber} - {item.institution?.name}
                      </p>
                      <p className="text-slate-500">
                        Amount: {formatAmountINR(item.depositAmount)} • Matured on {new Date(item.maturityDate).toDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                      Matured (Renewal Required)
                    </span>
                    <button
                      onClick={() => navigate(`/fdrs/${item.id}`)}
                      className="text-blue-600 font-semibold hover:underline"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}

              {alerts.urgent7Days?.map((item: any) => (
                <div key={item.id} className="p-4 hover:bg-slate-50 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                    <div>
                      <p className="font-bold text-slate-900">
                        FDR #{item.fdrNumber} - {item.institution?.name}
                      </p>
                      <p className="text-slate-500">
                        Amount: {formatAmountINR(item.depositAmount)} • Maturing in {item.daysRemaining} days ({new Date(item.maturityDate).toDateString()})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                      Urgent (&le; 7 Days)
                    </span>
                    <button
                      onClick={() => navigate(`/fdrs/${item.id}`)}
                      className="text-blue-600 font-semibold hover:underline"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}

              {alerts.warning15Days?.map((item: any) => (
                <div key={item.id} className="p-4 hover:bg-slate-50 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <div>
                      <p className="font-bold text-slate-900">
                        FDR #{item.fdrNumber} - {item.institution?.name}
                      </p>
                      <p className="text-slate-500">
                        Amount: {formatAmountINR(item.depositAmount)} • Maturing in {item.daysRemaining} days ({new Date(item.maturityDate).toDateString()})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">
                      Warning (&le; 15 Days)
                    </span>
                    <button
                      onClick={() => navigate(`/fdrs/${item.id}`)}
                      className="text-blue-600 font-semibold hover:underline"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
