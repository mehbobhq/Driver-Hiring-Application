import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Mail, Phone, Plus, Search, LogOut, Shield,
  CheckCircle2, Clock, XCircle, Send, Copy, Trash2,
  RefreshCw, ChevronRight, Truck, AlertCircle, MapPin, Ban, Globe,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import {
  type Company, type DriverInvitation, type DriverType,
  DRIVER_TYPE_LABELS, DRIVER_TYPE_DESCRIPTIONS,
} from '../../lib/types';

type AdminView = 'overview' | 'companies' | 'invitations';

export function AdminDashboard() {
  const { admin, signOut } = useAuth();
  const [view, setView] = useState<AdminView>('overview');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [invitations, setInvitations] = useState<DriverInvitation[]>([]);
  const loadData = useCallback(async () => {
    const [compRes, invRes] = await Promise.all([
      supabase.from('companies').select('*').order('created_at', { ascending: false }),
      supabase.from('driver_invitations').select('*, company:companies(*)').order('created_at', { ascending: false }),
    ]);
    if (compRes.data) setCompanies(compRes.data as Company[]);
    if (invRes.data) setInvitations(invRes.data as DriverInvitation[]);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const stats = {
    totalCompanies: companies.length,
    activeCompanies: companies.filter(c => c.is_active).length,
    totalInvitations: invitations.length,
    pendingInvitations: invitations.filter(i => i.status === 'pending' || i.status === 'opened').length,
    verifiedInvitations: invitations.filter(i => i.status === 'verified' || i.status === 'in_progress').length,
    submittedInvitations: invitations.filter(i => i.status === 'submitted').length,
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 text-white flex flex-col fixed h-full print:hidden">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">Admin Portal</p>
              <p className="text-xs text-slate-400">TES Platform</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavButton active={view === 'overview'} onClick={() => setView('overview')} icon={<Building2 className="h-4 w-4" />}>
            Overview
          </NavButton>
          <NavButton active={view === 'companies'} onClick={() => setView('companies')} icon={<Building2 className="h-4 w-4" />}>
            Companies
          </NavButton>
          <NavButton active={view === 'invitations'} onClick={() => setView('invitations')} icon={<Mail className="h-4 w-4" />}>
            Invitations
          </NavButton>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-sm font-semibold">
              {admin?.full_name?.charAt(0) ?? admin?.email?.charAt(0) ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{admin?.full_name ?? 'Admin'}</p>
              <p className="text-xs text-slate-400 truncate">{admin?.email}</p>
            </div>
          </div>
          <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        {view === 'overview' && <OverviewView stats={stats} companies={companies} invitations={invitations} onNavigate={setView} />}
        {view === 'companies' && <CompaniesView companies={companies} onChanged={loadData} />}
        {view === 'invitations' && <InvitationsView companies={companies} invitations={invitations} onChanged={loadData} adminEmail={admin?.email ?? ''} />}
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700/50'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function OverviewView({ stats, companies, invitations, onNavigate }: {
  stats: { totalCompanies: number; activeCompanies: number; totalInvitations: number; pendingInvitations: number; verifiedInvitations: number; submittedInvitations: number };
  companies: Company[];
  invitations: DriverInvitation[];
  onNavigate: (v: AdminView) => void;
}) {
  const recentInvites = invitations.slice(0, 5);

  return (
    <div className="space-y-6 fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor your white-label driver application platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Building2 className="h-5 w-5" />} label="Companies" value={stats.totalCompanies} sub={`${stats.activeCompanies} active`} color="blue" />
        <StatCard icon={<Mail className="h-5 w-5" />} label="Total Invitations" value={stats.totalInvitations} sub="All time" color="slate" />
        <StatCard icon={<Clock className="h-5 w-5" />} label="Pending" value={stats.pendingInvitations} sub="Awaiting driver" color="amber" />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Submitted" value={stats.submittedInvitations} sub="Applications in" color="green" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Recent Invitations</h3>
            <button onClick={() => onNavigate('invitations')} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {recentInvites.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No invitations yet</p>
          ) : (
            <div className="space-y-3">
              {recentInvites.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Truck className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{inv.driver_email}</p>
                    <p className="text-xs text-slate-500">{DRIVER_TYPE_LABELS[inv.driver_type]} • {inv.company?.company_name ?? '—'}</p>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Active Companies</h3>
            <button onClick={() => onNavigate('companies')} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {companies.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No companies yet</p>
          ) : (
            <div className="space-y-3">
              {companies.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c.primary_color }}>
                    <span className="text-white text-sm font-bold">{c.company_name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{c.company_name}</p>
                    <p className="text-xs text-slate-500">{c.operating_region ?? '—'}</p>
                    <p className="text-xs text-slate-400">{c.city ?? '—'}, {c.province_state ?? '—'}</p>
                  </div>
                  {c.is_active ? (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-600">Inactive</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: number; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    slate: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-100 text-amber-600',
    green: 'bg-green-100 text-green-600',
  };
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>{icon}</div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
      </div>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    pending: { label: 'Pending', class: 'bg-slate-100 text-slate-600' },
    opened: { label: 'Opened', class: 'bg-blue-100 text-blue-700' },
    verified: { label: 'Verified', class: 'bg-cyan-100 text-cyan-700' },
    in_progress: { label: 'In Progress', class: 'bg-amber-100 text-amber-700' },
    submitted: { label: 'Submitted', class: 'bg-green-100 text-green-700' },
    expired: { label: 'Expired', class: 'bg-red-100 text-red-700' },
  };
  const s = map[status] ?? map.pending;
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.class}`}>{s.label}</span>;
}

// ============================================================
// COMPANIES VIEW
// ============================================================
function CompaniesView({ companies, onChanged }: { companies: Company[]; onChanged: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [search, setSearch] = useState('');

  const filtered = companies.filter(c =>
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Company Management</h1>
          <p className="text-sm text-slate-500 mt-1">Create and manage employer tenants with custom branding</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary">
          <Plus className="h-5 w-5" /> New Company
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="premium-input pl-10" placeholder="Search companies..." />
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No companies found. Create your first company to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div key={c.id} className="glass-card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c.primary_color }}>
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.company_name} className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    <span className="text-white text-lg font-bold">{c.company_name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 truncate">{c.company_name}</h3>
                  <p className="text-xs text-slate-500">{c.tagline ?? 'No tagline'}</p>
                </div>
                {c.is_active ? (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Active</span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-600">Inactive</span>
                )}
              </div>

              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-medium text-slate-600">{c.operating_region ?? 'No region set'}</span>
                <span className="text-xs text-slate-400 ml-auto">{c.city ?? '—'}, {c.province_state ?? '—'}</span>
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setEditing(c); setShowForm(true); }} className="btn-secondary flex-1 text-sm">
                  Edit Company
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`Delete ${c.company_name}? This will also delete all related invitations.`)) return;
                    await supabase.from('companies').delete().eq('id', c.id);
                    onChanged();
                  }}
                  className="btn-danger text-sm"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <CompanyFormModal
          company={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); onChanged(); }}
        />
      )}
    </div>
  );
}

function CompanyFormModal({ company, onClose, onSaved }: { company: Company | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    company_name: company?.company_name ?? '',
    slug: company?.slug ?? '',
    logo_url: company?.logo_url ?? '',
    tagline: company?.tagline ?? '',
    contact_email: company?.contact_email ?? '',
    contact_phone: company?.contact_phone ?? '',
    address: company?.address ?? '',
    city: company?.city ?? '',
    province_state: company?.province_state ?? '',
    postal_zip_code: company?.postal_zip_code ?? '',
    country: company?.country ?? 'CA',
    operating_region: company?.operating_region ?? '',
    is_active: company?.is_active ?? true,
  });
  const [slugTouched, setSlugTouched] = useState(Boolean(company?.slug));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const slug = form.slug || slugify(form.company_name);

    const payload = { ...form, slug, updated_at: new Date().toISOString() };

    let result;
    if (company) {
      result = await supabase.from('companies').update(payload).eq('id', company.id);
    } else {
      result = await supabase.from('companies').insert(payload);
    }

    setSaving(false);
    if (result.error) {
      setError(result.error.message);
    } else {
      onSaved();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/50" onClick={onClose}>
      <div className="my-auto bg-white rounded-2xl max-h-[90vh] w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex-shrink-0 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{company ? 'Edit Company' : 'New Company'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 p-4 space-y-3">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Company Name *">
                <input
                  type="text"
                  required
                  value={form.company_name}
                  onChange={(e) => {
                    const company_name = e.target.value;
                    setForm((f) => ({ ...f, company_name, slug: slugTouched ? f.slug : slugify(company_name) }));
                  }}
                  className="premium-input"
                  placeholder="Acme Trucking"
                />
              </Field>
              <Field label="Slug (URL identifier) *">
                <input
                  type="text"
                  required
                  value={form.slug}
                  onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: e.target.value }); }}
                  className="premium-input"
                  placeholder="acme-trucking"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Operating Region *">
                <select required value={form.operating_region} onChange={(e) => setForm({ ...form, operating_region: e.target.value })} className="premium-select">
                  <option value="">Select operating region...</option>
                  <option value="Canada Only">Canada Only</option>
                  <option value="US Only">US Only</option>
                  <option value="Cross-Border">Cross-Border</option>
                </select>
              </Field>
              <Field label="Country *">
                <select required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="premium-select">
                  <option value="CA">Canada</option>
                  <option value="US">United States</option>
                  <option value="OTHER">Other</option>
                </select>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Address *">
                <input type="text" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="premium-input" placeholder="123 Main St" />
              </Field>
              <Field label="City *">
                <input type="text" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="premium-input" placeholder="Toronto" />
              </Field>
              <Field label="Province/State *">
                <input type="text" required value={form.province_state} onChange={(e) => setForm({ ...form, province_state: e.target.value })} className="premium-input" placeholder="ON" />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Postal/Zip *">
                <input type="text" required value={form.postal_zip_code} onChange={(e) => setForm({ ...form, postal_zip_code: e.target.value })} className="premium-input" placeholder="M1M 1M1" />
              </Field>
              <Field label="Contact Email *">
                <input type="email" required value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="premium-input" placeholder="hr@company.com" />
              </Field>
              <Field label="Contact Phone *">
                <input type="tel" required value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="premium-input" placeholder="(555) 123-4567" />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Logo URL (optional)">
                <input type="url" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} className="premium-input" placeholder="https://example.com/logo.png" />
              </Field>
              <Field label="Tagline (optional)">
                <input type="text" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="premium-input" placeholder="Drive with the best" />
              </Field>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-5 h-5 rounded" />
              <span className="text-sm text-slate-700">Company is active (drivers can receive invites)</span>
            </label>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-slate-200 px-6 py-4 flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <RefreshCw className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              {company ? 'Save Changes' : 'Create Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

// ============================================================
// INVITATIONS VIEW
// ============================================================
function InvitationsView({ companies, invitations, onChanged, adminEmail }: {
  companies: Company[];
  invitations: DriverInvitation[];
  onChanged: () => void;
  adminEmail: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = invitations.filter((inv) => {
    const matchesSearch = inv.driver_email.toLowerCase().includes(search.toLowerCase()) || inv.driver_phone.includes(search);
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Driver Invitations</h1>
          <p className="text-sm text-slate-500 mt-1">Create and track driver application invitations</p>
        </div>
        <button onClick={() => setShowForm(true)} disabled={companies.length === 0} className="btn-primary disabled:opacity-50">
          <Plus className="h-5 w-5" /> New Invitation
        </button>
      </div>

      {companies.length === 0 && (
        <div className="glass-card p-4 flex items-center gap-3 border-amber-200 bg-amber-50">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <p className="text-sm text-amber-700">Create a company first before sending invitations.</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="premium-input pl-10" placeholder="Search by email or phone..." />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="premium-select sm:w-48">
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="opened">Opened</option>
          <option value="verified">Verified</option>
          <option value="in_progress">In Progress</option>
          <option value="submitted">Submitted</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Mail className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No invitations found.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Driver</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Company</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Type</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Created</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-700">{inv.driver_email}</p>
                    <p className="text-xs text-slate-500">{inv.driver_phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: inv.company?.primary_color ?? '#64748b' }}>
                        <span className="text-white text-xs font-bold">{(inv.company?.company_name ?? '?').charAt(0)}</span>
                      </div>
                      <span className="text-sm text-slate-600">{inv.company?.company_name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600">{DRIVER_TYPE_LABELS[inv.driver_type]}</span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3 text-sm text-slate-500">{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/#invite/${inv.invite_token}`;
                          navigator.clipboard.writeText(url);
                        }}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Copy invite link"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={async () => {
                          await supabase.from('audit_logs').insert({
                            event_type: 'invite_resent',
                            entity_type: 'driver_invitation',
                            entity_id: inv.id,
                            actor_email: adminEmail,
                            details: { driver_email: inv.driver_email },
                          });
                          alert(`Invite link copied to clipboard:\n${window.location.origin}/#invite/${inv.invite_token}`);
                        }}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Resend / view link"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                      {(inv.status === 'pending' || inv.status === 'opened' || inv.status === 'verified' || inv.status === 'in_progress') && (
                        <button
                          onClick={async () => {
                            if (!confirm(`Cancel this invitation to ${inv.driver_email}? The driver will no longer be able to use the invite link.`)) return;
                            await supabase.from('driver_invitations').update({ status: 'expired' }).eq('id', inv.id);
                            await supabase.from('audit_logs').insert({
                              event_type: 'invitation_cancelled',
                              entity_type: 'driver_invitation',
                              entity_id: inv.id,
                              actor_email: adminEmail,
                              details: { driver_email: inv.driver_email },
                            });
                            onChanged();
                          }}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Cancel invitation"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <InvitationFormModal
          companies={companies}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); onChanged(); }}
          adminEmail={adminEmail}
        />
      )}
    </div>
  );
}

