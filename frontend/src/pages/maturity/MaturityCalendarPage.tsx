import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Play,
  RotateCw,
  Building,
} from 'lucide-react';

export const MaturityCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  useEffect(() => {
    loadMaturityData();
  }, []);

  const loadMaturityData = async () => {
    setLoading(true);
    try {
      const [alertsRes, calendarRes] = await Promise.all([
        api.getMaturityAlerts(),
        api.getMaturityCalendar(),
      ]);
      if (alertsRes.success) setAlerts(alertsRes.data);
      if (calendarRes.success) setTimeline(calendarRes.data);
    } catch (err) {
      console.error('Failed to load maturity data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerScan = async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const res = await api.triggerMaturityScan();
      if (res.success) {
        setScanResult(res.message);
        await loadMaturityData();
      }
    } catch (err: any) {
      setScanResult(`Scan error: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Maturity Monitoring & Alerts</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated scheduled background monitoring with 30, 15, 7, and 0-day alert triggers
          </p>
        </div>

        <button
          onClick={handleTriggerScan}
          disabled={isScanning}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm inline-flex items-center disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 mr-1.5" />
          {isScanning ? 'Running Scan...' : 'Trigger Scheduled Scan Now'}
        </button>
      </div>

      {scanResult && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{scanResult}</span>
        </div>
      )}

      {/* Categorized Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Matured</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
          </div>
          <div className="text-2xl font-black text-rose-900 mt-2">
            {alerts?.matured?.length || 0}
          </div>
          <p className="text-[11px] text-rose-700 mt-1">Requires renewal or release request</p>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Urgent (&le; 7 Days)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
          </div>
          <div className="text-2xl font-black text-amber-900 mt-2">
            {alerts?.urgent7Days?.length || 0}
          </div>
          <p className="text-[11px] text-amber-700 mt-1">Critical renewal deadline</p>
        </div>

        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Warning (&le; 15 Days)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          </div>
          <div className="text-2xl font-black text-blue-900 mt-2">
            {alerts?.warning15Days?.length || 0}
          </div>
          <p className="text-[11px] text-blue-700 mt-1">Reminders dispatched to institution</p>
        </div>

        <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">Upcoming (&le; 30 Days)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
          </div>
          <div className="text-2xl font-black text-purple-900 mt-2">
            {alerts?.upcoming30Days?.length || 0}
          </div>
          <p className="text-[11px] text-purple-700 mt-1">Early notification queue</p>
        </div>
      </div>

      {/* Maturity Timeline Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center">
            <CalendarDays className="w-4 h-4 mr-2 text-blue-600" />
            Chronological Maturity Timeline ({timeline.length} instruments)
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading timeline data...</div>
        ) : timeline.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No active maturity records.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="table-header">Scheduled Maturity</th>
                  <th className="table-header">FDR Reference</th>
                  <th className="table-header">Institution</th>
                  <th className="table-header">Bank</th>
                  <th className="table-header text-right">Amount</th>
                  <th className="table-header">Current Status</th>
                  <th className="table-header text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {timeline.map((item) => {
                  const diffTime = new Date(item.maturityDate).getTime() - new Date().getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  const isPast = diffDays <= 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="table-cell">
                        <div className="font-bold text-slate-900">
                          {new Date(item.maturityDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className={`text-[10px] font-semibold ${isPast ? 'text-rose-600' : diffDays <= 15 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {isPast ? `Matured ${Math.abs(diffDays)} days ago` : `In ${diffDays} days`}
                        </div>
                      </td>

                      <td className="table-cell font-mono font-bold text-blue-700">
                        {item.fdrNumber}
                      </td>

                      <td className="table-cell">
                        <div className="font-semibold text-slate-900">{item.institution?.name}</div>
                        <div className="text-[11px] text-slate-400">{item.institution?.officialIdentifier}</div>
                      </td>

                      <td className="table-cell">{item.issuingBank}</td>

                      <td className="table-cell text-right font-bold text-slate-900">
                        ₹ {item.depositAmount.toLocaleString()}
                      </td>

                      <td className="table-cell">
                        <Badge status={item.accountStatus} size="sm" />
                      </td>

                      <td className="table-cell text-center">
                        <button
                          onClick={() => navigate(`/fdrs/${item.id}`)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                        >
                          View Dossier
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
