import React from 'react';

interface BadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'md' }) => {
  const s = status.toUpperCase();

  let style = 'bg-slate-100 text-slate-700 border-slate-300';

  if (['APPROVED', 'ACTIVE', 'VERIFIED', 'COMPLETED', 'CLOSED'].includes(s)) {
    style = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
  } else if (['SUBMITTED', 'READY_FOR_APPROVAL', 'STAGE_1_SCRUTINY', 'IN_PROGRESS'].includes(s)) {
    style = 'bg-blue-50 text-blue-800 border-blue-300 font-medium';
  } else if (['UNDER_REVIEW', 'PENDING', 'PENDING_APPROVAL', 'PENDING_VERIFICATION', 'NEEDS_MANUAL_REVIEW'].includes(s)) {
    style = 'bg-amber-50 text-amber-800 border-amber-300 font-medium';
  } else if (['DISCREPANT', 'DISCREPANCY_FOUND', 'REJECTED', 'VERIFICATION_FAILED', 'SUSPENDED'].includes(s)) {
    style = 'bg-rose-50 text-rose-800 border-rose-300 font-semibold';
  } else if (['MATURED', 'RENEWED', 'SETTLED_EXTERNAL', 'FULL_RELEASE'].includes(s)) {
    style = 'bg-purple-50 text-purple-800 border-purple-300 font-medium';
  } else if (['DRAFT', 'NOT_SUBMITTED'].includes(s)) {
    style = 'bg-slate-100 text-slate-600 border-slate-200';
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center rounded-full border ${padding} ${style} uppercase tracking-wider`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70"></span>
      {status.replace(/_/g, ' ')}
    </span>
  );
};
