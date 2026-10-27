-- AICTE Security Deposit / FDR Management Portal
-- PostgreSQL Production DDL Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM (
    'SUPER_ADMIN',
    'INSTITUTION_ADMIN',
    'INSTITUTION_STAFF',
    'VERIFICATION_OFFICER',
    'APPROVING_AUTHORITY',
    'AUDITOR'
);

CREATE TYPE institution_status AS ENUM (
    'PENDING_APPROVAL',
    'ACTIVE',
    'SUSPENDED',
    'REJECTED'
);

CREATE TYPE fdr_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'UNDER_REVIEW',
    'VERIFIED',
    'DISCREPANT',
    'APPROVED',
    'REJECTED',
    'RETURNED_FOR_CORRECTION',
    'MATURED',
    'RENEWED',
    'RELEASED'
);

CREATE TYPE verification_status AS ENUM (
    'NOT_SUBMITTED',
    'PENDING_VERIFICATION',
    'UNDER_REVIEW',
    'ADDITIONAL_INFO_REQUIRED',
    'DISCREPANCY_FOUND',
    'VERIFICATION_RECORDED',
    'VERIFICATION_FAILED',
    'READY_FOR_APPROVAL'
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Institutions table
CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    official_identifier VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    pin_code VARCHAR(10) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    approval_reference VARCHAR(150) NOT NULL,
    account_status institution_status NOT NULL DEFAULT 'PENDING_APPROVAL',
    registration_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Institution Memberships table
CREATE TABLE institution_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    role_in_inst VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_institution UNIQUE (user_id, institution_id)
);

-- Security Deposits table
CREATE TABLE security_deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    deposit_reference VARCHAR(100) UNIQUE NOT NULL,
    program_category VARCHAR(100) NOT NULL,
    required_amount NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- FDR Records table
CREATE TABLE fdr_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    security_deposit_id UUID REFERENCES security_deposits(id) ON DELETE SET NULL,
    fdr_number VARCHAR(100) NOT NULL,
    issuing_bank VARCHAR(150) NOT NULL,
    bank_branch VARCHAR(150) NOT NULL,
    ifsc_code VARCHAR(20),
    deposit_amount NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    issue_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    validity_date DATE,
    joint_name VARCHAR(255),
    account_status fdr_status NOT NULL DEFAULT 'DRAFT',
    verification_status verification_status NOT NULL DEFAULT 'NOT_SUBMITTED',
    auto_renewal BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    is_potential_duplicate BOOLEAN NOT NULL DEFAULT false,
    duplicate_notes TEXT,
    created_by_id VARCHAR(255) NOT NULL,
    updated_by_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fdr_records_fdr_number ON fdr_records(fdr_number);
CREATE INDEX idx_fdr_records_inst ON fdr_records(institution_id);
CREATE INDEX idx_fdr_records_status ON fdr_records(account_status);
CREATE INDEX idx_fdr_records_maturity ON fdr_records(maturity_date);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    fdr_id UUID REFERENCES fdr_records(id) ON DELETE SET NULL,
    document_type VARCHAR(100) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    uploaded_by_id VARCHAR(255) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- OCR Results table
CREATE TABLE ocr_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID UNIQUE NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    fdr_id UUID NOT NULL REFERENCES fdr_records(id) ON DELETE CASCADE,
    extracted_fdr_number VARCHAR(100),
    extracted_bank_name VARCHAR(150),
    extracted_amount NUMERIC(14, 2),
    extracted_issue_date DATE,
    extracted_maturity_date DATE,
    raw_text TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    confidence_score REAL,
    mismatch_flags TEXT,
    reviewer_confirmed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Verification Cases table
CREATE TABLE verification_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fdr_id UUID NOT NULL REFERENCES fdr_records(id) ON DELETE CASCADE,
    assigned_officer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    external_verification_type VARCHAR(100) NOT NULL DEFAULT 'NOT_APPLICABLE',
    external_verification_reference VARCHAR(255),
    external_verification_notes TEXT,
    outcome VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Verification Observations table
CREATE TABLE verification_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES verification_cases(id) ON DELETE CASCADE,
    officer_id VARCHAR(255) NOT NULL,
    observation_type VARCHAR(100) NOT NULL,
    field_name VARCHAR(100),
    entered_value TEXT,
    observed_value TEXT,
    remarks TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Approval Cases table
CREATE TABLE approval_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fdr_id UUID NOT NULL REFERENCES fdr_records(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL DEFAULT 'STAGE_1_SCRUTINY',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    current_approver_role VARCHAR(50) NOT NULL DEFAULT 'APPROVING_AUTHORITY',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Approval Decisions table
CREATE TABLE approval_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES approval_cases(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    decision VARCHAR(50) NOT NULL,
    previous_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    remarks TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Renewal Requests table
CREATE TABLE renewal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    old_fdr_id UUID NOT NULL REFERENCES fdr_records(id) ON DELETE CASCADE,
    new_fdr_id UUID REFERENCES fdr_records(id) ON DELETE SET NULL,
    institution_id UUID NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
    submission_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewer_remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Release/Refund Requests table
CREATE TABLE release_refund_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(100) UNIQUE NOT NULL,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    security_deposit_id UUID NOT NULL REFERENCES security_deposits(id) ON DELETE CASCADE,
    fdr_id UUID NOT NULL REFERENCES fdr_records(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL,
    request_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    requested_amount NUMERIC(14, 2) NOT NULL,
    reason TEXT NOT NULL,
    condition_checklist TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
    external_settlement_reference VARCHAR(255),
    decision_remarks TEXT,
    decided_by_id VARCHAR(255),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(100) NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'NORMAL',
    related_resource_id VARCHAR(255),
    related_resource_type VARCHAR(100),
    is_read BOOLEAN NOT NULL DEFAULT false,
    email_sent BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audit Events table (Append-only)
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_email VARCHAR(255),
    actor_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    details TEXT,
    ip_address VARCHAR(50),
    correlation_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_events_resource ON audit_events(resource_type, resource_id);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at);

-- Maturity Schedule Jobs table
CREATE TABLE maturity_schedule_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type VARCHAR(100) NOT NULL,
    target_date TIMESTAMPTZ NOT NULL,
    fdr_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    reminder_sent_days INTEGER NOT NULL,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_fdr_reminder UNIQUE (fdr_id, reminder_sent_days)
);

-- System Config table
CREATE TABLE system_configs (
    id VARCHAR(100) PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
