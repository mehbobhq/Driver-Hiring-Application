import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Send, User, CreditCard, Briefcase,
  FileSignature, Upload, Check, RefreshCw, FileText,
  FileImage, X, FileCheck, AlertTriangle, Shield, Truck,
  Building2, MapPin, Info, Loader2,
  CheckCircle2, Plus, Trash2, Globe, GraduationCap, Mountain, XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  type DriverInvitation, type Company, type BrandingConfig,
  type DriverType, DRIVER_TYPE_LABELS,
  MANDATORY_DOCUMENTS, OPTIONAL_DOCUMENTS,
} from '../../lib/types';
import { useBranding } from '../../lib/branding';
import { PROVINCES_STATES, LICENSE_CLASSES, EDUCATION_LEVELS, LANGUAGE_OPTIONS, PROFICIENCY_LEVELS, SAFETY_QUESTIONS } from '../../constants/formOptions';

interface DriverApplicationProps {
  invitation: DriverInvitation;
  company: Company;
  onComplete: () => void;
}

type AppStep = 'personal' | 'license' | 'employment' | 'consents' | 'documents' | 'review';

const STEPS: { key: AppStep; label: string; icon: React.ReactNode }[] = [
  { key: 'personal', label: 'Personal', icon: <User className="h-4 w-4" /> },
  { key: 'license', label: 'License', icon: <CreditCard className="h-4 w-4" /> },
  { key: 'employment', label: 'Employment', icon: <Briefcase className="h-4 w-4" /> },
  { key: 'consents', label: 'Consents', icon: <FileSignature className="h-4 w-4" /> },
  { key: 'documents', label: 'Documents', icon: <Upload className="h-4 w-4" /> },
  { key: 'review', label: 'Review', icon: <Check className="h-4 w-4" /> },
];

