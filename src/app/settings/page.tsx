'use client';
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ─────────────────────────────────────────────────────────────────────
type SettingsTab = 'general' | 'notifications' | 'security' | 'integrations' | 'billing';

interface AppSettings {
  orgName: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  language: string;
  lowStockThreshold: number;
  autoRestockSuggestion: boolean;
  notifLowStockEmail: boolean;
  notifOutOfStockEmail: boolean;
  notifWeeklyReport: boolean;
  notifNewUserAlert: boolean;
  notifShopSyncError: boolean;
  notifRestockApproved: boolean;
  secTwoFactor: boolean;
  secSessionTimeout: boolean;
  secIpWhitelist: boolean;
  secAuditLog: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  orgName: 'श्री राम स्टोर्स',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY',
  language: 'English (US)',
  lowStockThreshold: 20,
  autoRestockSuggestion: true,
  notifLowStockEmail: true,
  notifOutOfStockEmail: true,
  notifWeeklyReport: true,
  notifNewUserAlert: false,
  notifShopSyncError: true,
  notifRestockApproved: false,
  secTwoFactor: false,
  secSessionTimeout: false,
  secIpWhitelist: false,
  secAuditLog: true,
};

const tabs: { key: SettingsTab; label: string; icon: string }[] = [
  { key: 'general',       label: 'General',       icon: 'Cog6ToothIcon'     },
  { key: 'notifications', label: 'Notifications', icon: 'BellIcon'          },
  { key: 'security',      label: 'Security',      icon: 'ShieldCheckIcon'   },
  { key: 'integrations',  label: 'Integrations',  icon: 'PuzzlePieceIcon'   },
  { key: 'billing',       label: 'Billing',       icon: 'CreditCardIcon'    },
];

// ─── Sub-components ─────────────────────────────────────────────────────────────
function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform duration-200 ${enabled ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-slate-100">
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-1">{children}</div>
    </div>
  );
}