function InvitationFormModal({ companies, onClose, onSaved, adminEmail }: {
  companies: Company[];
  onClose: () => void;
  onSaved: () => void;
  adminEmail: string;
}) {
  const [form, setForm] = useState({
    company_id: '',
    driver_email: '',
    driver_phone: '',
    driver_first_name: '',
    driver_last_name: '',
    driver_type: 'canada_only' as DriverType,
    notes: '',
    send_email: true,
    send_sms: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  const selectedCompany = companies.find((c) => c.id === form.company_id) || null;
  const region = selectedCompany?.operating_region;
  const allowedDriverTypes: DriverType[] = region === 'Canada Only'
    ? ['canada_only']
    : region === 'US Only'
      ? ['us_only']
      : region === 'Cross-Border'
        ? ['canada_only', 'us_only', 'cross_border']
        : (Object.keys(DRIVER_TYPE_LABELS) as DriverType[]);
  const driverTypeLocked = region === 'Canada Only' || region === 'US Only';

  useEffect(() => {
    if (region === 'Canada Only' && form.driver_type !== 'canada_only') {
      setForm((f) => ({ ...f, driver_type: 'canada_only' }));
    } else if (region === 'US Only' && form.driver_type !== 'us_only') {
      setForm((f) => ({ ...f, driver_type: 'us_only' }));
    }
  }, [region, form.driver_type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { data, error: insertError } = await supabase.from('driver_invitations').insert({
      company_id: form.company_id,
      driver_email: form.driver_email.trim().toLowerCase(),
      driver_phone: form.driver_phone.trim(),
      driver_first_name: form.driver_first_name || null,
      driver_last_name: form.driver_last_name || null,
      driver_type: form.driver_type,
      notes: form.notes || null,
      sent_via_email: form.send_email,
      sent_via_sms: form.send_sms,
    }).select().single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    await supabase.from('audit_logs').insert({
      event_type: 'invitation_created',
      entity_type: 'driver_invitation',
      entity_id: data.id,
      actor_email: adminEmail,
      details: { driver_email: form.driver_email, driver_type: form.driver_type, company_id: form.company_id },
    });

    const link = `${window.location.origin}/#invite/${data.invite_token}`;
    setCreatedLink(link);
    setSaving(false);
  };

  if (createdLink) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/50" onClick={onSaved}>
        <div className="my-auto bg-white rounded-2xl max-h-[90vh] w-full max-w-lg flex flex-col overflow-hidden shadow-2xl p-8" onClick={(e) => e.stopPropagation()}>
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 text-center mb-2">Invitation Created</h2>
          <p className="text-sm text-slate-500 text-center mb-6">Share this secure link with the driver. It is tied to their exact email and phone.</p>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 mb-4">
            <p className="text-xs text-slate-400 mb-1">Invite Link:</p>
            <p className="font-mono text-sm text-blue-600 break-all">{createdLink}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { navigator.clipboard.writeText(createdLink); }}
              className="btn-secondary flex-1"
            >
              <Copy className="h-4 w-4" /> Copy Link
            </button>
            <button onClick={onSaved} className="btn-primary flex-1">Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/50" onClick={onClose}>
      <div className="my-auto bg-white rounded-2xl max-h-[90vh] w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex-shrink-0 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">New Driver Invitation</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <Field label="Company *">
            <select required value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })} className="premium-select">
              <option value="">Select company...</option>
              {companies.filter(c => c.is_active).map((c) => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          </Field>

          {selectedCompany && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <Globe className="h-4 w-4 text-slate-400" />
              <span>Operating region: <span className="font-medium text-slate-800">{region || 'Not set'}</span></span>
              {driverTypeLocked && <span className="text-amber-600 font-medium">— driver type locked to region</span>}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Driver First Name">
              <input type="text" value={form.driver_first_name} onChange={(e) => setForm({ ...form, driver_first_name: e.target.value })} className="premium-input" placeholder="John" />
            </Field>
            <Field label="Driver Last Name">
              <input type="text" value={form.driver_last_name} onChange={(e) => setForm({ ...form, driver_last_name: e.target.value })} className="premium-input" placeholder="Doe" />
            </Field>
          </div>

          <Field label="Driver Email *">
            <input type="email" required value={form.driver_email} onChange={(e) => setForm({ ...form, driver_email: e.target.value })} className="premium-input" placeholder="driver@example.com" />
          </Field>

          <Field label="Driver Phone *">
            <input type="tel" required value={form.driver_phone} onChange={(e) => setForm({ ...form, driver_phone: e.target.value })} className="premium-input" placeholder="(555) 123-4567" />
          </Field>

          <Field label="Driver Type *">
            <div className="grid gap-3 md:grid-cols-3">
              {(Object.keys(DRIVER_TYPE_LABELS) as DriverType[]).map((dt) => {
                const allowed = allowedDriverTypes.includes(dt);
                return (
                  <button
                    key={dt}
                    type="button"
                    disabled={!allowed}
                    onClick={() => allowed && setForm({ ...form, driver_type: dt })}
                    className={`toggle-btn text-left ${form.driver_type === dt ? 'active' : ''} ${!allowed ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-medium">{DRIVER_TYPE_LABELS[dt]}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{DRIVER_TYPE_DESCRIPTIONS[dt]}</div>
                  </button>
                );
              })}
            </div>
            {driverTypeLocked && (
              <p className="text-xs text-amber-600 mt-2">Driver type is locked based on the company's operating region.</p>
            )}
          </Field>

          <Field label="Notes (optional)">
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="premium-input min-h-[80px]" placeholder="Internal notes about this invitation..." />
          </Field>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.send_email} onChange={(e) => setForm({ ...form, send_email: e.target.checked })} className="w-5 h-5 rounded" />
              <span className="text-sm text-slate-700 flex items-center gap-1"><Mail className="h-4 w-4" /> Send via Email</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.send_sms} onChange={(e) => setForm({ ...form, send_sms: e.target.checked })} className="w-5 h-5 rounded" />
              <span className="text-sm text-slate-700 flex items-center gap-1"><Phone className="h-4 w-4" /> Send via SMS</span>
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          </div>

          <div className="flex-shrink-0 border-t border-slate-200 px-6 py-4 flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              Create Invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
