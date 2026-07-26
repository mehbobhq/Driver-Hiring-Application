-- Driver Applications Table
CREATE TABLE driver_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected')),
  current_step INTEGER DEFAULT 1,
  
  -- Step 1: Personal Information
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  sin_ssn TEXT,
  phone TEXT,
  email TEXT,
  street_address TEXT,
  city TEXT,
  province_state TEXT,
  postal_zip_code TEXT,
  has_other_residence BOOLEAN DEFAULT FALSE,
  
  -- Language & Education
  languages JSONB DEFAULT '{}',
  education_level TEXT,
  field_of_study TEXT,
  
  -- Employment Type
  employment_type TEXT CHECK (employment_type IN ('employee', 'subcontractor', 'owner_operator')),
  vehicle_year TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  
  -- Travel Preferences
  can_travel_us TEXT,
  operating_regions JSONB DEFAULT '[]',
  
  -- Step 2: License Information
  license_province_state TEXT,
  license_class TEXT,
  license_number TEXT,
  license_issue_date DATE,
  license_expiry_date DATE,
  first_commercial_license_date TEXT,
  has_air_brake_endorsement BOOLEAN DEFAULT FALSE,
  has_transferred_license BOOLEAN DEFAULT FALSE,
  
  -- Safety Declarations (Yes/No)
  has_other_license BOOLEAN,
  has_license_denied_suspended BOOLEAN,
  has_medical_conditions BOOLEAN,
  has_criminal_conviction BOOLEAN,
  has_drug_test_positive BOOLEAN,
  has_failed_rehab_program BOOLEAN,
  has_other_employment BOOLEAN,
  
  -- Equipment Experience
  tractor_experience JSONB DEFAULT '{}',
  trailer_experience JSONB DEFAULT '{}',
  canada_regions JSONB DEFAULT '[]',
  usa_regions JSONB DEFAULT '[]',
  terrain_experience JSONB DEFAULT '[]',
  
  -- Incidents
  has_incidents BOOLEAN DEFAULT FALSE,
  has_citations BOOLEAN DEFAULT FALSE,
  
  -- Step 4: Consents
  consent_contact_employers BOOLEAN DEFAULT FALSE,
  consent_declaration BOOLEAN DEFAULT FALSE,
  consent_info_use BOOLEAN DEFAULT FALSE,
  consent_driver_abstract BOOLEAN DEFAULT FALSE,
  consent_employment_verification BOOLEAN DEFAULT FALSE,
  consent_fmcsa_clearinghouse BOOLEAN DEFAULT FALSE,
  consent_fmcsa_limited_query BOOLEAN DEFAULT FALSE,
  consent_drug_alcohol_records BOOLEAN DEFAULT FALSE,
  consent_background_check BOOLEAN DEFAULT FALSE,
  
  -- E-Signature
  signature_name TEXT,
  signature_date DATE,
  signature_data TEXT,
  
  -- Document Uploads (paths)
  license_front_path TEXT,
  license_back_path TEXT,
  driver_abstract_path TEXT,
  medical_certificate_path TEXT,
  supplementary_docs_path TEXT,
  
  -- Calculated fields
  driver_type TEXT CHECK (driver_type IN ('canada_only', 'cross_border')),
  history_requirement_met BOOLEAN DEFAULT FALSE,
  total_history_days INTEGER DEFAULT 0
);

-- Historical Addresses (Step 1)
CREATE TABLE application_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES driver_applications(id) ON DELETE CASCADE,
  street_address TEXT,
  city TEXT,
  province_state TEXT,
  postal_zip_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Historical Licenses (Step 2)
CREATE TABLE application_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES driver_applications(id) ON DELETE CASCADE,
  name_on_license TEXT,
  issuing_province_state TEXT,
  license_number TEXT,
  license_class TEXT,
  license_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Incidents (Step 2)
CREATE TABLE application_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES driver_applications(id) ON DELETE CASCADE,
  incident_date TEXT,
  description TEXT,
  location TEXT,
  damages INTEGER DEFAULT 0,
  injuries INTEGER DEFAULT 0,
  fatalities INTEGER DEFAULT 0,
  spills INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Citations (Step 2)
CREATE TABLE application_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES driver_applications(id) ON DELETE CASCADE,
  citation_date TEXT,
  description TEXT,
  location TEXT,
  demerits_penalty TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employment History (Step 3)
CREATE TABLE application_employers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES driver_applications(id) ON DELETE CASCADE,
  employer_name TEXT,
  employer_phone TEXT,
  employer_address TEXT,
  position_title TEXT,
  monthly_salary TEXT,
  start_date DATE,
  end_date DATE,
  reason_for_leaving TEXT,
  drove_truck_cmv BOOLEAN DEFAULT FALSE,
  subject_to_fmcsr BOOLEAN DEFAULT FALSE,
  reasonable_grounds_testing BOOLEAN DEFAULT FALSE,
  verification_contact_name TEXT,
  verification_contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents (Step 5)
CREATE TABLE application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES driver_applications(id) ON DELETE CASCADE,
  document_type TEXT,
  file_name TEXT,
  file_path TEXT,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE driver_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for driver_applications
CREATE POLICY "select_own_applications" ON driver_applications FOR SELECT
  TO authenticated USING (auth.uid()::text = id::text OR true);
CREATE POLICY "insert_applications" ON driver_applications FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_applications" ON driver_applications FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_applications" ON driver_applications FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for application_addresses
CREATE POLICY "select_own_addresses" ON application_addresses FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_addresses" ON application_addresses FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_addresses" ON application_addresses FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_addresses" ON application_addresses FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for application_licenses
CREATE POLICY "select_own_licenses" ON application_licenses FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_licenses" ON application_licenses FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_licenses" ON application_licenses FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_licenses" ON application_licenses FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for application_incidents
CREATE POLICY "select_own_incidents" ON application_incidents FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_incidents" ON application_incidents FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_incidents" ON application_incidents FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_incidents" ON application_incidents FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for application_citations
CREATE POLICY "select_own_citations" ON application_citations FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_citations" ON application_citations FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_citations" ON application_citations FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_citations" ON application_citations FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for application_employers
CREATE POLICY "select_own_employers" ON application_employers FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_employers" ON application_employers FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_employers" ON application_employers FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_employers" ON application_employers FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for application_documents
CREATE POLICY "select_own_documents" ON application_documents FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_documents" ON application_documents FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_documents" ON application_documents FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_documents" ON application_documents FOR DELETE
  TO authenticated USING (true);