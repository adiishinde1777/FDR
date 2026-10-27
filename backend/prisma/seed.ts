import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function hash(pwd: string) {
  return bcrypt.hash(pwd, 10);
}

async function main() {
  console.log('Seeding synthetic demonstration data for AICTE FDR Portal...');

  // 1. Create Users
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@aicte-india.org' },
    update: {},
    create: {
      email: 'superadmin@aicte-india.org',
      passwordHash: await hash('Admin@AICTE2026!'),
      fullName: 'Dr. R. K. Srivastav (Super Admin)',
      role: 'SUPER_ADMIN',
      phone: '+91 9811002233',
      isActive: true,
    },
  });

  const verificationOfficer = await prisma.user.upsert({
    where: { email: 'officer.sharma@aicte-india.org' },
    update: {},
    create: {
      email: 'officer.sharma@aicte-india.org',
      passwordHash: await hash('Officer@AICTE2026!'),
      fullName: 'Sunita Sharma (Senior Scrutiny Officer)',
      role: 'VERIFICATION_OFFICER',
      phone: '+91 9811004455',
      isActive: true,
    },
  });

  const approvingAuthority = await prisma.user.upsert({
    where: { email: 'approver.verma@aicte-india.org' },
    update: {},
    create: {
      email: 'approver.verma@aicte-india.org',
      passwordHash: await hash('Approver@AICTE2026!'),
      fullName: 'Prof. Anil Verma (Competent Approving Authority)',
      role: 'APPROVING_AUTHORITY',
      phone: '+91 9811006677',
      isActive: true,
    },
  });

  const auditor = await prisma.user.upsert({
    where: { email: 'auditor.read@aicte-india.org' },
    update: {},
    create: {
      email: 'auditor.read@aicte-india.org',
      passwordHash: await hash('Auditor@AICTE2026!'),
      fullName: 'Pooja Nair (Financial Audit Officer)',
      role: 'AUDITOR',
      phone: '+91 9811008899',
      isActive: true,
    },
  });

  const instUserDelhi = await prisma.user.upsert({
    where: { email: 'admin@delhi-tech.edu.in' },
    update: {},
    create: {
      email: 'admin@delhi-tech.edu.in',
      passwordHash: await hash('College@AICTE2026!'),
      fullName: 'Dr. Mahesh Gupta (Registrar, DITM)',
      role: 'INSTITUTION_ADMIN',
      phone: '+91 9822334455',
      isActive: true,
    },
  });

  const instUserMumbai = await prisma.user.upsert({
    where: { email: 'admin@mumbai-eng.edu.in' },
    update: {},
    create: {
      email: 'admin@mumbai-eng.edu.in',
      passwordHash: await hash('College@AICTE2026!'),
      fullName: 'Prof. Rajesh Kulkarni (Principal, MCER)',
      role: 'INSTITUTION_ADMIN',
      phone: '+91 9833445566',
      isActive: true,
    },
  });

  console.log('Users seeded.');

  // 2. Create Institutions
  const instDelhi = await prisma.institution.upsert({
    where: { officialIdentifier: 'AICTE-1-4928172' },
    update: {},
    create: {
      officialIdentifier: 'AICTE-1-4928172',
      name: 'Delhi Institute of Technology & Management',
      address: 'Plot 4, Institutional Area, Sector 12, Dwarka',
      state: 'Delhi',
      district: 'South West Delhi',
      pinCode: '110075',
      contactEmail: 'registrar@delhi-tech.edu.in',
      contactPhone: '011-28081122',
      approvalReference: 'F.No. North-West/1-4928172/2024/EOA',
      accountStatus: 'ACTIVE',
    },
  });

  const instMumbai = await prisma.institution.upsert({
    where: { officialIdentifier: 'AICTE-1-8392019' },
    update: {},
    create: {
      officialIdentifier: 'AICTE-1-8392019',
      name: 'Mumbai College of Engineering & Research',
      address: 'Survey No. 89, Powai Lake Road, Powai',
      state: 'Maharashtra',
      district: 'Mumbai Suburban',
      pinCode: '400076',
      contactEmail: 'principal@mumbai-eng.edu.in',
      contactPhone: '022-25704433',
      approvalReference: 'F.No. Western/1-8392019/2024/EOA',
      accountStatus: 'ACTIVE',
    },
  });

  const instBangalore = await prisma.institution.upsert({
    where: { officialIdentifier: 'AICTE-1-9920182' },
    update: {},
    create: {
      officialIdentifier: 'AICTE-1-9920182',
      name: 'Bangalore Polytechnic Academy',
      address: 'Outer Ring Road, Marathahalli',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      pinCode: '560037',
      contactEmail: 'info@bpa-edu.in',
      contactPhone: '080-41223344',
      approvalReference: 'NEW-REG-KAR-2026-009',
      accountStatus: 'PENDING_APPROVAL',
    },
  });

  // 3. Link Memberships
  await prisma.institutionMembership.upsert({
    where: { userId_institutionId: { userId: instUserDelhi.id, institutionId: instDelhi.id } },
    update: {},
    create: {
      userId: instUserDelhi.id,
      institutionId: instDelhi.id,
      roleInInst: 'ADMIN',
    },
  });

  await prisma.institutionMembership.upsert({
    where: { userId_institutionId: { userId: instUserMumbai.id, institutionId: instMumbai.id } },
    update: {},
    create: {
      userId: instUserMumbai.id,
      institutionId: instMumbai.id,
      roleInInst: 'ADMIN',
    },
  });

  // 4. Create Security Deposit Obligations
  const sdDelhiEng = await prisma.securityDeposit.upsert({
    where: { depositReference: 'SD-DEL-2024-ENG-01' },
    update: {},
    create: {
      institutionId: instDelhi.id,
      depositReference: 'SD-DEL-2024-ENG-01',
      programCategory: 'Engineering & Technology (UG & PG)',
      requiredAmount: 3500000.0,
      currency: 'INR',
      status: 'ACTIVE',
      notes: 'Security deposit for 4 B.Tech and 2 M.Tech AICTE approved programs.',
    },
  });

  const sdMumbaiMgt = await prisma.securityDeposit.upsert({
    where: { depositReference: 'SD-MUM-2023-MGT-02' },
    update: {},
    create: {
      institutionId: instMumbai.id,
      depositReference: 'SD-MUM-2023-MGT-02',
      programCategory: 'Management Studies (MBA/PGDM)',
      requiredAmount: 1500000.0,
      currency: 'INR',
      status: 'ACTIVE',
      notes: 'Mandatory joint fixed deposit for 2-year MBA intake.',
    },
  });

  // 5. Create FDR Records
  const now = new Date();
  const date45DaysLater = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
  const date12DaysLater = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000);
  const date30DaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const date3YearsAgo = new Date(now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000);

  // FDR 1: Active Approved FDR (Delhi)
  const fdr1 = await prisma.fDRRecord.upsert({
    where: { id: 'fdr-delhi-approved-001' },
    update: {},
    create: {
      id: 'fdr-delhi-approved-001',
      institutionId: instDelhi.id,
      securityDepositId: sdDelhiEng.id,
      fdrNumber: 'SBI-DEL-2024-8831',
      issuingBank: 'State Bank of India',
      bankBranch: 'Connaught Place Main Branch, New Delhi',
      ifscCode: 'SBIN0000691',
      depositAmount: 3500000.0,
      currency: 'INR',
      issueDate: date3YearsAgo,
      maturityDate: date45DaysLater,
      jointName: 'Regional Officer, AICTE & Registrar, DITM',
      accountStatus: 'APPROVED',
      verificationStatus: 'READY_FOR_APPROVAL',
      autoRenewal: false,
      notes: 'Fully verified joint FDR in compliance with AICTE Approval Process Handbook (APH).',
      createdById: instUserDelhi.id,
    },
  });

  // FDR 2: Maturing in 12 Days (Mumbai - triggers warning alert)
  const fdr2 = await prisma.fDRRecord.upsert({
    where: { id: 'fdr-mumbai-maturing-002' },
    update: {},
    create: {
      id: 'fdr-mumbai-maturing-002',
      institutionId: instMumbai.id,
      securityDepositId: sdMumbaiMgt.id,
      fdrNumber: 'PNB-MUM-2023-1109',
      issuingBank: 'Punjab National Bank',
      bankBranch: 'Fort Business Branch, Mumbai',
      ifscCode: 'PUNB0011200',
      depositAmount: 1500000.0,
      currency: 'INR',
      issueDate: date3YearsAgo,
      maturityDate: date12DaysLater,
      jointName: 'Regional Officer, Western Regional Office AICTE & Principal MCER',
      accountStatus: 'APPROVED',
      verificationStatus: 'READY_FOR_APPROVAL',
      autoRenewal: true,
      notes: 'Maturing in 12 days. Reminder job active.',
      createdById: instUserMumbai.id,
    },
  });

  // FDR 3: Matured FDR (Delhi - ready for renewal or release)
  const fdr3 = await prisma.fDRRecord.upsert({
    where: { id: 'fdr-delhi-matured-003' },
    update: {},
    create: {
      id: 'fdr-delhi-matured-003',
      institutionId: instDelhi.id,
      securityDepositId: sdDelhiEng.id,
      fdrNumber: 'CAN-DEL-2021-9944',
      issuingBank: 'Canara Bank',
      bankBranch: 'Janakpuri Branch, New Delhi',
      ifscCode: 'CNRB0002130',
      depositAmount: 1000000.0,
      currency: 'INR',
      issueDate: new Date('2021-08-15'),
      maturityDate: date30DaysAgo,
      jointName: 'Regional Officer, AICTE & Registrar, DITM',
      accountStatus: 'MATURED',
      verificationStatus: 'READY_FOR_APPROVAL',
      autoRenewal: false,
      notes: 'Tenure expired last month. Renewal request initiated.',
      createdById: instUserDelhi.id,
    },
  });

  // FDR 4: Discrepancy Found (Mumbai)
  const fdr4 = await prisma.fDRRecord.upsert({
    where: { id: 'fdr-mumbai-discrepant-004' },
    update: {},
    create: {
      id: 'fdr-mumbai-discrepant-004',
      institutionId: instMumbai.id,
      securityDepositId: sdMumbaiMgt.id,
      fdrNumber: 'BOB-MUM-2024-5512',
      issuingBank: 'Bank of Baroda',
      bankBranch: 'Andheri East Branch, Mumbai',
      ifscCode: 'BARB0ANDHER',
      depositAmount: 1500000.0,
      currency: 'INR',
      issueDate: new Date('2024-01-10'),
      maturityDate: new Date('2027-01-10'),
      jointName: 'Principal MCER', // Missing AICTE joint name!
      accountStatus: 'DISCREPANT',
      verificationStatus: 'DISCREPANCY_FOUND',
      autoRenewal: false,
      notes: 'Discrepancy: AICTE Regional Officer name omitted in joint title. Rectification required.',
      createdById: instUserMumbai.id,
    },
  });

  // FDR 5: Draft FDR (Delhi)
  const fdr5 = await prisma.fDRRecord.upsert({
    where: { id: 'fdr-delhi-draft-005' },
    update: {},
    create: {
      id: 'fdr-delhi-draft-005',
      institutionId: instDelhi.id,
      securityDepositId: sdDelhiEng.id,
      fdrNumber: 'HDFC-DEL-2026-0043',
      issuingBank: 'HDFC Bank',
      bankBranch: 'Sector 10 Dwarka, New Delhi',
      ifscCode: 'HDFC0001234',
      depositAmount: 2500000.0,
      currency: 'INR',
      issueDate: now,
      maturityDate: new Date(now.getTime() + 3 * 365 * 24 * 60 * 60 * 1000),
      jointName: 'Regional Officer, AICTE & Registrar, DITM',
      accountStatus: 'DRAFT',
      verificationStatus: 'NOT_SUBMITTED',
      autoRenewal: false,
      notes: 'Draft FDR awaiting final bank certificate scan upload.',
      createdById: instUserDelhi.id,
    },
  });

  // 6. Documents and OCR Extraction for FDR 1 and FDR 4
  const doc1 = await prisma.document.upsert({
    where: { id: 'doc-sbi-fdr-8831' },
    update: {},
    create: {
      id: 'doc-sbi-fdr-8831',
      institutionId: instDelhi.id,
      fdrId: fdr1.id,
      documentType: 'FDR_RECEIPT',
      originalFilename: 'SBI_FDR_Receipt_8831.pdf',
      storagePath: 'sample_sbi_fdr_8831.pdf',
      mimeType: 'application/pdf',
      fileSize: 421890,
      checksumSha256: crypto.createHash('sha256').update('sbi-fdr-8831-sample-content').digest('hex'),
      uploadedById: instUserDelhi.id,
    },
  });

  await prisma.oCRResult.upsert({
    where: { documentId: doc1.id },
    update: {},
    create: {
      documentId: doc1.id,
      fdrId: fdr1.id,
      extractedFdrNumber: 'SBI-DEL-2024-8831',
      extractedBankName: 'State Bank of India',
      extractedAmount: 3500000.0,
      extractedIssueDate: fdr1.issueDate,
      extractedMaturityDate: fdr1.maturityDate,
      rawText: 'STATE BANK OF INDIA\nTERM DEPOSIT RECEIPT\nReceipt Ref: SBI-DEL-2024-8831\nAmount: Rs. 35,00,000.00\nJoint Holders: RO AICTE & Registrar DITM',
      status: 'COMPLETED',
      confidenceScore: 0.98,
      reviewerConfirmed: true,
    },
  });

  const doc4 = await prisma.document.upsert({
    where: { id: 'doc-bob-fdr-5512' },
    update: {},
    create: {
      id: 'doc-bob-fdr-5512',
      institutionId: instMumbai.id,
      fdrId: fdr4.id,
      documentType: 'FDR_RECEIPT',
      originalFilename: 'BOB_Receipt_Scanned.png',
      storagePath: 'sample_bob_fdr_5512.png',
      mimeType: 'image/png',
      fileSize: 612800,
      checksumSha256: crypto.createHash('sha256').update('bob-fdr-5512-sample-content').digest('hex'),
      uploadedById: instUserMumbai.id,
    },
  });

  await prisma.oCRResult.upsert({
    where: { documentId: doc4.id },
    update: {},
    create: {
      documentId: doc4.id,
      fdrId: fdr4.id,
      extractedFdrNumber: 'BOB-MUM-2024-5512',
      extractedBankName: 'Bank of Baroda',
      extractedAmount: 1500000.0,
      extractedIssueDate: fdr4.issueDate,
      extractedMaturityDate: fdr4.maturityDate,
      rawText: 'BANK OF BARODA\nFIXED DEPOSIT RECEIPT\nHolder: Principal, MCER Only\nAmount: Rs. 15,00,000.00',
      status: 'NEEDS_MANUAL_REVIEW',
      confidenceScore: 0.75,
      mismatchFlags: JSON.stringify({
        jointName: { entered: 'Principal MCER', extracted: 'Sole Account Holder (AICTE missing)' },
      }),
      reviewerConfirmed: false,
    },
  });

  // 7. Verification Cases & Observations
  const vCase4 = await prisma.verificationCase.upsert({
    where: { id: 'vcase-bob-5512' },
    update: {},
    create: {
      id: 'vcase-bob-5512',
      fdrId: fdr4.id,
      assignedOfficerId: verificationOfficer.id,
      status: 'ADDITIONAL_INFO_REQUESTED',
      externalVerificationType: 'MANUAL_DOCUMENT_CHECK',
      externalVerificationReference: 'SCRUTINY-MUM-2026-901',
      externalVerificationNotes: 'Document reviewed. Joint operational mandate with AICTE Regional Officer is missing on the instrument face.',
      outcome: 'DISCREPANCY_DETECTED',
    },
  });

  await prisma.verificationObservation.create({
    data: {
      caseId: vCase4.id,
      officerId: verificationOfficer.id,
      observationType: 'DATA_MISMATCH',
      fieldName: 'jointName',
      enteredValue: 'Principal MCER',
      observedValue: 'Missing mandatory AICTE Regional Officer endorsement',
      remarks: 'As per AICTE Chapter I clause 1.4(d), all security deposit FDRs must be in joint name with AICTE.',
    },
  });

  // 8. Approval Case & Decision for FDR 1
  const aCase1 = await prisma.approvalCase.upsert({
    where: { id: 'acase-sbi-8831' },
    update: {},
    create: {
      id: 'acase-sbi-8831',
      fdrId: fdr1.id,
      stage: 'STAGE_2_FINANCIAL_APPROVER',
      status: 'APPROVED',
      currentApproverRole: 'APPROVING_AUTHORITY',
    },
  });

  await prisma.approvalDecision.create({
    data: {
      caseId: aCase1.id,
      approverId: approvingAuthority.id,
      decision: 'APPROVED',
      previousStatus: 'VERIFIED',
      newStatus: 'APPROVED',
      remarks: 'Fixed deposit instrument satisfies all prescribed norms of AICTE Approval Process Handbook. Approved.',
    },
  });

  // 9. Renewal Request for Matured FDR 3
  await prisma.renewalRequest.create({
    data: {
      oldFdrId: fdr3.id,
      newFdrId: fdr5.id,
      institutionId: instDelhi.id,
      reason: 'FDR tenure expired on scheduled maturity. Submitted replacement FDR from HDFC Bank with enhanced coverage.',
      status: 'SUBMITTED',
    },
  });

  // 10. Release Refund Request
  await prisma.releaseRefundRequest.upsert({
    where: { requestNumber: 'REL-AICTE-2026-0001' },
    update: {},
    create: {
      requestNumber: 'REL-AICTE-2026-0001',
      institutionId: instDelhi.id,
      securityDepositId: sdDelhiEng.id,
      fdrId: fdr3.id,
      requestType: 'PARTIAL_RELEASE',
      requestedAmount: 1000000.0,
      reason: 'Closure of discontinued diploma intake following academic council approval and AICTE NOC.',
      conditionChecklist: JSON.stringify([
        'AICTE NOC Certificate received',
        'No pending student grievances or inquiries',
        'State Directorate of Technical Education concurrence letter attached',
      ]),
      status: 'UNDER_REVIEW',
    },
  });

  // 11. Initial Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: instUserMumbai.id,
        title: 'Upcoming Maturity Alert: FDR #PNB-MUM-2023-1109',
        message: 'FDR #PNB-MUM-2023-1109 (INR 15,00,000) will mature in 12 days. Please initiate renewal or replacement request.',
        type: 'MATURITY_REMINDER',
        priority: 'HIGH',
        relatedResourceId: fdr2.id,
        relatedResourceType: 'FDR',
      },
      {
        userId: instUserMumbai.id,
        title: 'Scrutiny Discrepancy Flagged: FDR #BOB-MUM-2024-5512',
        message: 'Joint endorsement with Regional Officer AICTE missing. Please provide rectified FDR or bank addendum.',
        type: 'DISCREPANCY_FLAGGED',
        priority: 'URGENT',
        relatedResourceId: fdr4.id,
        relatedResourceType: 'FDR',
      },
      {
        userId: verificationOfficer.id,
        title: 'New Verification Queue Item',
        message: 'FDR #BOB-MUM-2024-5512 assigned for document scrutiny.',
        type: 'VERIFICATION_ASSIGNED',
        priority: 'NORMAL',
        relatedResourceId: vCase4.id,
        relatedResourceType: 'VERIFICATION',
      },
    ],
  });

  // 12. Initial Audit Events
  await prisma.auditEvent.createMany({
    data: [
      {
        actorId: superAdmin.id,
        actorEmail: superAdmin.email,
        actorRole: superAdmin.role,
        action: 'SYSTEM_BOOTSTRAP',
        resourceType: 'SYSTEM',
        details: JSON.stringify({ message: 'Portal initialized with production security defaults and seed data.' }),
      },
      {
        actorId: approvingAuthority.id,
        actorEmail: approvingAuthority.email,
        actorRole: approvingAuthority.role,
        action: 'APPROVAL_DECISION_RECORDED',
        resourceType: 'APPROVAL',
        resourceId: aCase1.id,
        details: JSON.stringify({ decision: 'APPROVED', fdrNumber: fdr1.fdrNumber, amount: 3500000 }),
      },
    ],
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
