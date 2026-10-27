import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ArrowLeft, FileSpreadsheet, Save, Send, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const CreateFDRPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const userInstitution = user?.institutions?.[0];

  const [formData, setFormData] = useState({
    institutionId: userInstitution?.id || '',
    fdrNumber: '',
    issuingBank: 'State Bank of India',
    bankBranch: '',
    ifscCode: '',
    depositAmount: '',
    issueDate: new Date().toISOString().slice(0, 10),
    maturityDate: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    jointName: `Regional Officer, AICTE & Registrar / Principal, ${userInstitution?.name || 'Institution'}`,
    autoRenewal: false,
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (isDraft: boolean) => {
    setErrorMsg(null);
    if (!formData.fdrNumber || !formData.bankBranch || !formData.depositAmount) {
      setErrorMsg('Please fill in all mandatory fields (FDR number, Branch, Amount).');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        depositAmount: parseFloat(formData.depositAmount),
        isDraft,
      };

      const res = await api.createFDR(payload);
      if (res.success) {
        navigate(`/fdrs/${res.data.id}`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create FDR record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/fdrs" className="inline-flex items-center text-xs font-semibold text-blue-600 hover:underline">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to FDR Repository
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-aicte-navy text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileSpreadsheet className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-base font-bold">Register Fixed Deposit Receipt (FDR)</h2>
              <p className="text-xs text-slate-300">
                Joint security deposit instrument for AICTE approval compliance
              </p>
            </div>
          </div>
          <span className="text-xs bg-blue-900/80 px-2.5 py-1 rounded text-blue-200 font-mono">
            Form Section 7
          </span>
        </div>

        <div className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Institution Notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900">Institution:</span> {userInstitution?.name} ({userInstitution?.officialIdentifier})
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Active Authorized
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                FDR Reference Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SBI-DEL-2026-9041"
                value={formData.fdrNumber}
                onChange={(e) => setFormData({ ...formData, fdrNumber: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">As printed on the official bank term deposit receipt</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Issuing Scheduled Bank *
              </label>
              <select
                value={formData.issuingBank}
                onChange={(e) => setFormData({ ...formData, issuingBank: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="State Bank of India">State Bank of India</option>
                <option value="Punjab National Bank">Punjab National Bank</option>
                <option value="Canara Bank">Canara Bank</option>
                <option value="Bank of Baroda">Bank of Baroda</option>
                <option value="Union Bank of India">Union Bank of India</option>
                <option value="HDFC Bank">HDFC Bank</option>
                <option value="ICICI Bank">ICICI Bank</option>
                <option value="Axis Bank">Axis Bank</option>
                <option value="Indian Bank">Indian Bank</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Bank Branch *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Connaught Place Branch, New Delhi"
                value={formData.bankBranch}
                onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                IFSC Code
              </label>
              <input
                type="text"
                placeholder="e.g. SBIN0000691"
                value={formData.ifscCode}
                onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Deposit Principal Amount (INR) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="e.g. 3500000"
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-bold text-slate-900"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Numeric value in Indian Rupees without commas</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Issue Date *
              </label>
              <input
                type="date"
                required
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Scheduled Maturity Date *
              </label>
              <input
                type="date"
                required
                value={formData.maturityDate}
                onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Typically 3 or 5 years tenure under AICTE regulations</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Joint Account Name Designation *
              </label>
              <input
                type="text"
                required
                value={formData.jointName}
                onChange={(e) => setFormData({ ...formData, jointName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <p className="text-[10px] text-amber-700 mt-0.5 font-medium">
                * Must mandate joint holding: "Regional Officer, AICTE & Authorized Signatory of Institution"
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Internal Notes / Approval Reference
              </label>
              <textarea
                rows={2}
                placeholder="Optional administrative notes or program references..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/fdrs')}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>

            <div className="flex space-x-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit(true)}
                className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors inline-flex items-center shadow-xs"
              >
                <Save className="w-4 h-4 mr-1.5 text-slate-500" /> Save as Draft
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit(false)}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors inline-flex items-center shadow-sm"
              >
                <Send className="w-4 h-4 mr-1.5" /> Submit for Scrutiny
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