export function DriverApplication({ invitation, company, onComplete }: DriverApplicationProps) {
  const branding: BrandingConfig = {
    company_name: company.company_name,
    logo_url: company.logo_url,
    primary_color: company.primary_color,
    secondary_color: company.secondary_color,
    accent_color: company.accent_color,
    tagline: company.tagline,
  };
  useBranding(branding);

  const [currentStep, setCurrentStep] = useState<AppStep>('personal');
  const [personal, setPersonal] = useState<Record<string, unknown>>({});
  const [license, setLicense] = useState<Record<string, unknown>>({});
  const [employment, setEmployment] = useState<unknown[]>([]);
  const [consents, setConsents] = useState<Record<string, unknown>>({});
  const [signature, setSignature] = useState({ name: '', date: new Date().toISOString().split('T')[0], data: '' });
  const [documents, setDocuments] = useState<Record<string, { file: File; uploaded: boolean }>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const stepIndex = STEPS.findIndex(s => s.key === currentStep);
  const progressPercent = (stepIndex / (STEPS.length - 1)) * 100;

  // Load or create application
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('wl_applications')
        .select('*')
        .eq('invitation_id', invitation.id)
        .maybeSingle();

      if (data) {
        setApplicationId(data.id);
        setPersonal(data.personal_info as Record<string, unknown>);
        setLicense(data.license_info as Record<string, unknown>);
        setEmployment(data.employment_history as unknown[]);
        setConsents(data.consents as Record<string, unknown>);
        if (data.signature_name) setSignature({ name: data.signature_name, date: data.signature_date ?? '', data: data.signature_data ?? '' });

        const { data: docs } = await supabase
          .from('wl_documents')
          .select('*')
          .eq('application_id', data.id);

        if (docs) {
          const docMap: Record<string, { file: File; uploaded: boolean }> = {};
          docs.forEach((d) => {
            if (d.file_url) docMap[d.document_type] = { file: new File([], d.file_name ?? ''), uploaded: true };
          });
          setDocuments(docMap);
        }

        if (data.current_step < STEPS.length) {
          setCurrentStep(STEPS[data.current_step - 1].key);
        }
      } else {
        const { data: newApp } = await supabase.from('wl_applications').insert({
          invitation_id: invitation.id,
          company_id: company.id,
          driver_type: invitation.driver_type,
          status: 'in_progress',
          current_step: 1,
        }).select().single();
        if (newApp) setApplicationId(newApp.id);
      }
    })();
  }, [invitation.id, company.id, invitation.driver_type]);

  const saveApplication = useCallback(async () => {
    if (!applicationId) return;
    await supabase.from('wl_applications').update({
      personal_info: personal,
      license_info: license,
      employment_history: employment,
      consents: consents,
      signature_name: signature.name,
      signature_date: signature.date,
      signature_data: signature.data,
      current_step: stepIndex + 1,
      updated_at: new Date().toISOString(),
    }).eq('id', applicationId);
  }, [applicationId, personal, license, employment, consents, signature, stepIndex]);

  const validateStep = (step: AppStep): boolean => {
    const e: Record<string, string> = {};

    if (step === 'personal') {
      if (!String(personal.first_name ?? '').trim()) e.first_name = 'Required';
      if (!String(personal.last_name ?? '').trim()) e.last_name = 'Required';
      if (!String(personal.date_of_birth ?? '').trim()) e.date_of_birth = 'Required';
      if (!String(personal.email ?? '').trim()) e.email = 'Required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(personal.email))) e.email = 'Invalid email';
      if (!String(personal.phone ?? '').trim()) e.phone = 'Required';
      if (!String(personal.street_address ?? '').trim()) e.street_address = 'Required';
      if (!String(personal.city ?? '').trim()) e.city = 'Required';
    }

    if (step === 'license') {
      if (!String(license.license_number ?? '').trim()) e.license_number = 'Required';
      if (!String(license.license_class ?? '').trim()) e.license_class = 'Required';
      if (!String(license.license_issue_date ?? '').trim()) e.license_issue_date = 'Required';
      if (!String(license.license_expiry_date ?? '').trim()) e.license_expiry_date = 'Required';
    }

    if (step === 'consents') {
      const required = ['consent_contact_employers', 'consent_declaration', 'consent_info_use', 'consent_background_check'];
      required.forEach((k) => { if (!consents[k]) e[k] = 'Consent required'; });
      if (!signature.name.trim()) e.signature_name = 'Required';
      if (!signature.data) e.signature_data = 'Signature required';
    }

    if (step === 'documents') {
      MANDATORY_DOCUMENTS.forEach((d) => {
        if (!documents[d.key]?.uploaded) e[`doc_${d.key}`] = 'This document is mandatory';
      });
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;
    await saveApplication();
    const nextIndex = stepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].key);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].key);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    if (!validateStep('documents')) return;
    setSubmitting(true);
    await saveApplication();

    if (applicationId) {
      await supabase.from('wl_applications').update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      }).eq('id', applicationId);

      await supabase.from('driver_invitations').update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      }).eq('id', invitation.id);

      await supabase.from('audit_logs').insert({
        event_type: 'application_submitted',
        entity_type: 'wl_application',
        entity_id: applicationId,
        actor_email: invitation.driver_email,
        details: { driver_type: invitation.driver_type },
      });
    }

    setSubmitting(false);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Branded Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-sm print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: company.primary_color }}>
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.company_name} className="w-full h-full rounded-lg object-cover" />
              ) : (
                <span className="text-white text-sm font-bold">{company.company_name.charAt(0)}</span>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{company.company_name}</p>
              <p className="text-xs text-slate-500">{DRIVER_TYPE_LABELS[invitation.driver_type]} Application</p>
            </div>
          </div>
          <div className="text-xs text-slate-500">{invitation.driver_first_name} {invitation.driver_last_name}</div>
        </div>
      </header>

      {/* Progress Stepper */}
      <div className="max-w-4xl mx-auto px-4 py-6 print:hidden">
        <div className="relative">
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full progress-fill rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="relative flex justify-between">
            {STEPS.map((s, i) => {
              const isCompleted = i < stepIndex;
              const isCurrent = i === stepIndex;
              return (
                <div key={s.key} className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isCompleted ? 'bg-green-500 text-white' : isCurrent ? 'text-white scale-105' : 'bg-white border-2 border-slate-300 text-slate-400'
                    }`}
                    style={isCurrent ? { backgroundColor: company.primary_color } : {}}
                  >
                    {isCompleted ? <Check className="h-4 w-4" strokeWidth={3} /> : isCurrent ? <span className="text-xs font-bold">{i + 1}</span> : <span className="text-xs font-medium">{i + 1}</span>}
                  </div>
                  <p className={`mt-2 text-xs font-medium ${isCompleted ? 'text-green-600' : isCurrent ? 'text-slate-800' : 'text-slate-400'}`}>{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <main className="max-w-4xl mx-auto px-4 pb-32 print:max-w-none print:px-8 print:pb-0">
        <div className="transition-all duration-500 fade-in-up" key={currentStep}>
          {currentStep === 'personal' && <PersonalStep data={personal} onChange={setPersonal} errors={errors} />}
          {currentStep === 'license' && <LicenseStep data={license} onChange={setLicense} errors={errors} driverType={invitation.driver_type} />}
          {currentStep === 'employment' && <EmploymentStep data={employment} onChange={setEmployment} driverType={invitation.driver_type} />}
          {currentStep === 'consents' && <ConsentsStep data={consents} onChange={setConsents} signature={signature} onSignatureChange={setSignature} errors={errors} company={company} />}
          {currentStep === 'documents' && <DocumentsStep documents={documents} onDocumentsChange={setDocuments} errors={errors} fileInputRefs={fileInputRefs} applicationId={applicationId} />}
          {currentStep === 'review' && <ReviewStep personal={personal} license={license} employment={employment} consents={consents} documents={documents} signature={signature} company={company} />}
        </div>
      </main>

      {/* Navigation Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <button type="button" onClick={handleBack} disabled={stepIndex === 0} className={`btn-secondary ${stepIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <ChevronLeft className="h-5 w-5" /> Back
          </button>
          {currentStep !== 'review' ? (
            <button type="button" onClick={handleNext} className="btn-primary">
              Continue <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={submitting} className="btn-primary" style={{ backgroundColor: '#16a34a' }}>
              {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</> : <><Send className="h-5 w-5" /> Submit Application</>}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// PERSONAL STEP
// ============================================================
function PersonalStep({ data, onChange, errors }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void; errors: Record<string, string> }) {
  const set = (k: string, v: unknown) => onChange({ ...data, [k]: v });

  return (
    <div className="space-y-6">
      <SectionCard icon={<User className="h-5 w-5" />} title="Personal Details" subtitle="Your legal identification information">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="First Name" required error={errors.first_name} value={String(data.first_name ?? '')} onChange={(v) => set('first_name', v)} />
          <Input label="Last Name" required error={errors.last_name} value={String(data.last_name ?? '')} onChange={(v) => set('last_name', v)} />
          <Input label="Date of Birth" required type="date" error={errors.date_of_birth} value={String(data.date_of_birth ?? '')} onChange={(v) => set('date_of_birth', v)} />
          <Input label="SIN / SSN (Optional)" value={String(data.sin_ssn ?? '')} onChange={(v) => set('sin_ssn', v)} />
          <Input label="Phone Number" required type="tel" error={errors.phone} value={String(data.phone ?? '')} onChange={(v) => set('phone', v)} placeholder="(XXX) XXX-XXXX" />
          <Input label="Email Address" required type="email" error={errors.email} value={String(data.email ?? '')} onChange={(v) => set('email', v)} placeholder="driver@example.com" />
        </div>
      </SectionCard>

      <SectionCard icon={<MapPin className="h-5 w-5" />} title="Current Address" subtitle="Your primary residence">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Input label="Street Address" required error={errors.street_address} value={String(data.street_address ?? '')} onChange={(v) => set('street_address', v)} />
          </div>
          <Input label="City" required error={errors.city} value={String(data.city ?? '')} onChange={(v) => set('city', v)} />
          <Select label="Province/State" value={String(data.province_state ?? '')} onChange={(v) => set('province_state', v)} options={PROVINCES_STATES} />
          <Input label="Postal/Zip Code" value={String(data.postal_zip_code ?? '')} onChange={(v) => set('postal_zip_code', v.toUpperCase())} />
          <Select label="Country" value={String(data.country ?? '')} onChange={(v) => set('country', v)} options={[{ value: 'CA', label: 'Canada' }, { value: 'US', label: 'United States' }]} />
        </div>
      </SectionCard>

      <SectionCard icon={<Briefcase className="h-5 w-5" />} title="Employment Type" subtitle="How will you be working?">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { value: 'employee', label: 'Employee', desc: 'Standard employment' },
            { value: 'subcontractor', label: 'Subcontractor', desc: 'Contract basis' },
            { value: 'owner_operator', label: 'Owner Operator', desc: 'With your own vehicle' },
          ].map((t) => (
            <button key={t.value} type="button" onClick={() => set('employment_type', t.value)} className={`toggle-btn text-left ${data.employment_type === t.value ? 'active' : ''}`}>
              <div className="font-medium">{t.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={<Globe className="h-5 w-5" />} title="Language Proficiency" subtitle="Select all languages you can communicate in">
        <div className="space-y-3">
          {LANGUAGE_OPTIONS.map((lang) => {
            const prof = String(data.languages?.[lang.value as keyof typeof data.languages] ?? '');
            return (
              <div key={lang.value} className={`p-4 rounded-xl transition-all ${prof ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 border border-slate-200'}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-slate-700 min-w-[120px]">{lang.label}</span>
                  <div className="flex flex-wrap gap-2">
                    {PROFICIENCY_LEVELS.map((p) => (
                      <button key={p.value} type="button" onClick={() => {
                        const langs = { ...(data.languages as Record<string, string> ?? {}) };
                        if (prof === p.value) delete langs[lang.value]; else langs[lang.value] = p.value;
                        set('languages', langs);
                      }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${prof === p.value ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard icon={<GraduationCap className="h-5 w-5" />} title="Education" subtitle="Your highest level of education">
        <div className="grid gap-4 md:grid-cols-2">
          <Select label="Highest Level" value={String(data.education_level ?? '')} onChange={(v) => set('education_level', v)} options={EDUCATION_LEVELS} />
          <Input label="Field of Study" value={String(data.field_of_study ?? '')} onChange={(v) => set('field_of_study', v)} placeholder="e.g., Transportation" />
        </div>
      </SectionCard>

      <SectionCard icon={<Globe className="h-5 w-5" />} title="Travel Preferences" subtitle="Where are you willing to operate?">
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Are you able to travel internationally?</label>
          <div className="flex gap-3">
            {['Yes', 'No', 'Pending'].map((o) => (
              <button key={o} type="button" onClick={() => set('can_travel', o)} className={`toggle-btn flex-1 ${data.can_travel === o ? 'active' : ''}`}>{o}</button>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={<User className="h-5 w-5" />} title="Emergency Contact" subtitle="Someone we can contact in case of emergency">
        <div className="grid gap-4 md:grid-cols-3">
          <Input label="Full Name" value={String(data.emergency_contact_name ?? '')} onChange={(v) => set('emergency_contact_name', v)} />
          <Input label="Phone Number" type="tel" value={String(data.emergency_contact_phone ?? '')} onChange={(v) => set('emergency_contact_phone', v)} />
          <Input label="Relationship" value={String(data.emergency_contact_relationship ?? '')} onChange={(v) => set('emergency_contact_relationship', v)} />
        </div>
      </SectionCard>
    </div>
  );
}

// ============================================================
// LICENSE STEP
// ============================================================
function LicenseStep({ data, onChange, errors, driverType }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void; errors: Record<string, string>; driverType: DriverType }) {
  const set = (k: string, v: unknown) => onChange({ ...data, [k]: v });

  return (
    <div className="space-y-6">
      <SectionCard icon={<CreditCard className="h-5 w-5" />} title="License Information" subtitle="Your commercial driver's license details">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Select label="Issuing Province/State" value={String(data.license_province_state ?? '')} onChange={(v) => set('license_province_state', v)} options={PROVINCES_STATES} />
          <Select label="License Class" value={String(data.license_class ?? '')} onChange={(v) => set('license_class', v)} options={LICENSE_CLASSES} error={errors.license_class} />
          <Input label="License Number" required error={errors.license_number} value={String(data.license_number ?? '')} onChange={(v) => set('license_number', v.toUpperCase())} />
          <Input label="Issue Date" required type="date" error={errors.license_issue_date} value={String(data.license_issue_date ?? '')} onChange={(v) => set('license_issue_date', v)} />
          <Input label="Expiry Date" required type="date" error={errors.license_expiry_date} value={String(data.license_expiry_date ?? '')} onChange={(v) => set('license_expiry_date', v)} />
          <Input label="First Commercial License" type="month" value={String(data.first_commercial_license_date ?? '')} onChange={(v) => set('first_commercial_license_date', v)} />
        </div>

        <div className="mt-4">
          <button type="button" onClick={() => set('has_air_brake', !data.has_air_brake)} className={`toggle-btn ${data.has_air_brake ? 'active success' : ''}`}>
            <Check className="h-4 w-4" /> Air Brake Endorsement
          </button>
        </div>
      </SectionCard>

      <SectionCard icon={<Shield className="h-5 w-5" />} title="Safety Declarations" subtitle="Required regulatory disclosure questions">
        <div className="space-y-4">
          {SAFETY_QUESTIONS.map((q) => {
            const val = data[q.key as keyof typeof data] as boolean | null | undefined;
            const isDisabled = Boolean(q.dependsOn && data[q.dependsOn as keyof typeof data] !== true);
            return (
              <div key={q.key} className={`p-4 rounded-xl transition-all ${isDisabled ? 'bg-slate-100 opacity-50' : val === true ? 'bg-amber-50 border border-amber-200' : val === false ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200'}`}>
                <p className="text-sm text-slate-700 mb-3">{q.question} {q.required && <span className="text-red-500">*</span>}</p>
                <div className="flex gap-3">
                  <button type="button" disabled={isDisabled} onClick={() => set(q.key, true)} className={`toggle-btn flex-1 ${isDisabled ? 'cursor-not-allowed' : ''} ${val === true ? 'active warning' : ''}`}>Yes</button>
                  <button type="button" disabled={isDisabled} onClick={() => set(q.key, false)} className={`toggle-btn flex-1 ${isDisabled ? 'cursor-not-allowed' : ''} ${val === false ? 'active success' : ''}`}>No</button>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {driverType !== 'us_only' && (
        <SectionCard icon={<Truck className="h-5 w-5" />} title="Equipment Experience" subtitle="Select all equipment types you've operated">
          <div className="mb-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Trailer Experience</h4>
            <div className="flex flex-wrap gap-2">
              {['dry_vans', 'refrigerated', 'flat_deck', 'step_deck', 'grain_bulk', 'livestock', 'low_boy', 'super_b', 'other', 'no_experience'].map((t) => (
                <button key={t} type="button" onClick={() => {
                  const exp = { ...(data.trailer_experience as Record<string, boolean> ?? {}) };
                  exp[t] = !exp[t];
                  set('trailer_experience', exp);
                }} className={`toggle-btn text-sm ${data.trailer_experience?.[t as keyof typeof data.trailer_experience] ? 'active' : ''}`}>
                  {t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2"><Mountain className="h-4 w-4" /> Terrain & Conditions</h4>
            <div className="flex flex-wrap gap-2">
              {['urban', 'highways', 'mountains', 'steep_grades', 'rural', 'flat', 'snowy_icy', 'desert'].map((t) => (
                <button key={t} type="button" onClick={() => {
                  const exp = [...(data.terrain_experience as string[] ?? [])];
                  const idx = exp.indexOf(t);
                  if (idx >= 0) exp.splice(idx, 1); else exp.push(t);
                  set('terrain_experience', exp);
                }} className={`toggle-btn text-sm ${(data.terrain_experience as string[] ?? []).includes(t) ? 'active' : ''}`}>
                  {t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ============================================================
// EMPLOYMENT STEP
// ============================================================
function EmploymentStep({ data, onChange, driverType }: { data: unknown[]; onChange: (d: unknown[]) => void; driverType: DriverType }) {
  const requiredYears = driverType === 'cross_border' ? 10 : 3;
  const employers = data as Record<string, unknown>[];

  const addEmployer = () => onChange([...employers, { employer_name: '', position_title: '', start_date: '', end_date: '', employer_phone: '' }]);
  const removeEmployer = (i: number) => onChange(employers.filter((_, idx) => idx !== i));
  const updateEmployer = (i: number, k: string, v: unknown) => onChange(employers.map((e, idx) => idx === i ? { ...e, [k]: v } : e));

  return (
    <div className="space-y-6">
      <SectionCard icon={<Info className="h-5 w-5" />} title="Employment History" subtitle={`Add all employers for the past ${requiredYears} years`}>
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 mb-4">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Gaps from unemployment, school, or being out of the country must be entered as separate records.
            Use the employer name to describe the gap (e.g., "Unemployment Period").
          </p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-600">{employers.length} employer(s) added</p>
          <button type="button" onClick={addEmployer} className="btn-primary"><Plus className="h-5 w-5" /> Add Employer</button>
        </div>

        {employers.length === 0 && (
          <div className="p-12 rounded-2xl border-2 border-dashed border-slate-300 text-center bg-slate-50">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No employment records added yet</p>
          </div>
        )}

        {employers.map((emp, i) => (
          <div key={i} className="relative mb-4 p-5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="absolute -top-3 left-5 px-3 py-1 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: 'var(--brand-primary)' }}>
              Employer {i + 1}
            </div>
            <div className="absolute top-4 right-4">
              <button type="button" onClick={() => removeEmployer(i)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Input label="Employer Name *" value={String(emp.employer_name ?? '')} onChange={(v) => updateEmployer(i, 'employer_name', v)} />
              <Input label="Phone" type="tel" value={String(emp.employer_phone ?? '')} onChange={(v) => updateEmployer(i, 'employer_phone', v)} />
              <Input label="Position" value={String(emp.position_title ?? '')} onChange={(v) => updateEmployer(i, 'position_title', v)} />
              <Input label="Start Date" type="date" value={String(emp.start_date ?? '')} onChange={(v) => updateEmployer(i, 'start_date', v)} />
              <Input label="End Date" type="date" value={String(emp.end_date ?? '')} onChange={(v) => updateEmployer(i, 'end_date', v)} />
              <Input label="Reason for Leaving" value={String(emp.reason_for_leaving ?? '')} onChange={(v) => updateEmployer(i, 'reason_for_leaving', v)} />
            </div>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

// ============================================================
// CONSENTS STEP
// ============================================================
const CONSENT_ITEMS = [
  { key: 'consent_contact_employers', title: 'Consent to Contact Previous Employers', content: 'I authorize all previous and current employers to release any and all information pertinent to my employment, including safety performance history, accidents, violations, and drug and alcohol testing results.' },
  { key: 'consent_declaration', title: 'General Pre-Signing Declaration', content: 'I certify that all information provided in this application is true and complete. I understand that any false statements may result in denial of employment or termination.' },
  { key: 'consent_info_use', title: 'Information Use & Authorization', content: 'I understand that the information collected may be used for evaluating my suitability for employment, conducting background checks, and maintaining compliance records.' },
  { key: 'consent_background_check', title: 'Background Check Authorization', content: 'I authorize a comprehensive background investigation including criminal history, social security verification, address verification, and professional license verification.' },
];

function ConsentsStep({ data, onChange, signature, onSignatureChange, errors, company }: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
  signature: { name: string; date: string; data: string };
  onSignatureChange: (s: { name: string; date: string; data: string }) => void;
  errors: Record<string, string>;
  company: Company;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSig, setHasSig] = useState(Boolean(signature.data));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    if ('touches' in e) e.preventDefault();
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSig(true);
  };

  const stopDraw = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSignatureChange({ ...signature, data: canvas.toDataURL('image/png') });
  };

  const clearSig = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
    onSignatureChange({ ...signature, data: '' });
  };

  const agreedCount = CONSENT_ITEMS.filter((item) => data[item.key]).length;
  const allAgreed = agreedCount === CONSENT_ITEMS.length;

  return (
    <div className="space-y-6">
      <div className={`glass-card p-4 flex items-center gap-4 transition-all ${allAgreed ? 'border-green-300 bg-green-50' : 'border-slate-200'}`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${allAgreed ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
          <Shield className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className={`font-medium ${allAgreed ? 'text-green-700' : 'text-slate-700'}`}>{allAgreed ? 'All Consents Agreed' : `Consent Progress: ${agreedCount} of ${CONSENT_ITEMS.length}`}</p>
          <div className="mt-2 h-1.5 bg-white rounded-full overflow-hidden border border-slate-200">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(agreedCount / CONSENT_ITEMS.length) * 100}%`, backgroundColor: company.primary_color }} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {CONSENT_ITEMS.map((item) => {
          const agreed = Boolean(data[item.key]);
          return (
            <button key={item.key} type="button" onClick={() => onChange({ ...data, [item.key]: !agreed })} className={`w-full text-left p-5 rounded-xl transition-all ${agreed ? 'bg-green-50 border-2 border-green-300' : 'bg-slate-50 border border-slate-200 hover:border-slate-300'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${agreed ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {agreed ? <Check className="h-5 w-5" /> : <FileSignature className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold ${agreed ? 'text-green-700' : 'text-slate-800'}`}>{item.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.content}</p>
                </div>
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${agreed ? 'border-green-500 bg-green-500' : 'border-slate-300'}`}>
                  {agreed && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <SectionCard icon={<FileSignature className="h-5 w-5" />} title="Electronic Signature" subtitle="Sign to confirm your agreement">
        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <Input label="Full Legal Name" required error={errors.signature_name} value={signature.name} onChange={(v) => onSignatureChange({ ...signature, name: v })} />
          <Input label="Date" type="date" value={signature.date} onChange={(v) => onSignatureChange({ ...signature, date: v })} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-slate-700">Sign Here *</label>
            <button type="button" onClick={clearSig} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><RefreshCw className="h-4 w-4" /> Clear</button>
          </div>
          <div className={`relative rounded-xl border-2 transition-all ${hasSig ? 'border-green-300 bg-green-50' : errors.signature_data ? 'border-red-300 bg-red-50' : 'border-slate-300 border-dashed bg-slate-50'}`}>
            <canvas ref={canvasRef} width={600} height={200} className="w-full h-48 rounded-xl" style={{ touchAction: 'none' }} onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw} onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
            {!hasSig && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="text-center"><FileSignature className="h-8 w-8 text-slate-400 mx-auto mb-2" /><p className="text-sm text-slate-500">Draw your signature here</p></div></div>}
          </div>
          {errors.signature_data && <p className="mt-2 text-sm text-red-500">{errors.signature_data}</p>}
        </div>
      </SectionCard>
    </div>
  );
}

// ============================================================
// DOCUMENTS STEP
// ============================================================
function DocumentsStep({ documents, onDocumentsChange, errors, fileInputRefs, applicationId }: {
  documents: Record<string, { file: File; uploaded: boolean }>;
  onDocumentsChange: (d: Record<string, { file: File; uploaded: boolean }>) => void;
  errors: Record<string, string>;
  fileInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  applicationId: string | null;
}) {
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const handleFile = async (key: string, label: string, mandatory: boolean, file: File) => {
    setUploadingKey(key);
    await new Promise((r) => setTimeout(r, 800));

    onDocumentsChange({ ...documents, [key]: { file, uploaded: true } });

    if (applicationId) {
      const existing = await supabase.from('wl_documents').select('id').eq('application_id', applicationId).eq('document_type', key).maybeSingle();
      if (existing.data) {
        await supabase.from('wl_documents').update({
          file_name: file.name, file_size: file.size, mime_type: file.type,
          validation_status: 'valid', uploaded_at: new Date().toISOString(),
        }).eq('id', existing.data.id);
      } else {
        await supabase.from('wl_documents').insert({
          application_id: applicationId, document_type: key, document_label: label,
          is_mandatory: mandatory, file_name: file.name, file_size: file.size,
          mime_type: file.type, file_url: URL.createObjectURL(file),
          validation_status: 'valid', uploaded_at: new Date().toISOString(),
        });
      }
    }
    setUploadingKey(null);
  };

  const handleRemove = async (key: string) => {
    const updated = { ...documents };
    delete updated[key];
    onDocumentsChange(updated);
    if (applicationId) {
      await supabase.from('wl_documents').delete().eq('application_id', applicationId).eq('document_type', key);
    }
  };

  const uploadedMandatory = MANDATORY_DOCUMENTS.filter(d => documents[d.key]?.uploaded).length;
  const allMandatory = uploadedMandatory === MANDATORY_DOCUMENTS.length;

  return (
    <div className="space-y-6">
      <div className={`glass-card p-4 flex items-center gap-4 transition-all ${allMandatory ? 'border-green-300 bg-green-50' : 'border-slate-200'}`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${allMandatory ? 'bg-green-500 text-white' : 'bg-blue-100 text-blue-600'}`}>
          <Upload className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className={`font-medium ${allMandatory ? 'text-green-700' : 'text-slate-700'}`}>{allMandatory ? 'All mandatory documents uploaded' : `Mandatory documents: ${uploadedMandatory} of ${MANDATORY_DOCUMENTS.length}`}</p>
          <div className="mt-2 h-1.5 bg-white rounded-full overflow-hidden border border-slate-200">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(uploadedMandatory / MANDATORY_DOCUMENTS.length) * 100}%`, backgroundColor: allMandatory ? '#22c55e' : 'var(--brand-primary)' }} />
          </div>
        </div>
        {allMandatory && <Check className="h-6 w-6 text-green-600" />}
      </div>

      {/* Mandatory Documents */}
      <SectionCard icon={<FileText className="h-5 w-5" />} title="Mandatory Documents" subtitle="These documents are required and cannot be skipped">
        <div className="grid gap-4">
          {MANDATORY_DOCUMENTS.map((doc) => (
            <DocumentUploadCard key={doc.key} doc={doc} mandatory uploaded={documents[doc.key]?.uploaded ?? false} uploading={uploadingKey === doc.key} error={errors[`doc_${doc.key}`]} onFile={(f) => handleFile(doc.key, doc.label, true, f)} onRemove={() => handleRemove(doc.key)} fileInputRef={(el) => { fileInputRefs.current[doc.key] = el; }} />
          ))}
        </div>
      </SectionCard>

      {/* Optional Documents */}
      <SectionCard icon={<FileText className="h-5 w-5" />} title="Optional Documents" subtitle="Upload if applicable to your situation">
        <div className="grid gap-4">
          {OPTIONAL_DOCUMENTS.map((doc) => (
            <DocumentUploadCard key={doc.key} doc={doc} mandatory={false} uploaded={documents[doc.key]?.uploaded ?? false} uploading={uploadingKey === doc.key} onFile={(f) => handleFile(doc.key, doc.label, false, f)} onRemove={() => handleRemove(doc.key)} fileInputRef={(el) => { fileInputRefs.current[doc.key] = el; }} />
          ))}
        </div>
      </SectionCard>

      <div className="glass-card p-4 flex items-start gap-3 border-amber-200 bg-amber-50">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-700">Important</p>
          <p className="text-xs text-amber-600 mt-1">Work Permit and Visa are separate document types. Passport is also separate. Use "Others" for any additional documents not listed above.</p>
        </div>
      </div>
    </div>
  );
}

function DocumentUploadCard({ doc, mandatory, uploaded, uploading, error, onFile, onRemove, fileInputRef }: {
  doc: { key: string; label: string };
  mandatory: boolean;
  uploaded: boolean;
  uploading: boolean;
  error?: string;
  onFile: (f: File) => void;
  onRemove: () => void;
  fileInputRef: (el: HTMLInputElement | null) => void;
}) {
  return (
    <div className={`relative glass-card p-4 transition-all ${error ? 'border-red-300' : uploaded ? 'border-green-300' : 'border-slate-200 hover:border-slate-300'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${uploaded ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
          {uploaded ? <FileCheck className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm text-slate-800">{doc.label}</h3>
            {mandatory && <span className="text-red-500 text-xs">*</span>}
            {uploaded && <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Uploaded</span>}
          </div>
        </div>
        {uploaded ? (
          <button type="button" onClick={onRemove} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"><X className="h-5 w-5" /></button>
        ) : (
          <button type="button" onClick={() => fileInputRef(null)} className="btn-secondary text-sm">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </div>
  );
}

// ============================================================
// REVIEW STEP
// ============================================================
function ReviewStep({ personal, license, employment, consents, documents, signature, company }: {
  personal: Record<string, unknown>;
  license: Record<string, unknown>;
  employment: unknown[];
  consents: Record<string, unknown>;
  documents: Record<string, { file: File; uploaded: boolean }>;
  signature: { name: string; date: string; data: string };
  company: Company;
}) {
  const allDocs = [...MANDATORY_DOCUMENTS, ...OPTIONAL_DOCUMENTS];

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 text-center">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: company.primary_color }}>
          <Check className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Review Your Application</h2>
        <p className="text-sm text-slate-500 mt-1">Please review all information before submitting. You can go back to edit any section.</p>
      </div>

      <ReviewCard title="Personal Information" icon={<User className="h-5 w-5" />}>
        <ReviewField label="Name" value={`${personal.first_name ?? ''} ${personal.last_name ?? ''}`} />
        <ReviewField label="Email" value={String(personal.email ?? '—')} />
        <ReviewField label="Phone" value={String(personal.phone ?? '—')} />
        <ReviewField label="Address" value={`${personal.street_address ?? ''}, ${personal.city ?? ''}, ${personal.province_state ?? ''}`} />
        <ReviewField label="Employment Type" value={String(personal.employment_type ?? '—')} />
      </ReviewCard>

      <ReviewCard title="License Information" icon={<CreditCard className="h-5 w-5" />}>
        <ReviewField label="License Number" value={String(license.license_number ?? '—')} />
        <ReviewField label="License Class" value={String(license.license_class ?? '—')} />
        <ReviewField label="Issue Date" value={String(license.license_issue_date ?? '—')} />
        <ReviewField label="Expiry Date" value={String(license.license_expiry_date ?? '—')} />
      </ReviewCard>

      <ReviewCard title="Employment History" icon={<Briefcase className="h-5 w-5" />}>
        <p className="text-sm text-slate-600">{(employment as unknown[]).length} employer record(s) added</p>
      </ReviewCard>

      <ReviewCard title="Consents & Signature" icon={<FileSignature className="h-5 w-5" />}>
        <ReviewField label="Consents Agreed" value={`${CONSENT_ITEMS.filter(c => consents[c.key]).length} of ${CONSENT_ITEMS.length}`} />
        <ReviewField label="Signed By" value={signature.name || '—'} />
        <ReviewField label="Signature Date" value={signature.date || '—'} />
      </ReviewCard>

      <ReviewCard title="Documents" icon={<Upload className="h-5 w-5" />}>
        <div className="space-y-2">
          {allDocs.map((d) => (
            <div key={d.key} className="flex items-center gap-2 text-sm">
              {documents[d.key]?.uploaded ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-slate-300" />}
              <span className={documents[d.key]?.uploaded ? 'text-slate-700' : 'text-slate-400'}>{d.label}</span>
              {!MANDATORY_DOCUMENTS.find(m => m.key === d.key) && !documents[d.key]?.uploaded && <span className="text-xs text-slate-400">(optional)</span>}
            </div>
          ))}
        </div>
      </ReviewCard>

      <div className="glass-card p-4 flex items-start gap-3 border-blue-200 bg-blue-50">
        <Shield className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">By submitting, you confirm that all information provided is accurate and complete. Your application will be reviewed by {company.company_name}.</p>
      </div>
    </div>
  );
}

function ReviewCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">{icon}</div>
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-700 text-right">{value}</span>
    </div>
  );
}

// ============================================================
// SHARED COMPONENTS
// ============================================================
function SectionCard({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="card-section">
      <div className="section-header">
        <div className="icon-container primary">{icon}</div>
        <div>
          <h3 className="section-title">{title}</h3>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Input({ label, required, error, value, onChange, type, placeholder }: {
  label: string; required?: boolean; error?: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label} {required && <span className="text-red-500">*</span>}</label>
      <input type={type ?? 'text'} value={value} onChange={(e) => onChange(e.target.value)} className={`premium-input ${error ? 'border-red-500' : ''}`} placeholder={placeholder} />
      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
    </div>
  );
}

function Select({ label, required, error, value, onChange, options }: {
  label: string; required?: boolean; error?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label} {required && <span className="text-red-500">*</span>}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`premium-select ${error ? 'border-red-500' : ''}`}>
        <option value="">Select...</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
    </div>
  );
}
