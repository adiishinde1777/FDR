export type UserRole =
  | 'SUPER_ADMIN'
  | 'INSTITUTION_ADMIN'
  | 'INSTITUTION_STAFF'
  | 'VERIFICATION_OFFICER'
  | 'APPROVING_AUTHORITY'
  | 'AUDITOR';

export type FDRStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'DISCREPANT'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED_FOR_CORRECTION'
  | 'MATURED'
  | 'RENEWED'
  | 'RELEASED';

export type VerificationStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING_VERIFICATION'
  | 'UNDER_REVIEW'
  | 'ADDITIONAL_INFO_REQUIRED'
  | 'DISCREPANCY_FOUND'
  | 'VERIFICATION_RECORDED'
  | 'VERIFICATION_FAILED'
  | 'READY_FOR_APPROVAL';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  isActive?: boolean;
  institutions?: Institution[];
}

export interface Institution {
  id: string;
  officialIdentifier: string;
  name: string;
  address: string;
  state: string;
  district: string;
  pinCode: string;
  contactEmail: string;
  contactPhone: string;
  approvalReference: string;
  accountStatus: 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  registrationDate?: string;
  createdAt?: string;
  securityDeposits?: SecurityDeposit[];
  _count?: {
    fdrs?: number;
    securityDeposits?: number;
    memberships?: number;
    documents?: number;
  };
}

export interface SecurityDeposit {
  id: string;
  institutionId: string;
  depositReference: string;
  programCategory: string;
  requiredAmount: number;
  currency: string;
  status: string;
  notes?: string;
  fdrs?: FDRRecord[];
}

export interface Document {
  id: string;
  institutionId: string;
  fdrId?: string;
  documentType: string;
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  checksumSha256: string;
  uploadedById: string;
  createdAt: string;
  ocrResult?: OCRResult;
}

export interface OCRResult {
  id: string;
  documentId: string;
  fdrId: string;
  extractedFdrNumber?: string;
  extractedBankName?: string;
  extractedAmount?: number;
  extractedIssueDate?: string;
  extractedMaturityDate?: string;
  rawText?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'NEEDS_MANUAL_REVIEW';
  confidenceScore?: number;
  mismatchFlags?: string;
  reviewerConfirmed: boolean;
  createdAt: string;
}

export interface VerificationObservation {
  id: string;
  caseId: string;
  officerId: string;
  observationType: string;
  fieldName?: string;
  enteredValue?: string;
  observedValue?: string;
  remarks: string;
  isResolved: boolean;
  createdAt: string;
}

export interface VerificationCase {
  id: string;
  fdrId: string;
  assignedOfficerId?: string;
  assignedOfficer?: { id: string; fullName: string; email: string };
  status: string;
  externalVerificationType: string;
  externalVerificationReference?: string;
  externalVerificationNotes?: string;
  outcome: string;
  createdAt: string;
  observations?: VerificationObservation[];
  fdr?: FDRRecord;
}

export interface ApprovalDecision {
  id: string;
  caseId: string;
  approverId: string;
  approver?: { id: string; fullName: string; role: string };
  decision: 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_CORRECTION';
  previousStatus: string;
  newStatus: string;
  remarks: string;
  reason?: string;
  createdAt: string;
}

export interface ApprovalCase {
  id: string;
  fdrId: string;
  stage: string;
  status: string;
  currentApproverRole: string;
  createdAt: string;
  decisions?: ApprovalDecision[];
  fdr?: FDRRecord;
}

export interface RenewalRequest {
  id: string;
  oldFdrId: string;
  newFdrId?: string;
  institutionId: string;
  reason: string;
  status: string;
  submissionDate: string;
  reviewerRemarks?: string;
  oldFdr?: FDRRecord;
  newFdr?: FDRRecord;
}

export interface ReleaseRefundRequest {
  id: string;
  requestNumber: string;
  institutionId: string;
  securityDepositId: string;
  fdrId: string;
  requestType: string;
  requestDate: string;
  requestedAmount: number;
  reason: string;
  conditionChecklist: string;
  status: string;
  externalSettlementReference?: string;
  decisionRemarks?: string;
  institution?: Institution;
  securityDeposit?: SecurityDeposit;
  fdr?: FDRRecord;
}

export interface FDRRecord {
  id: string;
  institutionId: string;
  institution?: Institution;
  securityDepositId?: string;
  securityDeposit?: SecurityDeposit;
  fdrNumber: string;
  issuingBank: string;
  bankBranch: string;
  ifscCode?: string;
  depositAmount: number;
  currency: string;
  issueDate: string;
  maturityDate: string;
  validityDate?: string;
  jointName?: string;
  accountStatus: FDRStatus;
  verificationStatus: VerificationStatus;
  autoRenewal: boolean;
  notes?: string;
  isPotentialDuplicate: boolean;
  duplicateNotes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  documents?: Document[];
  verificationCases?: VerificationCase[];
  approvalCases?: ApprovalCase[];
  releaseRequests?: ReleaseRefundRequest[];
  oldInRenewals?: RenewalRequest[];
  newInRenewals?: RenewalRequest[];
  _count?: {
    documents: number;
    verificationCases: number;
  };
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  relatedResourceId?: string;
  relatedResourceType?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditEventItem {
  id: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}
