import { useState, useEffect } from 'react';
import {
  Shield, Loader2, AlertCircle, CheckCircle2, Send, Printer,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  type DriverInvitation, type Company, type BrandingConfig,
} from '../../lib/types';
import { useBranding } from '../../lib/branding';
import { OtpVerification, PreflightInstructions } from './OtpVerification';
import { DriverApplication } from './DriverApplication';

type DriverPhase = 'loading' | 'invalid' | 'expired' | 'verify' | 'preflight' | 'application' | 'submitted';

interface DriverPortalProps {
  inviteToken: string;
}

export function DriverPortal({ inviteToken }: DriverPortalProps) {
  const [phase, setPhase] = useState<DriverPhase>('loading');
  const [invitation, setInvitation] = useState<DriverInvitation | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: inv, error: invError } = await supabase
        .from('driver_invitations')
        .select('*, company:companies(*)')
        .eq('invite_token', inviteToken)
        .maybeSingle();

      if (invError || !inv) {
        setPhase('invalid');
        setError('This invitation link is invalid or has been revoked.');
        return;
      }

      const invData = inv as DriverInvitation;
      setInvitation(invData);
      setCompany(invData.company as Company);

      if (new Date(invData.expires_at) < new Date() && invData.status !== 'submitted') {
        setPhase('expired');
        return;
      }

      if (invData.status === 'submitted') {
        setPhase('submitted');
        return;
      }

      if (invData.status === 'verified' || invData.status === 'in_progress') {
        // Check if application exists
        const { data: app } = await supabase
          .from('wl_applications')
          .select('id, current_step, status')
          .eq('invitation_id', invData.id)
          .maybeSingle();

        if (app && app.status === 'in_progress') {
          setPhase('application');
        } else {
          setPhase('preflight');
        }
      } else {
        setPhase('verify');
      }
    })();
  }, [inviteToken]);

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="glass-card p-10 text-center max-w-sm">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-base font-medium text-slate-800">Loading Invitation</p>
          <p className="text-sm text-slate-500 mt-2">Verifying your invitation link...</p>
        </div>
      </div>
    );
  }

  if (phase === 'invalid' || phase === 'expired') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="glass-card p-10 text-center max-w-sm border-red-300">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <p className="text-base font-semibold text-slate-800 mb-2">
            {phase === 'expired' ? 'Invitation Expired' : 'Invitation Invalid'}
          </p>
          <p className="text-sm text-slate-600 mb-5">{error ?? 'This invitation link is no longer valid.'}</p>
          <p className="text-xs text-slate-500">Please contact your prospective employer for a new invitation link.</p>
        </div>
      </div>
    );
  }

  if (phase === 'submitted' || (phase === 'application' && invitation?.status === 'submitted')) {
    return <SubmittedPage company={company} invitation={invitation} />;
  }

  if (phase === 'verify' && invitation && company) {
    return <OtpVerification invitation={invitation} company={company} onVerified={() => setPhase('preflight')} />;
  }

  if (phase === 'preflight' && invitation && company) {
    return <PreflightInstructions invitation={invitation} company={company} onStart={() => setPhase('application')} />;
  }

  if (phase === 'application' && invitation && company) {
    return <DriverApplication invitation={invitation} company={company} onComplete={() => setPhase('submitted')} />;
  }

  return null;
}

function SubmittedPage({ company, invitation }: { company: Company | null; invitation: DriverInvitation | null }) {
  const branding: BrandingConfig | null = company ? {
    company_name: company.company_name,
    logo_url: company.logo_url,
    primary_color: company.primary_color,
    secondary_color: company.secondary_color,
    accent_color: company.accent_color,
    tagline: company.tagline,
  } : null;
  useBranding(branding ?? null);

  const refId = invitation?.id?.slice(0, 8).toUpperCase() ?? 'UNKNOWN';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="glass-card p-12 text-center">
          <div className="relative mx-auto mb-8">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-sm" style={{ backgroundColor: company?.primary_color ?? '#16a34a' }}>
              <Send className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-slate-800 mb-4">Application Submitted!</h1>
          <p className="text-slate-500 mb-6 max-w-lg mx-auto leading-relaxed">
            Thank you for completing your application with {company?.company_name ?? 'us'}. Our team will review your submission and contact you within 3-5 business days.
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 mb-8">
            <span className="text-sm text-slate-500">Reference ID:</span>
            <span className="font-mono font-semibold" style={{ color: company?.primary_color ?? '#1e40af' }}>{refId}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center print:hidden">
            <button onClick={() => window.print()} className="btn-secondary">
              <Printer className="h-5 w-5" /> Print Summary
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Shield className="h-3.5 w-3.5 text-green-500" />
          <span>Secure Portal • {company?.company_name ?? 'Driver Application'}</span>
        </div>
      </div>
    </div>
  );
}
