import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Mail, Phone, Loader2, AlertCircle, KeyRound,
  RefreshCw, CheckCircle2, Lock, ArrowRight, Truck, Clock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  type DriverInvitation, type Company, type BrandingConfig,
  DRIVER_TYPE_LABELS,
} from '../../lib/types';
import { useBranding } from '../../lib/branding';

interface OtpVerificationProps {
  invitation: DriverInvitation;
  company: Company;
  onVerified: () => void;
}

export function OtpVerification({ invitation, company, onVerified }: OtpVerificationProps) {
  const branding: BrandingConfig = {
    company_name: company.company_name,
    logo_url: company.logo_url,
    primary_color: company.primary_color,
    secondary_color: company.secondary_color,
    accent_color: company.accent_color,
    tagline: company.tagline,
  };
  useBranding(branding);

  const [step, setStep] = useState<'identity' | 'otp'>('identity');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
    setResendDisabled(false);
  }, [resendTimer]);

  const logAudit = useCallback(async (eventType: string, details: Record<string, unknown>) => {
    await supabase.from('audit_logs').insert({
      event_type: eventType,
      entity_type: 'driver_invitation',
      entity_id: invitation.id,
      actor_email: invitation.driver_email,
      details,
    });
  }, [invitation.id, invitation.driver_email]);

  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    if (normalizedEmail !== invitation.driver_email.toLowerCase()) {
      setError('The email you entered does not match the invitation record. Access denied.');
      await logAudit('identity_mismatch', { provided_email: normalizedEmail, expected_email: invitation.driver_email });
      setLoading(false);
      return;
    }

    if (normalizedPhone !== invitation.driver_phone) {
      setError('The phone number you entered does not match the invitation record. Access denied.');
      await logAudit('identity_mismatch', { provided_phone: normalizedPhone, expected_phone: invitation.driver_phone });
      setLoading(false);
      return;
    }

    await supabase.from('driver_invitations')
      .update({ status: 'opened', opened_at: new Date().toISOString() })
      .eq('id', invitation.id);

    await logAudit('identity_verified', { email: normalizedEmail, phone: normalizedPhone });

    // Generate OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await supabase.from('otp_verifications').insert({
      invitation_id: invitation.id,
      otp_code: code,
      channel: 'email',
    });

    setGeneratedOtp(code);
    setStep('otp');
    setLoading(false);
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: otpRecords } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('invitation_id', invitation.id)
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!otpRecords || otpRecords.length === 0) {
      setError('No valid OTP found. Please request a new code.');
      setLoading(false);
      return;
    }

    const otp = otpRecords[0];
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    await supabase.from('otp_verifications')
      .update({ attempts: newAttempts })
      .eq('id', otp.id);

    if (otp.otp_code !== otpCode.trim()) {
      if (newAttempts >= 5) {
        setError('Too many failed attempts. Please request a new code.');
        await logAudit('otp_max_attempts', { attempts: newAttempts });
        setStep('identity');
        setAttempts(0);
      } else {
        setError(`Invalid code. ${5 - newAttempts} attempts remaining.`);
      }
      setLoading(false);
      return;
    }

    if (new Date(otp.expires_at) < new Date()) {
      setError('This code has expired. Please request a new one.');
      setLoading(false);
      return;
    }

    await supabase.from('otp_verifications')
      .update({ is_used: true, verified_at: new Date().toISOString() })
      .eq('id', otp.id);

    await supabase.from('driver_invitations')
      .update({ status: 'verified', verified_at: new Date().toISOString() })
      .eq('id', invitation.id);

    await logAudit('otp_verified', {});
    setLoading(false);
    onVerified();
  };

  const handleResend = async () => {
    if (resendDisabled) return;
    setResendDisabled(true);
    setResendTimer(30);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const { data: existing } = await supabase
      .from('otp_verifications')
      .select('resend_count')
      .eq('invitation_id', invitation.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const resendCount = (existing?.[0]?.resend_count ?? 0) + 1;

    await supabase.from('otp_verifications').insert({
      invitation_id: invitation.id,
      otp_code: code,
      channel: 'email',
      resend_count: resendCount,
      last_resend_at: new Date().toISOString(),
    });

    await logAudit('otp_resent', { resend_count: resendCount });
    setGeneratedOtp(code);
    setOtpCode('');
    setError(null);
    setAttempts(0);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Branded Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4" style={{ backgroundColor: company.primary_color }}>
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.company_name} className="w-full h-full rounded-2xl object-cover" />
            ) : (
              <span className="text-white text-2xl font-bold">{company.company_name.charAt(0)}</span>
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-800">{company.company_name}</h1>
          <p className="text-sm text-slate-500 mt-1">{company.tagline ?? 'Driver Application Portal'}</p>
        </div>

        <div className="glass-card p-8">
          {step === 'identity' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: company.primary_color + '15' }}>
                  <Lock className="h-5 w-5" style={{ color: company.primary_color }} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800">Verify Your Identity</h2>
                  <p className="text-xs text-slate-500">Enter the email and phone from your invitation</p>
                </div>
              </div>

              <form onSubmit={handleIdentitySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="premium-input pl-11" placeholder="Your invited email" autoFocus />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="premium-input pl-11" placeholder="Your invited phone" />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ArrowRight className="h-5 w-5" /> Continue</>}
                </button>
              </form>
            </>
          )}

          {step === 'otp' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: company.primary_color + '15' }}>
                  <KeyRound className="h-5 w-5" style={{ color: company.primary_color }} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800">Enter Verification Code</h2>
                  <p className="text-xs text-slate-500">A 6-digit code was sent to {invitation.driver_email}</p>
                </div>
              </div>

              {generatedOtp && (
                <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    Demo mode: Your verification code is <span className="font-mono font-bold">{generatedOtp}</span>
                  </p>
                </div>
              )}

              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">6-Digit Code</label>
                  <input
                    type="text"
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="premium-input text-center text-2xl font-mono tracking-[0.5em]"
                    placeholder="000000"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />} Verify & Continue
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendDisabled}
                    className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50 flex items-center gap-1.5 mx-auto"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {resendDisabled ? `Resend in ${resendTimer}s` : 'Resend Code'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Shield className="h-3.5 w-3.5 text-green-500" />
          <span>Secure Portal • OTP Verification • Audit Logged</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PREFLIGHT INSTRUCTIONS
