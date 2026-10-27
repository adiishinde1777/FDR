const BASE_URL = '/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('aicte_auth_token');
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.message || `HTTP ${res.status}: ${res.statusText}`;
    const err = new Error(errorMsg) as any;
    err.status = res.status;
    err.code = data?.error?.code;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  logout: () => request<any>('/auth/logout', { method: 'POST' }),
  getMe: () => request<any>('/auth/me'),
  registerInstitution: (data: any) =>
    request<any>('/auth/register-institution', { method: 'POST', body: JSON.stringify(data) }),

  // FDRs
  getFDRs: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return request<any>(`/fdrs?${query.toString()}`);
  },
  getFDR: (id: string) => request<any>(`/fdrs/${id}`),
  createFDR: (data: any) => request<any>('/fdrs', { method: 'POST', body: JSON.stringify(data) }),
  submitFDR: (id: string) => request<any>(`/fdrs/${id}/submit`, { method: 'POST' }),

  // Documents
  uploadDocument: (formData: FormData) =>
    request<any>('/documents/upload', { method: 'POST', body: formData }),
  getDocumentToken: (id: string) => request<any>(`/documents/${id}/token`),
  getDocumentOCR: (id: string) => request<any>(`/documents/${id}/ocr`),
  confirmOCR: (id: string) => request<any>(`/documents/${id}/ocr/confirm`, { method: 'POST' }),

  // Verification
  getVerificationQueue: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any>(`/verification/queue?${query}`);
  },
  getVerificationCase: (caseId: string) => request<any>(`/verification/${caseId}`),
  assignVerification: (caseId: string, officerId: string) =>
    request<any>(`/verification/${caseId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ officerId }),
    }),
  recordObservation: (caseId: string, observation: any) =>
    request<any>(`/verification/${caseId}/observations`, {
      method: 'POST',
      body: JSON.stringify(observation),
    }),
  recordExternalVerification: (caseId: string, payload: any) =>
    request<any>(`/verification/${caseId}/record-external`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  completeVerification: (caseId: string, outcome: string, remarks: string) =>
    request<any>(`/verification/${caseId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ outcome, remarks }),
    }),

  // Approvals
  getApprovalQueue: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any>(`/approvals/queue?${query}`);
  },
  getApprovalCase: (caseId: string) => request<any>(`/approvals/${caseId}`),
  recordApprovalDecision: (caseId: string, decision: string, remarks: string, reason?: string) =>
    request<any>(`/approvals/${caseId}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, remarks, reason }),
    }),

  // Maturity
  getMaturityCalendar: () => request<any>('/maturity/calendar'),
  getMaturityAlerts: () => request<any>('/maturity/alerts'),
  triggerMaturityScan: () => request<any>('/maturity/trigger-scan', { method: 'POST' }),

  // Renewals & Replacements
  getRenewals: () => request<any>('/renewals'),
  createRenewal: (data: any) => request<any>('/renewals', { method: 'POST', body: JSON.stringify(data) }),
  reviewRenewal: (id: string, status: string, remarks: string) =>
    request<any>(`/renewals/${id}/review`, { method: 'POST', body: JSON.stringify({ status, remarks }) }),

  // Releases & Refunds
  getReleases: () => request<any>('/releases'),
  createRelease: (data: any) => request<any>('/releases', { method: 'POST', body: JSON.stringify(data) }),
  decideRelease: (id: string, decision: string, remarks: string) =>
    request<any>(`/releases/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, remarks }),
    }),
  settleRelease: (id: string, externalSettlementReference: string, decisionRemarks?: string) =>
    request<any>(`/releases/${id}/settlement`, {
      method: 'POST',
      body: JSON.stringify({ externalSettlementReference, decisionRemarks }),
    }),

  // Institutions
  getInstitutions: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any>(`/institutions?${query}`);
  },
  getInstitution: (id: string) => request<any>(`/institutions/${id}`),
  updateInstitutionStatus: (id: string, status: string, remarks?: string) =>
    request<any>(`/institutions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, remarks }),
    }),
  createSecurityDeposit: (institutionId: string, data: any) =>
    request<any>(`/institutions/${institutionId}/security-deposits`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Users
  getUsers: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any>(`/users?${query}`);
  },
  createUser: (data: any) => request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  toggleUserStatus: (id: string, isActive: boolean) =>
    request<any>(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),

  // Notifications
  getNotifications: (unreadOnly = false) =>
    request<any>(`/notifications?unreadOnly=${unreadOnly}`),
  markNotificationRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request<any>('/notifications/read-all', { method: 'POST' }),

  // Reports
  getDashboardStats: () => request<any>('/reports/dashboard-stats'),
  getExportCSVUrl: () => `${BASE_URL}/reports/export-csv`,

  // Audit
  getAuditLogs: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any>(`/audit?${query}`);
  },

  // Integrations
  getIntegrationsStatus: () => request<any>('/integrations/status'),
};
