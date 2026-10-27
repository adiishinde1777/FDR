# AICTE Security Deposit / FDR Management Portal

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.21-black.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748.svg)](https://www.prisma.io/)
[![Vitest](https://img.shields.io/badge/Vitest-3.0-green.svg)](https://vitest.dev/)

An enterprise-grade, secure, database-driven web application designed to administer the full lifecycle of security deposits and Fixed Deposit Receipts (FDRs) associated with **All India Council for Technical Education (AICTE)** statutory approvals.

This application is built with a real backend, persistent relational database, server-side session authentication, role-based authorization, institution data isolation, document management with private storage, automated OCR extraction, verification workflows, multi-stage approvals, background maturity monitoring, renewals, and append-only audit logging.

---

## 1. Quick Start Guide

### Prerequisites
- **Node.js**: v20.x or v22.x+ (tested on Node v26)
- **npm**: v10.x+
- **Docker & Docker Compose** (Optional, for containerized PostgreSQL deployment)

### Setup & Run Commands

```powershell
# 1. Install Dependencies for Backend and Frontend
cd backend
npm install
cd ../frontend
npm install
cd ..

# 2. Database Sync & Migrations
cd backend
npx prisma generate
npx prisma db push

# 3. Seed Synthetic Demonstration Data
npm run db:seed

# 4. Run Automated Test Suite (13 passing tests)
npm run test

# 5. Start Backend Server (Port 5000)
npm run dev

# 6. In a new terminal, Start Frontend Development Server (Port 5173)
cd frontend
npm run dev
```

The portal is now running at:
- **Frontend Portal**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **Interactive Swagger API Docs**: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 2. Test Accounts & Role Access Matrix

The seed script creates realistic synthetic accounts for immediate evaluation. A **1-Click Quick Role Switcher** is also available directly on the login screen and top navigation bar.

| Role | Email Address | Password | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@aicte-india.org` | `Admin@AICTE2026!` | Global user provisioning, institution approvals, system settings, audit logs. |
| **Verification Officer** | `officer.sharma@aicte-india.org` | `Officer@AICTE2026!` | Scrutiny queue, document review, discrepancy flagging, external cross-checks. |
| **Approving Authority** | `approver.verma@aicte-india.org` | `Approver@AICTE2026!` | Final financial sanction: Approve, Reject, or Return for Correction with remarks. |
| **Auditor (Read-Only)** | `auditor.read@aicte-india.org` | `Auditor@AICTE2026!` | Read-only inspection of audit events and histories; mutations physically blocked by middleware. |
| **Institution Admin (Delhi)** | `admin@delhi-tech.edu.in` | `College@AICTE2026!` | Scoped strictly to Delhi Institute of Tech (AICTE-1-4928172); FDR submit, renew, release. |
| **Institution Admin (Mumbai)** | `admin@mumbai-eng.edu.in` | `College@AICTE2026!` | Scoped strictly to Mumbai College of Eng (AICTE-1-8392019); cross-tenant access blocked. |

---

## 3. Key Architecture & Features

### A. Centralized State Machine
FDR instruments follow an unbypassable server-side state machine:
```
DRAFT -> SUBMITTED -> UNDER_REVIEW -> VERIFIED -> APPROVED -> MATURED -> RENEWED / RELEASED
                            \             \            \
                             v             v            v
                        DISCREPANT     REJECTED     RETURNED_FOR_CORRECTION
```

### B. Cross-Tenant Institution Data Isolation
Institution users are physically isolated by backend middleware:
- Attempting to inspect or modify another institution's FDR returns `403 Forbidden`.
- Verified by automated unit & integration tests (`tests/api.test.ts`).

### C. Private Object Storage & Authorized Downloads
- Uploaded PDF, JPEG, and PNG documents are renamed with server-side UUIDs and stored outside public web roots.
- SHA-256 checksums are calculated upon upload to ensure tamper detection.
- Documents are accessible solely via short-lived (5-minute) authorized download tokens.

### D. Automated OCR & Human Verification Matrix
- Optical character recognition extracts FDR number, issuing bank, principal deposit amount, and dates.
- Side-by-side comparison matrix flags mismatches for officer review.
- OCR results assist officers but do not claim proof of authenticity.

### E. Scheduled Maturity & Validity Monitoring
- Persistent background scheduler scans records periodically and recovers after server restart.
- Dispatches reminders at 30, 15, 7, and 0 days prior to maturity.
- Idempotent locks in `MaturityScheduleJob` prevent duplicate notifications.

### F. Renewal & Replacement Audit Trail
- Replacement instruments maintain a persistent foreign-key link to prior expired FDRs without destroying historical audit evidence.

### G. Security Deposit Release & Settlement
- Enforces mandatory compliance checklist (AICTE NOC, zero student inquiries, DTE concurrence).
- Accurately records external bank UTR/sanction order references without claiming automated money transfer.

### H. Append-Only Audit Trail
- Every authentication attempt, FDR creation, verification observation, approval decision, and document download is recorded with Actor ID, Role, Action, Resource, Timestamp, and Request Correlation ID.

---

## 4. Docker Deployment

To launch the full production stack with **PostgreSQL 16**, backend, and frontend containers:

```bash
# Start containerized stack
docker-compose up -d --build

# View container status
docker-compose ps

# Run database migrations in container
docker-compose exec backend npx prisma migrate deploy

# Stop stack
docker-compose down
```

---

## 5. Automated Tests

The application includes an automated test suite verifying:
- Authentication & password validation
- Cross-tenant data isolation
- Auditor mutation protection
- Duplicate FDR detection
- State machine transition validation
- Dashboard analytics aggregation

Run tests:
```bash
cd backend
npm run test
```

Output:
```
 ✓ tests/api.test.ts (13 tests)
 Test Files  1 passed (1)
      Tests  13 passed (13)
```

---

## 6. Backup & Recovery

### Automated Backup
```powershell
# Windows PowerShell
.\database\backup.ps1 -OutputDir "./backups"
```

### Restoration
```powershell
# Restore from backup file
.\database\restore.ps1 -BackupFile "./backups/dev_backup_20261026_210000.db"
```

---

## 7. License & Compliance
This software is developed strictly according to AICTE Approval Process Handbook (APH) specifications for educational administrative governance.

# FDR