// ============================================================
interface PreflightProps {
  invitation: DriverInvitation;
  company: Company;
  onStart: () => void;
}

export function PreflightInstructions({ invitation, company, onStart }: PreflightProps) {
  const branding: BrandingConfig = {
    company_name: company.company_name,
    logo_url: company.logo_url,
    primary_color: company.primary_color,
    secondary_color: company.secondary_color,
    accent_color: company.accent_color,
    tagline: company.tagline,
  };
  useBranding(branding);

  const requiredDocs = [
    "Driver's License — Front",
    "Driver's License — Back",
    'Original Abstract',
    'Annual Abstract',
    'Medical Certificate',
  ];

  const optionalDocs = ['Work Permit', 'Visa', 'Passport', 'Others'];

  const instructions = [
    'Ensure you have a stable internet connection before starting.',
    'Have all required documents ready in digital format (JPG, PNG, or PDF, max 10MB each).',
    'You will need your employment history for the past 3 years (5 years for Canada-only, 10 years for cross-border).',
    'The application takes approximately 15-20 minutes to complete.',
    'You can navigate between steps, but all required fields must be completed before submission.',
    'Your data is encrypted and securely stored. Only authorized personnel will have access.',
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Branded Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4" style={{ backgroundColor: company.primary_color }}>
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.company_name} className="w-full h-full rounded-2xl object-cover" />
            ) : (
              <span className="text-white text-2xl font-bold">{company.company_name.charAt(0)}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome, {invitation.driver_first_name ?? 'Driver'}!</h1>
          <p className="text-sm text-slate-500 mt-1">You're applying for: {DRIVER_TYPE_LABELS[invitation.driver_type]} position</p>
        </div>

        {/* Identity Verified Badge */}
        <div className="glass-card p-4 mb-6 flex items-center gap-3 border-green-200 bg-green-50">
          <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-green-700">Identity Verified</p>
            <p className="text-xs text-green-600">Your email and phone have been confirmed</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="glass-card p-6 mb-6">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" style={{ color: company.primary_color }} />
            Before You Begin
          </h2>
          <div className="space-y-3">
            {instructions.map((inst, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ backgroundColor: company.primary_color + '15', color: company.primary_color }}>
                  {i + 1}
                </div>
                <p className="text-sm text-slate-600">{inst}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Required Documents */}
        <div className="glass-card p-6 mb-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5" style={{ color: company.primary_color }} />
            Required Documents
          </h3>
          <p className="text-xs text-slate-500 mb-3">These documents are mandatory and cannot be skipped:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {requiredDocs.map((doc) => (
              <div key={doc} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-slate-600">{doc}</span>
              </div>
            ))}
          </div>

          <h3 className="font-semibold text-slate-800 mb-3 mt-5">Optional Documents</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {optionalDocs.map((doc) => (
              <div key={doc} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="w-4 h-4 rounded border-2 border-slate-300 flex-shrink-0" />
                <span className="text-sm text-slate-500">{doc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button onClick={onStart} className="btn-primary w-full py-4 text-base">
          Start Application <ArrowRight className="h-5 w-5" />
        </button>

        <p className="text-center text-xs text-slate-400 mt-4">
          By starting, you agree to provide accurate information. Your progress is saved automatically.
        </p>
      </div>
    </div>
  );
}
