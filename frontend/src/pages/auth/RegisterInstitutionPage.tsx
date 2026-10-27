import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Building2, CheckCircle2, AlertCircle, ArrowLeft, Send } from 'lucide-react';

export const RegisterInstitutionPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    officialIdentifier: '',
    name: '',
    address: '',
    state: '',
    district: '',
    pinCode: '',
    contactEmail: '',
    contactPhone: '',
    approvalReference: '',
    adminFullName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.registerInstitution(formData);
      if (res.success) {
        setSuccessMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link to="/login" className="inline-flex items-center text-xs font-semibold text-blue-600 hover:underline mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Sign In
        </Link>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-aicte-navy text-white px-8 py-6">
            <div className="flex items-center space-x-3">
              <Building2 className="w-8 h-8 text-amber-400" />
              <div>
                <h2 className="text-xl font-bold">Institution Registration & Onboarding Request</h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Request account creation for AICTE approved Technical Institutions & Universities
                </p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {successMsg ? (
              <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-lg font-bold text-emerald-900">Request Submitted Successfully</h3>
                <p className="text-sm text-emerald-800 max-w-md mx-auto">{successMsg}</p>
                <div className="pt-2">
                  <button
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
                  >
                    Return to Login
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-xs text-blue-800 leading-relaxed">
                  <strong>Notice:</strong> All institution registrations remain in <span className="font-semibold underline">Pending Approval</span> status until officially verified and approved by the AICTE Super Administrator. Credentials will be activated upon approval.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Official AICTE Identifier *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AICTE-1-98765432"
                      value={formData.officialIdentifier}
                      onChange={(e) => setFormData({ ...formData, officialIdentifier: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Approval Reference No. *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. F.No. Western/1-98765432/2026/EOA"
                      value={formData.approvalReference}
                      onChange={(e) => setFormData({ ...formData, approvalReference: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Institution Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Full Official Name of College or University"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Campus Address *
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Campus street, sector, landmark"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maharashtra, Delhi, Karnataka"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      District *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pune, South West Delhi"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      PIN Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="6 digit PIN"
                      value={formData.pinCode}
                      onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Official Contact Phone *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 022-25704433"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
                    Authorized Institution Administrator Account
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Admin Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Dr. Principal / Registrar"
                        value={formData.adminFullName}
                        onChange={(e) => setFormData({ ...formData, adminFullName: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Admin Login Email</label>
                      <input
                        type="email"
                        required
                        placeholder="registrar@college.edu"
                        value={formData.adminEmail}
                        onChange={(e) =>
                          setFormData({ ...formData, adminEmail: e.target.value, contactEmail: e.target.value })
                        }
                        className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Initial Password</label>
                      <input
                        type="password"
                        required
                        placeholder="Minimum 8 characters"
                        value={formData.adminPassword}
                        onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Submitting Request...' : 'Submit Onboarding Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