function SaveButton({ saving, saved, onClick, label = 'Save Changes' }: { saving: boolean; saved: boolean; onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} disabled={saving}
      className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-60
        ${saved ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'}`}>
      {saving
        ? <><Icon name="ArrowPathIcon" size={15} className="animate-spin" />Saving…</>
        : saved
        ? <><Icon name="CheckIcon" size={15} />Saved!</>
        : <><Icon name="CheckIcon" size={15} />{label}</>
      }
    </button>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded animate-pulse ${className}`} />;
}

const ib = 'px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all';

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings]   = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');

  // Profile (change password)
  const [profileForm, setProfileForm] = useState({ name: '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved]   = useState(false);
  const [profileApiError, setProfileApiError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // Security actions
  const [resettingSessions, setResettingSessions] = useState(false);
  const [sessionResetMsg, setSessionResetMsg]     = useState('');
  const [exportingAudit, setExportingAudit]       = useState(false);
  const [dangerConfirm, setDangerConfirm]         = useState('');

  // Data migration
  interface OrphanProduct { _id: string; sku: string; name: string; totalQty: number; availableQty: number; }
  interface MigShop { _id: string; name: string; location: string; }
  const [migShops, setMigShops]           = useState<MigShop[]>([]);
  const [migShopId, setMigShopId]         = useState('');
  const [migOrphans, setMigOrphans]       = useState<OrphanProduct[]>([]);
  const [migLoading, setMigLoading]       = useState(false);
  const [migRunning, setMigRunning]       = useState(false);
  const [migResult, setMigResult]         = useState<{ productsUpdated: number; logsUpdated: number } | null>(null);
  const [migError, setMigError]           = useState('');
  const [migChecked, setMigChecked]       = useState(false);

  const checkOrphans = useCallback(async () => {
    setMigLoading(true); setMigError(''); setMigResult(null); setMigChecked(false);
    try {
      const [orphanRes, shopRes] = await Promise.all([
        fetch('/api/migrate', { credentials: 'include' }),
        fetch('/api/shops', { credentials: 'include' }),
      ]);
      const orphanData = await orphanRes.json();
      const shopData   = await shopRes.json();
      setMigOrphans(orphanData.products ?? []);
      const shopList: MigShop[] = (shopData.items ?? []).map((s: MigShop) => ({ _id: s._id, name: s.name, location: s.location }));
      setMigShops(shopList);
      if (shopList.length > 0 && !migShopId) setMigShopId(shopList[0]._id);
      setMigChecked(true);
    } catch {
      setMigError('Failed to check for orphaned products.');
    } finally {
      setMigLoading(false);
    }
  }, [migShopId]);

  const runMigration = useCallback(async () => {
    if (!migShopId) return;
    setMigRunning(true); setMigError(''); setMigResult(null);
    try {
      const res  = await fetch('/api/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ shopId: migShopId }),
      });
      const data = await res.json();
      if (!res.ok) { setMigError(data.error ?? 'Migration failed.'); return; }
      setMigResult({ productsUpdated: data.productsUpdated, logsUpdated: data.logsUpdated });
      setMigOrphans([]);
    } catch {
      setMigError('Network error during migration.');
    } finally {
      setMigRunning(false);
    }
  }, [migShopId]);

  // Load settings on mount
  const fetchSettings = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const res  = await fetch('/api/settings');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
    } catch {
      setLoadError('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // Pre-fill profile name from auth user
  useEffect(() => {
    if (user) setProfileForm(f => ({ ...f, name: f.name || user.name }));
  }, [user]);

  // Helper to patch a single settings key
  const set = <K extends keyof AppSettings>(key: K, val: AppSettings[K]) =>
    setSettings(s => ({ ...s, [key]: val }));

  // Save settings to DB
  const handleSave = async () => {
    setSaving(true); setSaveError(''); setSaved(false);
    try {
      const res  = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error ?? 'Save failed.'); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Save profile (name + optional password)
  const handleProfileSave = async () => {
    const e: Record<string, string> = {};
    if (!profileForm.name.trim())    e.name = 'Name is required';
    if (profileForm.newPassword) {
      if (!profileForm.currentPassword) e.currentPassword = 'Enter your current password';
      if (profileForm.newPassword.length < 6) e.newPassword = 'At least 6 characters';
      if (profileForm.newPassword !== profileForm.confirmPassword) e.confirmPassword = 'Passwords do not match';
    }
    setProfileErrors(e);
    if (Object.keys(e).length) return;

    if (!user) return;
    setProfileSaving(true); setProfileApiError(''); setProfileSaved(false);
    try {
      // Update name
      const putRes = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileForm.name.trim(),
          email: user.email,
          role: user.role,
          shopId: user.shopId ?? null,
          shopName: user.shopName ?? null,
          isActive: true,
        }),
      });
      if (!putRes.ok) {
        const d = await putRes.json();
        setProfileApiError(d.error ?? 'Failed to update name.');
        return;
      }
      // Reset password if provided
      if (profileForm.newPassword) {
        const patchRes = await fetch(`/api/users/${user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: profileForm.newPassword }),
        });
        if (!patchRes.ok) {
          const d = await patchRes.json();
          setProfileApiError(d.error ?? 'Failed to update password.');
          return;
        }
      }
      setProfileSaved(true);
      setProfileForm(f => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
      setTimeout(() => setProfileSaved(false), 3000);
    } catch {
      setProfileApiError('Network error.');
    } finally {
      setProfileSaving(false);
    }
  };

  // Export audit log CSV
  const handleExportAudit = async () => {
    setExportingAudit(true);
    try {
      const res  = await fetch('/api/settings?action=export-audit', { method: 'POST' });
      if (!res.ok) return;
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const cd   = res.headers.get('Content-Disposition') ?? '';
      const fn   = cd.match(/filename="([^"]+)"/)?.[1] ?? 'audit-log.csv';
      a.href = url; a.download = fn; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingAudit(false);
    }
  };

  // Reset all sessions
  const handleResetSessions = async () => {
    setResettingSessions(true); setSessionResetMsg('');
    try {
      const res = await fetch('/api/settings?action=reset-sessions', { method: 'POST' });
      const d   = await res.json();
      setSessionResetMsg(res.ok ? 'All sessions cleared. Users will need to log in again.' : (d.error ?? 'Failed.'));
    } finally {
      setResettingSessions(false);
    }
  };

  return (
    <AppLayout activeRoute="/settings">
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your platform preferences and configurations</p>
        </div>

        {/* Load Error */}
        {loadError && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <Icon name="ExclamationTriangleIcon" size={15} className="shrink-0" />{loadError}
            <button onClick={fetchSettings} className="ml-auto text-xs underline">Retry</button>
          </div>
        )}

        {/* Tab Bar */}
        <div className="flex gap-1 p-1 bg-white border border-slate-100 shadow-sm rounded-xl w-fit flex-wrap">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
                ${activeTab === tab.key ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
              <Icon name={tab.icon as Parameters<typeof Icon>[0]['name']} size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── GENERAL ───────────────────────────────────────────────────── */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            {/* Profile */}
            <SectionCard title="Profile" description="Update your personal information">
              {profileApiError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl mt-4 mb-2">
                  <Icon name="ExclamationTriangleIcon" size={14} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-700">{profileApiError}</p>
                </div>
              )}
              <SettingRow label="Display Name" description="Your name shown across the platform">
                <input value={profileForm.name} onChange={e => { setProfileForm(f => ({...f, name: e.target.value})); setProfileErrors(v => ({...v, name: ''})); }}
                  className={`w-52 ${ib} ${profileErrors.name ? 'border-red-300' : ''}`} placeholder="Your name" />
                {profileErrors.name && <p className="text-xs text-red-500 mt-0.5">{profileErrors.name}</p>}
              </SettingRow>
              <SettingRow label="Email Address" description="Your login email — contact admin to change">
                <input value={user?.email ?? ''} disabled className={`w-52 ${ib} opacity-60 cursor-not-allowed`} />
              </SettingRow>
              <SettingRow label="Role">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 capitalize">
                  {user?.role === 'superadmin' ? 'Super Admin' : 'Shop Admin'}
                </span>
              </SettingRow>
              <SettingRow label="New Password" description="Leave blank to keep current password">
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={profileForm.newPassword}
                    onChange={e => { setProfileForm(f => ({...f, newPassword: e.target.value})); setProfileErrors(v => ({...v, newPassword: ''})); }}
                    className={`w-52 ${ib} pr-9 ${profileErrors.newPassword ? 'border-red-300' : ''}`} placeholder="Min. 6 characters" />
                  <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <Icon name={showPwd ? 'EyeSlashIcon' : 'EyeIcon'} size={14} />
                  </button>
                </div>
                {profileErrors.newPassword && <p className="text-xs text-red-500 mt-0.5">{profileErrors.newPassword}</p>}
              </SettingRow>
              {profileForm.newPassword && (
                <SettingRow label="Confirm Password">
                  <div>
                    <input type={showPwd ? 'text' : 'password'} value={profileForm.confirmPassword}
                      onChange={e => { setProfileForm(f => ({...f, confirmPassword: e.target.value})); setProfileErrors(v => ({...v, confirmPassword: ''})); }}
                      className={`w-52 ${ib} ${profileErrors.confirmPassword ? 'border-red-300' : ''}`} placeholder="Re-enter new password" />
                    {profileErrors.confirmPassword && <p className="text-xs text-red-500 mt-0.5">{profileErrors.confirmPassword}</p>}
                  </div>
                </SettingRow>
              )}
            </SectionCard>

            {/* Organisation */}
            <SectionCard title="Organisation" description="Basic information about your organisation">
              {loading ? (
                <div className="space-y-4 py-3">
                  {Array.from({length: 5}).map((_,i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="space-y-1"><div className="h-3.5 bg-slate-100 rounded w-32 animate-pulse" /><div className="h-2.5 bg-slate-100 rounded w-48 animate-pulse" /></div>
                      <div className="h-8 bg-slate-100 rounded w-40 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <SettingRow label="Organisation Name" description="Displayed across the platform">
                    <input value={settings.orgName} onChange={e => set('orgName', e.target.value)} className={`w-52 ${ib}`} />
                  </SettingRow>
                  <SettingRow label="Default Currency" description="Used across all reports and pricing">
                    <select value={settings.currency} onChange={e => set('currency', e.target.value)} className={`w-40 ${ib} bg-white`}>
                      <option value="INR">INR — ₹</option>
                      <option value="USD">USD — $</option>
                      <option value="EUR">EUR — €</option>
                      <option value="GBP">GBP — £</option>
                      <option value="NGN">NGN — ₦</option>
                    </select>
                  </SettingRow>
                  <SettingRow label="Timezone" description="Used for scheduling and timestamps">
                    <select value={settings.timezone} onChange={e => set('timezone', e.target.value)} className={`w-52 ${ib} bg-white`}>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="UTC">UTC</option>
                      <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                      <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                    </select>
                  </SettingRow>
                  <SettingRow label="Date Format">
                    <select value={settings.dateFormat} onChange={e => set('dateFormat', e.target.value)} className={`w-40 ${ib} bg-white`}>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </SettingRow>
                  <SettingRow label="Language">
                    <select value={settings.language} onChange={e => set('language', e.target.value)} className={`w-48 ${ib} bg-white`}>
                      <option value="English (US)">English (US)</option>
                      <option value="English (UK)">English (UK)</option>
                      <option value="Hindi">Hindi</option>
                      <option value="French">French</option>
                    </select>
                  </SettingRow>
                </>
              )}
            </SectionCard>

            {/* Inventory Thresholds */}
            <SectionCard title="Inventory Thresholds" description="Default alert thresholds for stock management">
              {loading ? (
                <div className="space-y-4 py-3">
                  {Array.from({length: 2}).map((_,i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="h-3.5 bg-slate-100 rounded w-48 animate-pulse" />
                      <div className="h-8 bg-slate-100 rounded w-20 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <SettingRow label="Low Stock Threshold" description="Flag products with available qty at or below this number">
                    <div className="flex items-center gap-2">
                      <input type="number" min={1} max={1000} value={settings.lowStockThreshold}
                        onChange={e => set('lowStockThreshold', Math.max(1, parseInt(e.target.value) || 1))}
                        className={`w-24 ${ib} text-center`} />
                      <span className="text-xs text-slate-400">units</span>
                    </div>
                  </SettingRow>
                  <SettingRow label="Auto Restock Suggestion" description="Automatically suggest restock when threshold is reached">
                    <Toggle enabled={settings.autoRestockSuggestion} onChange={v => set('autoRestockSuggestion', v)} />
                  </SettingRow>
                </>
              )}
            </SectionCard>

            {saveError && <p className="text-sm text-red-600 text-right">{saveError}</p>}

            <SectionCard title="Billing Tax Handling" description="GST is now stored per product and included in each product's unit price">
              {loading ? (
                <div className="space-y-4 py-3">
                  {Array.from({length: 2}).map((_,i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="h-3.5 bg-slate-100 rounded w-44 animate-pulse" />
                      <div className="h-8 bg-slate-100 rounded w-28 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 py-3">
                  <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                    <Icon name="InformationCircleIcon" size={16} className="mt-0.5 shrink-0 text-indigo-500" />
                    <div>
                      <p className="text-sm font-semibold text-indigo-900">Per-product GST pricing is active</p>
                      <p className="mt-1 text-xs text-indigo-700">Set the included GST percentage directly on each product while adding or editing it. Billing now reverse-calculates the included GST from the product's GST-included unit price.</p>
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>

            {/* Data Migration */}
            <SectionCard title="Data Migration" description="Assign existing products that are missing a shop to a specific shop">
              <div className="py-3 space-y-4">
                {!migChecked ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={checkOrphans}
                      disabled={migLoading}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg transition-all"
                    >
                      {migLoading
                        ? <><Icon name="ArrowPathIcon" size={14} className="animate-spin" />Checking…</>
                        : <><Icon name="MagnifyingGlassIcon" size={14} />Check for unassigned products</>}
                    </button>
                    <p className="text-xs text-slate-400">Click to find products with no shop assigned</p>
                  </div>
                ) : migOrphans.length === 0 ? (
                  <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <Icon name="CheckCircleIcon" size={15} className="text-emerald-500" />
                    <p className="text-sm text-emerald-700 font-medium">All products have a shop assigned. No migration needed.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <Icon name="ExclamationTriangleIcon" size={15} className="text-amber-500 shrink-0" />
                      <p className="text-sm text-amber-800 font-medium">
                        {migOrphans.length} product{migOrphans.length > 1 ? 's' : ''} found with no shop assigned
                      </p>
                    </div>

                    {/* Orphan list */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="grid grid-cols-3 gap-4 px-4 py-2 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        <span>SKU</span><span>Product</span><span className="text-right">Qty</span>
                      </div>
                      {migOrphans.map(p => (
                        <div key={p._id} className="grid grid-cols-3 gap-4 px-4 py-2.5 border-t border-slate-100 text-sm">
                          <span className="font-mono text-xs text-slate-500 truncate">{p.sku}</span>
                          <span className="text-slate-700 truncate">{p.name}</span>
                          <span className="text-right text-slate-500">{p.availableQty}</span>
                        </div>
                      ))}
                    </div>

                    {/* Shop selector + run */}
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Assign all to shop</label>
                        <select
                          value={migShopId}
                          onChange={e => setMigShopId(e.target.value)}
                          className={`${ib} bg-white w-64`}
                        >
                          {migShops.map(s => (
                            <option key={s._id} value={s._id}>{s.name} — {s.location}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={runMigration}
                        disabled={migRunning || !migShopId}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg shadow-sm transition-all"
                      >
                        {migRunning
                          ? <><Icon name="ArrowPathIcon" size={14} className="animate-spin" />Migrating…</>
                          : <><Icon name="ArrowUpTrayIcon" size={14} />Run Migration</>}
                      </button>
                    </div>
                  </div>
                )}

                {migResult && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <Icon name="CheckCircleIcon" size={15} className="text-emerald-500" />
                    <p className="text-sm text-emerald-700 font-medium">
                      Done! {migResult.productsUpdated} product{migResult.productsUpdated !== 1 ? 's' : ''} and {migResult.logsUpdated} log entr{migResult.logsUpdated !== 1 ? 'ies' : 'y'} updated.
                    </p>
                  </div>
                )}
                {migError && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                    <Icon name="ExclamationCircleIcon" size={15} className="text-red-500" />
                    <p className="text-sm text-red-700">{migError}</p>
                  </div>
                )}
              </div>
            </SectionCard>

            <div className="flex justify-end gap-3">
              <SaveButton saving={profileSaving} saved={profileSaved} onClick={handleProfileSave} label="Save Profile" />
              <SaveButton saving={saving} saved={saved} onClick={handleSave} label="Save Settings" />
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS ─────────────────────────────────────────────── */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <SectionCard title="Email Notifications" description="Choose which events trigger email alerts">
              {loading ? (
                <div className="space-y-4 py-3">{Array.from({length: 4}).map((_,i) => <div key={i} className="flex justify-between items-center"><div className="h-3.5 bg-slate-100 rounded w-48 animate-pulse" /><div className="h-5 w-9 bg-slate-100 rounded-full animate-pulse" /></div>)}</div>
              ) : (
                <>
                  <SettingRow label="Low Stock Alert" description="Send email when a product falls below its reorder point">
                    <Toggle enabled={settings.notifLowStockEmail} onChange={v => set('notifLowStockEmail', v)} />
                  </SettingRow>
                  <SettingRow label="Out of Stock Alert" description="Send email when a product reaches zero quantity">
                    <Toggle enabled={settings.notifOutOfStockEmail} onChange={v => set('notifOutOfStockEmail', v)} />
                  </SettingRow>
                  <SettingRow label="Shop Sync Error" description="Notify when a shop fails to sync">
                    <Toggle enabled={settings.notifShopSyncError} onChange={v => set('notifShopSyncError', v)} />
                  </SettingRow>
                  <SettingRow label="Restock Approved" description="Notify when a restock request is approved">
                    <Toggle enabled={settings.notifRestockApproved} onChange={v => set('notifRestockApproved', v)} />
                  </SettingRow>
                </>
              )}
            </SectionCard>
            <SectionCard title="Reports & Summaries" description="Scheduled report deliveries">
              {loading ? (
                <div className="space-y-4 py-3">{Array.from({length: 2}).map((_,i) => <div key={i} className="flex justify-between items-center"><div className="h-3.5 bg-slate-100 rounded w-48 animate-pulse" /><div className="h-5 w-9 bg-slate-100 rounded-full animate-pulse" /></div>)}</div>
              ) : (
                <>
                  <SettingRow label="Weekly Inventory Report" description="Summary every Monday at 8:00 AM">
                    <Toggle enabled={settings.notifWeeklyReport} onChange={v => set('notifWeeklyReport', v)} />
                  </SettingRow>
                  <SettingRow label="New User Registration Alert" description="Notify when a new user joins the platform">
                    <Toggle enabled={settings.notifNewUserAlert} onChange={v => set('notifNewUserAlert', v)} />
                  </SettingRow>
                </>
              )}
            </SectionCard>
            {saveError && <p className="text-sm text-red-600 text-right">{saveError}</p>}
            <div className="flex justify-end">
              <SaveButton saving={saving} saved={saved} onClick={handleSave} label="Save Preferences" />
            </div>
          </div>
        )}

        {/* ── SECURITY ──────────────────────────────────────────────────── */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <SectionCard title="Authentication" description="Control how users access the platform">
              {loading ? (
                <div className="space-y-4 py-3">{Array.from({length: 3}).map((_,i) => <div key={i} className="flex justify-between items-center"><div className="h-3.5 bg-slate-100 rounded w-48 animate-pulse" /><div className="h-5 w-9 bg-slate-100 rounded-full animate-pulse" /></div>)}</div>
              ) : (
                <>
                  <SettingRow label="Two-Factor Authentication" description="Require 2FA for all admin accounts">
                    <Toggle enabled={settings.secTwoFactor} onChange={v => set('secTwoFactor', v)} />
                  </SettingRow>
                  <SettingRow label="Session Timeout" description="Auto-logout after 30 minutes of inactivity">
                    <Toggle enabled={settings.secSessionTimeout} onChange={v => set('secSessionTimeout', v)} />
                  </SettingRow>
                  <SettingRow label="IP Whitelist" description="Restrict login to approved IP addresses only">
                    <Toggle enabled={settings.secIpWhitelist} onChange={v => set('secIpWhitelist', v)} />
                  </SettingRow>
                </>
              )}
            </SectionCard>
            <SectionCard title="Audit & Compliance" description="Track and monitor platform activity">
              {loading ? (
                <div className="space-y-4 py-3"><div className="flex justify-between items-center"><div className="h-3.5 bg-slate-100 rounded w-48 animate-pulse" /><div className="h-5 w-9 bg-slate-100 rounded-full animate-pulse" /></div></div>
              ) : (
                <>
                  <SettingRow label="Audit Log" description="Keep a detailed log of all stock movements">
                    <Toggle enabled={settings.secAuditLog} onChange={v => set('secAuditLog', v)} />
                  </SettingRow>
                  <SettingRow label="Export Audit Log" description="Download up to 500 recent stock movement records">
                    <button onClick={handleExportAudit} disabled={exportingAudit}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50">
                      {exportingAudit
                        ? <><Icon name="ArrowPathIcon" size={14} className="animate-spin text-slate-400" />Exporting…</>
                        : <><Icon name="ArrowDownTrayIcon" size={14} className="text-slate-400" />Download CSV</>
                      }
                    </button>
                  </SettingRow>
                </>
              )}
            </SectionCard>
            <SectionCard title="Danger Zone" description="Irreversible actions — proceed with caution">
              <SettingRow label="Reset All User Sessions" description="Force all users to log out immediately">
                <div className="flex items-center gap-3">
                  {sessionResetMsg && <p className="text-xs text-emerald-600 max-w-[200px]">{sessionResetMsg}</p>}
                  <button onClick={handleResetSessions} disabled={resettingSessions}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50">
                    {resettingSessions && <Icon name="ArrowPathIcon" size={13} className="animate-spin" />}
                    Reset Sessions
                  </button>
                </div>
              </SettingRow>
              <SettingRow label="Delete All Data" description="Permanently erase all inventory and user data">
                <div className="flex items-center gap-2">
                  <input type="text" placeholder='Type "DELETE" to confirm' value={dangerConfirm} onChange={e => setDangerConfirm(e.target.value)}
                    className={`w-44 ${ib} border-red-200 text-xs`} />
                  <button disabled={dangerConfirm !== 'DELETE'}
                    className="px-3 py-1.5 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-30">
                    Delete Data
                  </button>
                </div>
              </SettingRow>
            </SectionCard>
            {saveError && <p className="text-sm text-red-600 text-right">{saveError}</p>}
            <div className="flex justify-end">
              <SaveButton saving={saving} saved={saved} onClick={handleSave} label="Save Security Settings" />
            </div>
          </div>
        )}

        {/* ── INTEGRATIONS ──────────────────────────────────────────────── */}
        {activeTab === 'integrations' && (
          <div className="space-y-4">
            <SectionCard title="Connected Services" description="Third-party integrations and API connections">
              {[
                { name: 'Slack',        desc: 'Send inventory alerts to Slack channels',         connected: false, icon: 'ChatBubbleLeftRightIcon', color: 'bg-purple-50 text-purple-600' },
                { name: 'Google Sheets',desc: 'Sync inventory data to Google Sheets',            connected: false, icon: 'TableCellsIcon',           color: 'bg-emerald-50 text-emerald-600' },
                { name: 'QuickBooks',   desc: 'Sync stock values with your accounting',          connected: false, icon: 'CalculatorIcon',           color: 'bg-sky-50 text-sky-600'    },
                { name: 'Shopify',      desc: 'Import/export products from your Shopify store',  connected: false, icon: 'ShoppingBagIcon',          color: 'bg-green-50 text-green-600' },
                { name: 'SendGrid',     desc: 'Email notifications via SendGrid',                connected: false, icon: 'EnvelopeIcon',             color: 'bg-blue-50 text-blue-600'  },
                { name: 'Zapier',       desc: 'Automate workflows with 5,000+ apps',             connected: false, icon: 'BoltIcon',                 color: 'bg-amber-50 text-amber-600' },
              ].map(item => (
                <div key={item.name} className="flex items-center justify-between gap-4 py-4 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>
                      <Icon name={item.icon as Parameters<typeof Icon>[0]['name']} size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{item.name}</p>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.connected && (
                      <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">Connected</span>
                    )}
                    <button className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      item.connected
                        ? 'text-slate-500 border border-slate-200 hover:bg-slate-50'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                    }`}>
                      {item.connected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                </div>
              ))}
            </SectionCard>
            <SectionCard title="API Access" description="Manage API keys for developer integrations">
              <SettingRow label="API Key" description="Use this key to authenticate API requests">
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 font-mono">sk_live_••••••••••••••••</code>
                  <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-all" title="Copy API key">
                    <Icon name="ClipboardDocumentIcon" size={14} />
                  </button>
                </div>
              </SettingRow>
              <SettingRow label="Regenerate Key" description="This will invalidate your current API key">
                <button className="px-3 py-1.5 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                  Regenerate
                </button>
              </SettingRow>
            </SectionCard>
          </div>
        )}

        {/* ── BILLING ───────────────────────────────────────────────────── */}
        {activeTab === 'billing' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-indigo-600/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-indigo-200 text-sm font-medium mb-1">Current Plan</p>
                  <h2 className="text-2xl font-bold">Pro Plan</h2>
                  <p className="text-indigo-200 text-sm mt-1">Up to 10 shops · Unlimited users · Priority support</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-3xl font-bold">₹4,199</p>
                  <p className="text-indigo-300 text-sm">/month</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-indigo-500/60 flex items-center justify-between gap-4">
                <p className="text-indigo-200 text-sm">
                  Next billing date: <span className="text-white font-semibold">April 28, 2026</span>
                </p>
                <button className="px-4 py-2 text-sm font-semibold bg-white text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors">
                  Upgrade Plan
                </button>
              </div>
            </div>
            <SectionCard title="Payment Method" description="Manage your billing payment details">
              <SettingRow label="Card on File" description="Visa ending in 4242 · Expires 08/27">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">•••• 4242</span>
                  <button className="text-xs font-medium text-indigo-600 hover:underline">Update</button>
                </div>
              </SettingRow>
              <SettingRow label="Billing Email">
                <input defaultValue="billing@shopinventory.com"
                  className={`w-56 ${ib}`} />
              </SettingRow>
            </SectionCard>
            <SectionCard title="Billing History" description="Past invoices and payment records">
              {[
                { date: 'Mar 28, 2026', amount: '₹4,199', status: 'Paid', id: 'INV-0024' },
                { date: 'Feb 28, 2026', amount: '₹4,199', status: 'Paid', id: 'INV-0023' },
                { date: 'Jan 28, 2026', amount: '₹4,199', status: 'Paid', id: 'INV-0022' },
                { date: 'Dec 28, 2025', amount: '₹4,199', status: 'Paid', id: 'INV-0021' },
              ].map(inv => (
                <div key={inv.id} className="flex items-center justify-between gap-4 py-3.5 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{inv.id}</p>
                    <p className="text-xs text-slate-400">{inv.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700">{inv.amount}</span>
                    <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">{inv.status}</span>
                    <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-all" title="Download invoice">
                      <Icon name="ArrowDownTrayIcon" size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </SectionCard>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
