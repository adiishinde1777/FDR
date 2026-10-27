import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { User, UserRole } from '../../types';
import { Users, PlusCircle, CheckCircle2, XCircle, RefreshCw, Shield } from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // New User Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('VERIFICATION_OFFICER');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      if (res.success) setUsers(res.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser({ fullName, email, password, role, phone });
      setModalOpen(false);
      setFullName('');
      setEmail('');
      setPassword('');
      setPhone('');
      await loadUsers();
      alert('User provisioned successfully.');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await api.toggleUserStatus(user.id, !user.isActive);
      await loadUsers();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">User & Administrative Role Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Role assignments, account activation, and credential provisioning
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm inline-flex items-center"
        >
          <PlusCircle className="w-4 h-4 mr-1.5" /> Provision Authorized User
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading user accounts...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="table-header">Full Name</th>
                  <th className="table-header">Email Address</th>
                  <th className="table-header">Assigned Role</th>
                  <th className="table-header">Contact Phone</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="table-cell font-bold text-slate-900">{u.fullName}</td>
                    <td className="table-cell text-slate-600 font-mono text-[11px]">{u.email}</td>
                    <td className="table-cell">
                      <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                        {u.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="table-cell text-slate-500">{u.phone || '—'}</td>
                    <td className="table-cell">
                      {u.isActive ? (
                        <span className="text-emerald-700 font-bold flex items-center">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Active
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold flex items-center">
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Deactivated
                        </span>
                      )}
                    </td>
                    <td className="table-cell text-right">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${
                          u.isActive
                            ? 'text-rose-700 border-rose-200 hover:bg-rose-50'
                            : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provision User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <Shield className="w-4 h-4 mr-2 text-blue-600" /> Provision Portal User
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold block text-slate-700">Official Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold block text-slate-700">Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold block text-slate-700">Assigned Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full mt-1 p-2 border rounded-lg bg-white"
                >
                  <option value="SUPER_ADMIN">SUPER_ADMIN (System Admin)</option>
                  <option value="VERIFICATION_OFFICER">VERIFICATION_OFFICER (Scrutiny)</option>
                  <option value="APPROVING_AUTHORITY">APPROVING_AUTHORITY (Financial Approval)</option>
                  <option value="AUDITOR">AUDITOR (Read-Only Reviewer)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block text-slate-700">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
