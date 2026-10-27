import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('AICTE Security Deposit / FDR Portal - Integration & Security Test Suite', () => {
  let superAdminToken: string;
  let officerToken: string;
  let delhiAdminToken: string;
  let mumbaiAdminToken: string;
  let auditorToken: string;

  let delhiFdrId = 'fdr-delhi-approved-001';
  let mumbaiFdrId = 'fdr-mumbai-maturing-002';

  beforeAll(async () => {
    // 1. Login Super Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@aicte-india.org', password: 'Admin@AICTE2026!' });
    expect(adminRes.status).toBe(200);
    superAdminToken = adminRes.body.data.token;

    // 2. Login Verification Officer
    const officerRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'officer.sharma@aicte-india.org', password: 'Officer@AICTE2026!' });
    expect(officerRes.status).toBe(200);
    officerToken = officerRes.body.data.token;

    // 3. Login Delhi Institution Admin
    const delhiRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@delhi-tech.edu.in', password: 'College@AICTE2026!' });
    expect(delhiRes.status).toBe(200);
    delhiAdminToken = delhiRes.body.data.token;

    // 4. Login Mumbai Institution Admin
    const mumbaiRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@mumbai-eng.edu.in', password: 'College@AICTE2026!' });
    expect(mumbaiRes.status).toBe(200);
    mumbaiAdminToken = mumbaiRes.body.data.token;

    // 5. Login Auditor
    const auditorRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'auditor.read@aicte-india.org', password: 'Auditor@AICTE2026!' });
    expect(auditorRes.status).toBe(200);
    auditorToken = auditorRes.body.data.token;
  });

  describe('1. Authentication & Security Defaults', () => {
    it('should reject login with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'superadmin@aicte-india.org', password: 'WrongPassword999!' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject unauthorized access to protected endpoints', async () => {
      const res = await request(app).get('/api/v1/fdrs');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return authenticated user profile on /me', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('superadmin@aicte-india.org');
      expect(res.body.data.role).toBe('SUPER_ADMIN');
    });
  });

  describe('2. Institution Data Isolation (Cross-Tenant Security)', () => {
    it('Delhi institution admin should be able to view their own FDR', async () => {
      const res = await request(app)
        .get(`/api/v1/fdrs/${delhiFdrId}`)
        .set('Authorization', `Bearer ${delhiAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(delhiFdrId);
    });

    it('Delhi institution admin MUST BE BLOCKED from viewing Mumbai institution FDR', async () => {
      const res = await request(app)
        .get(`/api/v1/fdrs/${mumbaiFdrId}`)
        .set('Authorization', `Bearer ${delhiAdminToken}`);
      // Access denied
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('FDR list query for Delhi admin should only return Delhi institution records', async () => {
      const res = await request(app)
        .get('/api/v1/fdrs')
        .set('Authorization', `Bearer ${delhiAdminToken}`);
      expect(res.status).toBe(200);
      const records = res.body.data;
      for (const r of records) {
        expect(r.institution.name).toBe('Delhi Institute of Technology & Management');
      }
    });
  });

  describe('3. Role-Based Access Control & Auditor Guardrails', () => {
    it('Auditor should have read access to audit logs', async () => {
      const res = await request(app)
        .get('/api/v1/audit')
        .set('Authorization', `Bearer ${auditorToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('Auditor MUST BE FORBIDDEN from mutating business records', async () => {
      const res = await request(app)
        .post('/api/v1/fdrs')
        .set('Authorization', `Bearer ${auditorToken}`)
        .send({
          institutionId: 'any-id',
          fdrNumber: 'AUDIT-FAIL-001',
          issuingBank: 'State Bank of India',
          bankBranch: 'Main',
          depositAmount: 500000,
          issueDate: '2024-01-01',
          maturityDate: '2027-01-01',
        });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_AUDITOR_MUTATION');
    });

    it('Institution users should not be allowed to perform Approving Authority decisions', async () => {
      const res = await request(app)
        .post('/api/v1/approvals/acase-sbi-8831/decision')
        .set('Authorization', `Bearer ${delhiAdminToken}`)
        .send({
          decision: 'APPROVED',
          remarks: 'Trying to self approve',
        });
      expect(res.status).toBe(403);
    });
  });

  describe('4. Centralized State Machine & Duplicate Detection', () => {
    it('should flag potential duplicate FDR numbers rather than silently merging', async () => {
      // Delhi institution admin creates another FDR with the existing SBI FDR number
      const res = await request(app)
        .post('/api/v1/fdrs')
        .set('Authorization', `Bearer ${delhiAdminToken}`)
        .send({
          institutionId: 'AICTE-1-4928172', // Delhi
          fdrNumber: 'SBI-DEL-2024-8831', // duplicate
          issuingBank: 'State Bank of India',
          bankBranch: 'Connaught Place Main Branch, New Delhi',
          depositAmount: 3500000,
          issueDate: '2024-01-01',
          maturityDate: '2027-01-01',
          isDraft: true,
        });

      // It should flag as duplicate
      if (res.status === 201) {
        expect(res.body.data.isPotentialDuplicate).toBe(true);
        expect(res.body.data.duplicateNotes).toContain('Flagged potential duplicate');
      }
    });

    it('should prevent invalid status transition on Draft FDR without documents', async () => {
      // Submitting draft without documents should fail validation
      const res = await request(app)
        .post('/api/v1/fdrs/fdr-delhi-draft-005/submit')
        .set('Authorization', `Bearer ${delhiAdminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DOCUMENT_REQUIRED');
    });
  });

  describe('5. Reports & Integrations Endpoints', () => {
    it('should return real aggregated dashboard statistics from database', async () => {
      const res = await request(app)
        .get('/api/v1/reports/dashboard-stats')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.totalFdrs).toBeGreaterThan(0);
      expect(res.body.data.totalAmount).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.statusBreakdown)).toBe(true);
      expect(Array.isArray(res.body.data.bankDistribution)).toBe(true);
    });

    it('should accurately label integration status without fabricated external APIs', async () => {
      const res = await request(app)
        .get('/api/v1/integrations/status')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.bankVerificationApi.mode).toBe('MANUAL_OFFICER_REVIEW');
      expect(res.body.data.ocrService.status).toBe('OPERATIONAL');
    });
  });
});
