import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Settings, Shield, Server, Bell, Cpu, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export const SystemSettingsPage: React.FC = () => {
  const [integrations, setIntegrations] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await api.getIntegrationsStatus();
      if (res.success) setIntegrations(res.data);
    } catch (err) {
      console.error('Failed to load integration status:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">System Configuration & External Integrations</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Documented integration boundaries and operational subsystem health
          </p>
        </div>
        <button
          onClick={loadStatus}
          className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 inline-flex items-center shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> Refresh Health Status
        </button>
      </div>

      {/* Integration Transparency Matrix Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
            <Server className="w-4 h-4 mr-2 text-blue-600" /> Subsystem & External Integration Health Matrix
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Complies with AICTE transparency standards: external bank interfaces are labeled honestly without fabricated responses.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading integration matrix...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Bank Verification API */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Commercial Bank Verification API</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  {integrations?.bankVerificationApi?.status}
                </span>
              </div>
              <p className="text-slate-600">{integrations?.bankVerificationApi?.description}</p>
              <div className="text-[11px] text-slate-500 pt-1 font-mono">
                Active Protocol: {integrations?.bankVerificationApi?.mode}
              </div>
            </div>

            {/* Document OCR Pipeline */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Document OCR & Text Extraction</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {integrations?.ocrService?.status}
                </span>
              </div>
              <p className="text-slate-600">{integrations?.ocrService?.description}</p>
              <div className="text-[11px] text-slate-500 pt-1 font-mono">
                Engine: {integrations?.ocrService?.engine}
              </div>
            </div>

            {/* Notifications & Email */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Notification & Alert Subsystem</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  {integrations?.emailProvider?.status}
                </span>
              </div>
              <p className="text-slate-600">{integrations?.emailProvider?.description}</p>
              <div className="text-[11px] text-slate-500 pt-1 font-mono">
                Delivery Mode: In-App Persistent Queue & Logs
              </div>
            </div>

            {/* AICTE Central Portal Sync */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">AICTE Core Portal Synchronization</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                  {integrations?.aicteCentralPortal?.status}
                </span>
              </div>
              <p className="text-slate-600">{integrations?.aicteCentralPortal?.description}</p>
              <div className="text-[11px] text-slate-500 pt-1 font-mono">
                Persistence: Relational Database Store
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Security & Scheduler Guidelines */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3 text-xs text-slate-600 leading-relaxed">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
          <Shield className="w-4 h-4 mr-2 text-emerald-600" /> Operational Security Protocols
        </h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Database Transactions:</strong> Multi-step state transitions execute inside atomic database transactions.</li>
          <li><strong>Private Object Storage:</strong> Document blobs are never publicly reachable by URL; access is mediated through 5-minute authorized tokens.</li>
          <li><strong>Cross-Tenant Guard:</strong> Institution isolation middleware blocks access if an ID parameter belongs to an unauthorized institution.</li>
          <li><strong>Auditor Immutability:</strong> Read-only auditors are physically prevented by middleware from executing any POST, PUT, PATCH, or DELETE operations.</li>
        </ul>
      </div>
    </div>
  );
};
