import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, TEST_ACCOUNTS } from '../../context/AuthContext';
import { ShieldCheck, Lock, Mail, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
import { UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const { login, quickLogin, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    setError(null);
    try {
      await quickLogin(role);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Quick login failed.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Banner */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-aicte-navy text-white text-3xl font-serif font-black shadow-lg border-2 border-amber-400 mb-4">
          A
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Government of India</p>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          AICTE Security Deposit / FDR Portal
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          All India Council for Technical Education • Ministry of Education
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Official Email Address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@aicte-india.org or college.edu"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Secure Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Authenticating...' : 'Sign In to Portal'}
              <ArrowRight className="ml-2 w-4 h-4" />
            </button>
          </form>

          {/* Demonstration Quick-Login Section */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1 text-blue-600" /> Quick-Test Accounts
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">1-Click</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('SUPER_ADMIN')}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-left font-medium text-slate-700 hover:border-blue-400 transition-all"
              >
                <div className="font-bold text-blue-700">Super Admin</div>
                <div className="text-[10px] text-slate-400">Dr. Srivastav</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('VERIFICATION_OFFICER')}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-left font-medium text-slate-700 hover:border-blue-400 transition-all"
              >
                <div className="font-bold text-amber-700">Scrutiny Officer</div>
                <div className="text-[10px] text-slate-400">Sunita Sharma</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('APPROVING_AUTHORITY')}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-left font-medium text-slate-700 hover:border-blue-400 transition-all"
              >
                <div className="font-bold text-emerald-700">Approving Auth.</div>
                <div className="text-[10px] text-slate-400">Prof. Anil Verma</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('AUDITOR')}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-left font-medium text-slate-700 hover:border-blue-400 transition-all"
              >
                <div className="font-bold text-purple-700">Auditor (Read-Only)</div>
                <div className="text-[10px] text-slate-400">Pooja Nair</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('INSTITUTION_ADMIN')}
                className="col-span-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-left font-medium text-slate-700 hover:border-blue-400 transition-all flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-900">Institution Admin</div>
                  <div className="text-[10px] text-slate-400">Delhi Institute of Tech (AICTE-1-4928172)</div>
                </div>
                <UserCheck className="w-4 h-4 text-blue-600" />
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Need to register a new institution?{' '}
            <Link to="/register-institution" className="text-blue-600 font-semibold hover:underline">
              Submit Onboarding Request
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
