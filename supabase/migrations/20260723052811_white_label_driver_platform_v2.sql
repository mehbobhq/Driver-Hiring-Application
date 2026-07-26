/*
# White-Label Driver Application Platform — New Tables

## Summary
Adds new tables for the multi-tenant white-label platform on top of the existing schema.
All new tables are created with IF NOT EXISTS to be safe and idempotent.

## New Tables

1. **companies** — Tenant/employer records with per-tenant branding.
2. **admin_users** — Internal admin accounts linked to auth.users.
3. **driver_invitations** — Invite links tied to exact email+phone with driver type and company.
4. **otp_verifications** — Time-limited OTP codes with rate-limit tracking.
5. **wl_applications** — New application records linked to invitations (separate from existing driver_applications).
6. **wl_documents** — Document upload records linked to wl_applications.
7. **audit_logs** — Immutable audit trail for security events.

## Security
- RLS enabled on all new tables.
- All policies use anon+authenticated since drivers authenticate via OTP session, not Supabase auth.
- audit_logs has only SELECT and INSERT (no update/delete to preserve immutability).
*/

-- ============================================================
-- COMPANIES (tenants/employers)
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#1e40af',
  secondary_color text NOT NULL DEFAULT '#0f172a',
  accent_color text NOT NULL DEFAULT '#06b6d4',
  tagline text,
  contact_email text,
  contact_phone text,
  address text,
  city text,
  province_state text,
  postal_zip_code text,
  country text DEFAULT 'CA',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_select" ON companies;
CREATE POLICY "companies_select" ON companies FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "companies_insert" ON companies;
CREATE POLICY "companies_insert" ON companies FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "companies_update" ON companies;
CREATE POLICY "companies_update" ON companies FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "companies_delete" ON companies;
CREATE POLICY "companies_delete" ON companies FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- ADMIN USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_select" ON admin_users;
CREATE POLICY "admin_users_select" ON admin_users FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_users_insert" ON admin_users;
CREATE POLICY "admin_users_insert" ON admin_users FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_users_update" ON admin_users;
CREATE POLICY "admin_users_update" ON admin_users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- DRIVER INVITATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS driver_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invite_token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  driver_email text NOT NULL,
  driver_phone text NOT NULL,
  driver_first_name text,
  driver_last_name text,
  driver_type text NOT NULL DEFAULT 'canada_only' CHECK (driver_type IN ('canada_only', 'us_only', 'cross_border')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'opened', 'verified', 'in_progress', 'submitted', 'expired')),
  sent_via_email boolean NOT NULL DEFAULT false,
  sent_via_sms boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  opened_at timestamptz,
  verified_at timestamptz,
  submitted_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE driver_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invitations_select" ON driver_invitations;
CREATE POLICY "invitations_select" ON driver_invitations FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "invitations_insert" ON driver_invitations;
CREATE POLICY "invitations_insert" ON driver_invitations FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "invitations_update" ON driver_invitations;
CREATE POLICY "invitations_update" ON driver_invitations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- OTP VERIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES driver_invitations(id) ON DELETE CASCADE,
  otp_code text NOT NULL,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms')),
  is_used boolean NOT NULL DEFAULT false,
  attempts int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  resend_count int NOT NULL DEFAULT 0,
  last_resend_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "otp_select" ON otp_verifications;
CREATE POLICY "otp_select" ON otp_verifications FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "otp_insert" ON otp_verifications;
CREATE POLICY "otp_insert" ON otp_verifications FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "otp_update" ON otp_verifications;
CREATE POLICY "otp_update" ON otp_verifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- WL_APPLICATIONS (new white-label applications)
-- ============================================================
CREATE TABLE IF NOT EXISTS wl_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid UNIQUE NOT NULL REFERENCES driver_invitations(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  driver_type text NOT NULL CHECK (driver_type IN ('canada_only', 'us_only', 'cross_border')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'submitted', 'under_review', 'approved', 'rejected')),
  current_step int NOT NULL DEFAULT 1,
  personal_info jsonb NOT NULL DEFAULT '{}',
  license_info jsonb NOT NULL DEFAULT '{}',
  employment_history jsonb NOT NULL DEFAULT '[]',
  declarations jsonb NOT NULL DEFAULT '{}',
  consents jsonb NOT NULL DEFAULT '{}',
  signature_name text,
  signature_date date,
  signature_data text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE wl_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wl_apps_select" ON wl_applications;
CREATE POLICY "wl_apps_select" ON wl_applications FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "wl_apps_insert" ON wl_applications;
CREATE POLICY "wl_apps_insert" ON wl_applications FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "wl_apps_update" ON wl_applications;
CREATE POLICY "wl_apps_update" ON wl_applications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- WL_DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS wl_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES wl_applications(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_label text NOT NULL,
  is_mandatory boolean NOT NULL DEFAULT false,
  file_name text,
  file_size int,
  file_url text,
  mime_type text,
  validation_status text NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'rejected')),
  validation_notes text,
  uploaded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE wl_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wl_docs_select" ON wl_documents;
CREATE POLICY "wl_docs_select" ON wl_documents FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "wl_docs_insert" ON wl_documents;
CREATE POLICY "wl_docs_insert" ON wl_documents FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "wl_docs_update" ON wl_documents;
CREATE POLICY "wl_docs_update" ON wl_documents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "wl_docs_delete" ON wl_documents;
CREATE POLICY "wl_docs_delete" ON wl_documents FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  actor_email text,
  actor_ip text,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select" ON audit_logs;
CREATE POLICY "audit_select" ON audit_logs FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "audit_insert" ON audit_logs;
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_invitations_token ON driver_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_invitations_company ON driver_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON driver_invitations(driver_email);
CREATE INDEX IF NOT EXISTS idx_otp_invitation ON otp_verifications(invitation_id);
CREATE INDEX IF NOT EXISTS idx_wl_apps_invitation ON wl_applications(invitation_id);
CREATE INDEX IF NOT EXISTS idx_wl_apps_company ON wl_applications(company_id);
CREATE INDEX IF NOT EXISTS idx_wl_docs_application ON wl_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
