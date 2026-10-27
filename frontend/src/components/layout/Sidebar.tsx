import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileSpreadsheet,
  CheckSquare,
  FileCheck2,
  CalendarDays,
  Repeat,
  DollarSign,
  Building2,
  BarChart3,
  ScrollText,
  Users,
  Settings,
  PlusCircle,
} from 'lucide-react';
import { UserRole } from '../../types';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role;

  const isOfficerOrAdmin = [
    'SUPER_ADMIN',
    'VERIFICATION_OFFICER',
    'APPROVING_AUTHORITY',
    'AUDITOR',
  ].includes(role || '');

  const navItems = [
    {
      label: 'Dashboard',
      to: '/dashboard',
      icon: LayoutDashboard,
      roles: ['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'INSTITUTION_STAFF', 'VERIFICATION_OFFICER', 'APPROVING_AUTHORITY', 'AUDITOR'],
    },
    {
      label: 'FDR Repository',
      to: '/fdrs',
      icon: FileSpreadsheet,
      roles: ['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'INSTITUTION_STAFF', 'VERIFICATION_OFFICER', 'APPROVING_AUTHORITY', 'AUDITOR'],
    },
    {
      label: 'New FDR Submission',
      to: '/fdrs/new',
      icon: PlusCircle,
      roles: ['INSTITUTION_ADMIN', 'INSTITUTION_STAFF'],
    },
    {
      label: 'Verification Queue',
      to: '/verification',
      icon: CheckSquare,
      roles: ['SUPER_ADMIN', 'VERIFICATION_OFFICER', 'APPROVING_AUTHORITY', 'AUDITOR'],
    },
    {
      label: 'Approval Queue',
      to: '/approvals',
      icon: FileCheck2,
      roles: ['SUPER_ADMIN', 'APPROVING_AUTHORITY', 'AUDITOR'],
    },
    {
      label: 'Maturity Calendar',
      to: '/maturity',
      icon: CalendarDays,
      roles: ['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'INSTITUTION_STAFF', 'VERIFICATION_OFFICER', 'APPROVING_AUTHORITY', 'AUDITOR'],
    },
    {
      label: 'Renewals & Replacements',
      to: '/renewals',
      icon: Repeat,
      roles: ['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'INSTITUTION_STAFF', 'VERIFICATION_OFFICER', 'APPROVING_AUTHORITY', 'AUDITOR'],
    },
    {
      label: 'Release / Refund Requests',
      to: '/releases',
      icon: DollarSign,
      roles: ['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'INSTITUTION_STAFF', 'VERIFICATION_OFFICER', 'APPROVING_AUTHORITY', 'AUDITOR'],
    },
    {
      label: 'Institution Directory',
      to: '/institutions',
      icon: Building2,
      roles: ['SUPER_ADMIN', 'VERIFICATION_OFFICER', 'APPROVING_AUTHORITY', 'AUDITOR'],
    },
    {
      label: 'Reports & Analytics',
      to: '/reports',
      icon: BarChart3,
      roles: ['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'INSTITUTION_STAFF', 'VERIFICATION_OFFICER', 'APPROVING_AUTHORITY', 'AUDITOR'],
    },
    {
      label: 'Audit Trail Logs',
      to: '/audit',
      icon: ScrollText,
      roles: ['SUPER_ADMIN', 'AUDITOR'],
    },
    {
      label: 'User Management',
      to: '/users',
      icon: Users,
      roles: ['SUPER_ADMIN'],
    },
    {
      label: 'System & Integrations',
      to: '/settings',
      icon: Settings,
      roles: ['SUPER_ADMIN'],
    },
  ];

  const visibleItems = navItems.filter((item) => role && item.roles.includes(role));

  return (
    <aside className="w-64 bg-aicte-navy text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-62px)] select-none">
      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Main Navigation
        </p>

        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Bottom Legal / Help footer */}
      <div className="p-4 bg-[#08152b] border-t border-slate-800 text-[11px] text-slate-400">
        <p className="font-semibold text-slate-300">AICTE Approval Bureau</p>
        <p className="text-[10px] text-slate-500 mt-0.5">Version 1.0.0 (Production Build)</p>
        <div className="mt-2 flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] text-emerald-400 font-medium">DB Connection Active</span>
        </div>
      </div>
    </aside>
  );
};
