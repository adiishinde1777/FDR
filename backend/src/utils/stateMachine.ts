import { FDRStatus, VerificationStatus, ApprovalDecisionType, ReleaseRequestStatus } from '../config/constants';

// FDR Status State Machine
const FDR_TRANSITIONS: Record<FDRStatus, FDRStatus[]> = {
  [FDRStatus.DRAFT]: [FDRStatus.SUBMITTED],
  [FDRStatus.SUBMITTED]: [FDRStatus.UNDER_REVIEW, FDRStatus.RETURNED_FOR_CORRECTION],
  [FDRStatus.UNDER_REVIEW]: [FDRStatus.VERIFIED, FDRStatus.DISCREPANT, FDRStatus.RETURNED_FOR_CORRECTION],
  [FDRStatus.VERIFIED]: [FDRStatus.APPROVED, FDRStatus.REJECTED, FDRStatus.RETURNED_FOR_CORRECTION],
  [FDRStatus.DISCREPANT]: [FDRStatus.UNDER_REVIEW, FDRStatus.RETURNED_FOR_CORRECTION, FDRStatus.REJECTED],
  [FDRStatus.RETURNED_FOR_CORRECTION]: [FDRStatus.SUBMITTED],
  [FDRStatus.APPROVED]: [FDRStatus.MATURED, FDRStatus.RENEWED, FDRStatus.RELEASED],
  [FDRStatus.MATURED]: [FDRStatus.RENEWED, FDRStatus.RELEASED],
  [FDRStatus.RENEWED]: [],
  [FDRStatus.RELEASED]: [],
  [FDRStatus.REJECTED]: [FDRStatus.SUBMITTED], // After resubmission/reopening by admin
};

export function canTransitionFDR(current: FDRStatus, next: FDRStatus): boolean {
  if (current === next) return true;
  const allowed = FDR_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}

// Verification Status State Machine
const VERIFICATION_TRANSITIONS: Record<VerificationStatus, VerificationStatus[]> = {
  [VerificationStatus.NOT_SUBMITTED]: [VerificationStatus.PENDING_VERIFICATION],
  [VerificationStatus.PENDING_VERIFICATION]: [VerificationStatus.UNDER_REVIEW],
  [VerificationStatus.UNDER_REVIEW]: [
    VerificationStatus.ADDITIONAL_INFO_REQUIRED,
    VerificationStatus.DISCREPANCY_FOUND,
    VerificationStatus.VERIFICATION_RECORDED,
    VerificationStatus.READY_FOR_APPROVAL,
    VerificationStatus.VERIFICATION_FAILED,
  ],
  [VerificationStatus.ADDITIONAL_INFO_REQUIRED]: [VerificationStatus.UNDER_REVIEW],
  [VerificationStatus.DISCREPANCY_FOUND]: [VerificationStatus.UNDER_REVIEW, VerificationStatus.VERIFICATION_FAILED],
  [VerificationStatus.VERIFICATION_RECORDED]: [VerificationStatus.READY_FOR_APPROVAL],
  [VerificationStatus.READY_FOR_APPROVAL]: [],
  [VerificationStatus.VERIFICATION_FAILED]: [VerificationStatus.UNDER_REVIEW],
};

export function canTransitionVerification(current: VerificationStatus, next: VerificationStatus): boolean {
  if (current === next) return true;
  const allowed = VERIFICATION_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}

// Release Status State Machine
const RELEASE_TRANSITIONS: Record<ReleaseRequestStatus, ReleaseRequestStatus[]> = {
  [ReleaseRequestStatus.SUBMITTED]: [ReleaseRequestStatus.UNDER_REVIEW, ReleaseRequestStatus.REJECTED],
  [ReleaseRequestStatus.UNDER_REVIEW]: [
    ReleaseRequestStatus.ADDITIONAL_INFO_REQUIRED,
    ReleaseRequestStatus.APPROVED,
    ReleaseRequestStatus.REJECTED,
  ],
  [ReleaseRequestStatus.ADDITIONAL_INFO_REQUIRED]: [ReleaseRequestStatus.UNDER_REVIEW],
  [ReleaseRequestStatus.APPROVED]: [ReleaseRequestStatus.PROCESSING],
  [ReleaseRequestStatus.PROCESSING]: [ReleaseRequestStatus.SETTLED_EXTERNAL, ReleaseRequestStatus.CLOSED],
  [ReleaseRequestStatus.SETTLED_EXTERNAL]: [ReleaseRequestStatus.CLOSED],
  [ReleaseRequestStatus.CLOSED]: [],
  [ReleaseRequestStatus.REJECTED]: [],
};

export function canTransitionRelease(current: ReleaseRequestStatus, next: ReleaseRequestStatus): boolean {
  if (current === next) return true;
  const allowed = RELEASE_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}
