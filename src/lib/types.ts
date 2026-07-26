export type DriverType = 'canada_only' | 'us_only' | 'cross_border';
export type InvitationStatus = 'pending' | 'opened' | 'verified' | 'in_progress' | 'submitted' | 'expired';
export type ApplicationStatus = 'draft' | 'in_progress' | 'submitted' | 'under_review' | 'approved' | 'rejected';
export type AdminRole = 'super_admin' | 'admin';

export interface Company {
  id: string;
  company_name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  tagline: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  city: string | null;
  province_state: string | null;
  postal_zip_code: string | null;
  country: string;
  operating_region: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string | null;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
}

export interface DriverInvitation {
  id: string;
  company_id: string;
  invite_token: string;
  driver_email: string;
  driver_phone: string;
  driver_first_name: string | null;
  driver_last_name: string | null;
  driver_type: DriverType;
  status: InvitationStatus;
  sent_via_email: boolean;
  sent_via_sms: boolean;
  expires_at: string;
  opened_at: string | null;
  verified_at: string | null;
  submitted_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  company?: Company;
}

export interface OtpVerification {
  id: string;
  invitation_id: string;
  otp_code: string;
  channel: 'email' | 'sms';
  is_used: boolean;
  attempts: number;
  expires_at: string;
  resend_count: number;
  last_resend_at: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface WlApplication {
  id: string;
  invitation_id: string;
  company_id: string;
  driver_type: DriverType;
  status: ApplicationStatus;
  current_step: number;
  personal_info: Record<string, unknown>;
  license_info: Record<string, unknown>;
  employment_history: unknown[];
  declarations: Record<string, unknown>;
  consents: Record<string, unknown>;
  signature_name: string | null;
  signature_date: string | null;
  signature_data: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WlDocument {
  id: string;
  application_id: string;
  document_type: string;
  document_label: string;
  is_mandatory: boolean;
  file_name: string | null;
  file_size: number | null;
  file_url: string | null;
  mime_type: string | null;
  validation_status: 'pending' | 'valid' | 'rejected';
  validation_notes: string | null;
  uploaded_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  actor_email: string | null;
  actor_ip: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface BrandingConfig {
  company_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  tagline: string | null;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  company_name: 'Driver Portal',
  logo_url: null,
  primary_color: '#1e40af',
  secondary_color: '#0f172a',
  accent_color: '#06b6d4',
  tagline: 'Commercial Driver Application Portal',
};

export const DRIVER_TYPE_LABELS: Record<DriverType, string> = {
  canada_only: 'Canada Only',
  us_only: 'US Only',
  cross_border: 'Cross-Border',
};

export const DRIVER_TYPE_DESCRIPTIONS: Record<DriverType, string> = {
  canada_only: 'Operate exclusively within Canada',
  us_only: 'Operate exclusively within the United States',
  cross_border: 'Haul across the border between Canada and the US',
};

export const MANDATORY_DOCUMENTS = [
  { key: 'license_front', label: "Driver's License — Front" },
  { key: 'license_back', label: "Driver's License — Back" },
  { key: 'original_abstract', label: 'Original Abstract' },
  { key: 'annual_abstract', label: 'Annual Abstract' },
  { key: 'medical_certificate', label: 'Medical Certificate' },
];

export const OPTIONAL_DOCUMENTS = [
  { key: 'work_permit', label: 'Work Permit' },
  { key: 'visa', label: 'Visa' },
  { key: 'passport', label: 'Passport' },
  { key: 'other', label: 'Others' },
];

export const ALL_DOCUMENTS = [...MANDATORY_DOCUMENTS, ...OPTIONAL_DOCUMENTS];
