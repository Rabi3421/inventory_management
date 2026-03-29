'use client';
import React, { useState, useEffect, useCallback } from 'react';
import ShopAdminLayout from '@/components/ShopAdminLayout';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ──────────────────────────────────────────────────────────────────────
type SettingsTab = 'profile' | 'shop' | 'notifications' | 'security';

interface ShopAdminPrefs {
  notifLowStockAlert:    boolean;
  notifOutOfStockAlert:  boolean;
  notifRestockApproved:  boolean;
  notifRestockRejected:  boolean;
  notifDailySummary:     boolean;
  notifWeeklyReport:     boolean;
  secTwoFactor:          boolean;
  secLoginAlerts:        boolean;
  secSessionTimeout:     boolean;
  shopOpenTime:          string;
  shopCloseTime:         string;
  autoLowStockAlerts:    boolean;
  autoRestockRequest:    boolean;
}

const DEFAULT_PREFS: ShopAdminPrefs = {
  notifLowStockAlert:    true,
  notifOutOfStockAlert:  true,
  notifRestockApproved:  true,
  notifRestockRejected:  true,
  notifDailySummary:     true,
  notifWeeklyReport:     false,
  secTwoFactor:          false,
  secLoginAlerts:        true,
  secSessionTimeout:     true,
  shopOpenTime:          '08:00',
  shopCloseTime:         '20:00',
  autoLowStockAlerts:    true,
  autoRestockRequest:    false,
};

const tabs: { key: SettingsTab; label: string; icon: string }[] = [
  { key: 'profile',       label: 'My Profile',    icon: 'UserCircleIcon' },
  { key: 'shop',          label: 'Shop Settings', icon: 'BuildingStorefrontIcon' },
  { key: 'notifications', label: 'Notifications', icon: 'BellIcon' },
  { key: 'security',      label: 'Security',      icon: 'ShieldCheckIcon' },
];

// ─── Sub-components ─────────────────────────────────────────────────────────────
function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${enabled ? 'bg-emerald-600' : 'bg-slate-200'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform duration-200 ${enabled ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-slate-100 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
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

function SaveButton({ saving, saved, onClick, label = 'Save Changes' }: {
  saving: boolean; saved: boolean; onClick: () => void; label?: string;
}) {
  return (
    <button onClick={onClick} disabled={saving}
      className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-60
        ${saved ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'}`}>
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

const ib = 'px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition-all';

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ShopAdminSettingsPage() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // ── Prefs (notifications, shop times, security toggles) ────────────────────
  const [prefs, setPrefs]   = useState<ShopAdminPrefs>(DEFAULT_PREFS);
  const [prefLoading, setPrefLoading] = useState(true);
  const [prefSaving, setPrefSaving]   = useState(false);
  const [prefSaved, setPrefSaved]     = useState(false);
  const [prefError, setPrefError]     = useState('');

  // ── Profile form ────────────────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved]   = useState(false);
  const [profileApiError, setProfileApiError] = useState('');
  const [profileErrors, setProfileErrors]     = useState<Record<string, string>>({});

  // ── Password form ───────────────────────────────────────────────────────────
  const [pwdForm, setPwdForm]     = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdErrors, setPwdErrors] = useState<Record<string, string>>({});
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSaved, setPwdSaved]   = useState(false);
  const [pwdApiError, setPwdApiError] = useState('');
  const [showPwd, setShowPwd]         = useState(false);

  // ── Load prefs ──────────────────────────────────────────────────────────────
  const fetchPrefs = useCallback(async () => {
    setPrefLoading(true); setPrefError('');
    try {
      const res  = await fetch('/api/settings', { credentials: 'include' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const s    = data.settings ?? {};
      setPrefs(prev => ({
        ...prev,
        notifLowStockAlert:    s.notifLowStockEmail   ?? prev.notifLowStockAlert,
        notifOutOfStockAlert:  s.notifOutOfStockEmail ?? prev.notifOutOfStockAlert,
        notifRestockApproved:  s.notifRestockApproved ?? prev.notifRestockApproved,
        notifWeeklyReport:     s.notifWeeklyReport    ?? prev.notifWeeklyReport,
        secTwoFactor:          s.secTwoFactor         ?? prev.secTwoFactor,
        secSessionTimeout:     s.secSessionTimeout    ?? prev.secSessionTimeout,
        shopOpenTime:          s.shopOpenTime         ?? prev.shopOpenTime,
        shopCloseTime:         s.shopCloseTime        ?? prev.shopCloseTime,
        autoLowStockAlerts:    s.autoLowStockAlerts   ?? prev.autoLowStockAlerts,
        autoRestockRequest:    s.autoRestockRequest   ?? prev.autoRestockRequest,
      }));
    } catch {
      setPrefError('Failed to load settings.');
    } finally {
      setPrefLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  // Pre-fill profile from auth user
  useEffect(() => {
    if (user) {
      setProfileForm(f => ({
        name:  f.name  || user.name  || '',
        phone: f.phone || '',
      }));
    }
  }, [user]);

  const setP = <K extends keyof ShopAdminPrefs>(key: K, val: ShopAdminPrefs[K]) =>
    setPrefs(p => ({ ...p, [key]: val }));

  // ── Save prefs ──────────────────────────────────────────────────────────────
  const handleSavePrefs = async () => {
    setPrefSaving(true); setPrefError(''); setPrefSaved(false);
    try {
      const body = {
        notifLowStockEmail:   prefs.notifLowStockAlert,
        notifOutOfStockEmail: prefs.notifOutOfStockAlert,
        notifRestockApproved: prefs.notifRestockApproved,
        notifWeeklyReport:    prefs.notifWeeklyReport,
        secTwoFactor:         prefs.secTwoFactor,
        secSessionTimeout:    prefs.secSessionTimeout,
        shopOpenTime:         prefs.shopOpenTime,
        shopCloseTime:        prefs.shopCloseTime,
        autoLowStockAlerts:   prefs.autoLowStockAlerts,
        autoRestockRequest:   prefs.autoRestockRequest,
      };
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Save failed');
      setPrefSaved(true);
      setTimeout(() => setPrefSaved(false), 3000);
    } catch {
      setPrefError('Failed to save settings. Please try again.');
    } finally {
      setPrefSaving(false);
    }
  };

  // ── Save profile name ───────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    const e: Record<string, string> = {};
    if (!profileForm.name.trim()) e.name = 'Name is required';
    setProfileErrors(e);
    if (Object.keys(e).length || !user) return;

    setProfileSaving(true); setProfileApiError(''); setProfileSaved(false);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name:     profileForm.name.trim(),
          email:    user.email,
          role:     user.role,
          shopId:   user.shopId   ?? null,
          shopName: user.shopName ?? null,
          isActive: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setProfileApiError(data.error ?? 'Failed to update profile.'); return; }
      await refreshUser();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch {
      setProfileApiError('Network error. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Change password ─────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    const e: Record<string, string> = {};
    if (!pwdForm.currentPassword) e.currentPassword = 'Required';
    if (!pwdForm.newPassword)                             e.newPassword = 'Required';
    else if (pwdForm.newPassword.length < 6)              e.newPassword = 'At least 6 characters';
    if (pwdForm.newPassword !== pwdForm.confirmPassword)  e.confirmPassword = 'Passwords do not match';
    setPwdErrors(e);
    if (Object.keys(e).length || !user) return;

    setPwdSaving(true); setPwdApiError(''); setPwdSaved(false);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: pwdForm.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setPwdApiError(data.error ?? 'Failed to update password.'); return; }
      setPwdSaved(true);
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPwdSaved(false), 3000);
    } catch {
      setPwdApiError('Network error. Please try again.');
    } finally {
      setPwdSaving(false);
    }
  };

  // ── Export audit log ────────────────────────────────────────────────────────
  const [exportingAudit, setExportingAudit] = useState(false);
  const handleExportAudit = async () => {
    setExportingAudit(true);
    try {
      const res = await fetch('/api/settings?action=export-audit', { method: 'POST', credentials: 'include' });
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

  // ── Initials helper ─────────────────────────────────────────────────────────
  const initials = (name: string) =>
    name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

  const displayName = profileForm.name || user?.name || '';

  return (
    <ShopAdminLayout activeRoute="/shop-admin/settings">
      <div className="space-y-6 animate-fade-in">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your account and shop preferences</p>
        </div>

        {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 bg-white border border-slate-100 shadow-sm rounded-xl w-fit flex-wrap">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
                ${activeTab === tab.key ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
              <Icon name={tab.icon as Parameters<typeof Icon>[0]['name']} size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── PROFILE TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="space-y-4">

            <SectionCard title="Personal Information" description="Your public profile details">
              {/* Avatar */}
              <div className="py-5 border-b border-slate-100 flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-white">{initials(displayName)}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Profile Photo</p>
                  <p className="text-xs text-slate-400 mb-2">JPG, GIF or PNG. Max 2MB.</p>
                  <button className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                    Upload Photo
                  </button>
                </div>
              </div>

              {profileApiError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl my-3">
                  <Icon name="ExclamationTriangleIcon" size={14} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-700">{profileApiError}</p>
                </div>
              )}

              <SettingRow label="Full Name">
                <div>
                  <input value={profileForm.name}
                    onChange={e => { setProfileForm(f => ({ ...f, name: e.target.value })); setProfileErrors(v => ({ ...v, name: '' })); }}
                    className={`w-52 ${ib} ${profileErrors.name ? 'border-red-300' : ''}`}
                    placeholder="Your full name" />
                  {profileErrors.name && <p className="text-xs text-red-500 mt-0.5">{profileErrors.name}</p>}
                </div>
              </SettingRow>

              <SettingRow label="Email Address" description="Used for login and notifications — contact admin to change">
                <input value={user?.email ?? ''} disabled className={`w-56 ${ib} opacity-60 cursor-not-allowed`} />
              </SettingRow>

              <SettingRow label="Phone Number" description="Optional contact number">
                <input value={profileForm.phone}
                  onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                  className={`w-52 ${ib}`}
                  placeholder="+1 234 567 8900" />
              </SettingRow>

              <SettingRow label="Role" description="Your assigned role in the system">
                <span className="text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-1 rounded-full">
                  Shop Admin
                </span>
              </SettingRow>

              <SettingRow label="Assigned Shop" description="You can only manage this shop">
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Icon name="BuildingStorefrontIcon" size={14} className="text-emerald-500" />
                  {user?.shopName ?? '—'}
                </span>
              </SettingRow>
            </SectionCard>

            <div className="flex justify-end">
              <SaveButton saving={profileSaving} saved={profileSaved} onClick={handleSaveProfile} label="Save Profile" />
            </div>

            {/* Change Password */}
            <SectionCard title="Change Password" description="Update your login password">
              {pwdApiError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl mt-3 mb-1">
                  <Icon name="ExclamationTriangleIcon" size={14} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-700">{pwdApiError}</p>
                </div>
              )}

              <SettingRow label="Current Password">
                <div>
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} value={pwdForm.currentPassword}
                      onChange={e => { setPwdForm(f => ({ ...f, currentPassword: e.target.value })); setPwdErrors(v => ({ ...v, currentPassword: '' })); }}
                      className={`w-52 ${ib} pr-9 ${pwdErrors.currentPassword ? 'border-red-300' : ''}`}
                      placeholder="Current password" />
                    <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <Icon name={showPwd ? 'EyeSlashIcon' : 'EyeIcon'} size={14} />
                    </button>
                  </div>
                  {pwdErrors.currentPassword && <p className="text-xs text-red-500 mt-0.5">{pwdErrors.currentPassword}</p>}
                </div>
              </SettingRow>

              <SettingRow label="New Password" description="Minimum 6 characters">
                <div>
                  <input type={showPwd ? 'text' : 'password'} value={pwdForm.newPassword}
                    onChange={e => { setPwdForm(f => ({ ...f, newPassword: e.target.value })); setPwdErrors(v => ({ ...v, newPassword: '' })); }}
                    className={`w-52 ${ib} ${pwdErrors.newPassword ? 'border-red-300' : ''}`}
                    placeholder="New password" />
                  {pwdErrors.newPassword && <p className="text-xs text-red-500 mt-0.5">{pwdErrors.newPassword}</p>}
                </div>
              </SettingRow>

              <SettingRow label="Confirm New Password">
                <div>
                  <input type={showPwd ? 'text' : 'password'} value={pwdForm.confirmPassword}
                    onChange={e => { setPwdForm(f => ({ ...f, confirmPassword: e.target.value })); setPwdErrors(v => ({ ...v, confirmPassword: '' })); }}
                    className={`w-52 ${ib} ${pwdErrors.confirmPassword ? 'border-red-300' : ''}`}
                    placeholder="Re-enter new password" />
                  {pwdErrors.confirmPassword && <p className="text-xs text-red-500 mt-0.5">{pwdErrors.confirmPassword}</p>}
                </div>
              </SettingRow>

              <div className="py-4 flex items-center gap-3">
                <button onClick={handleChangePassword} disabled={pwdSaving}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-60
                    ${pwdSaved ? 'bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                  {pwdSaving
                    ? <><Icon name="ArrowPathIcon" size={14} className="animate-spin" />Updating…</>
                    : pwdSaved
                    ? <><Icon name="CheckIcon" size={14} />Password Updated!</>
                    : <><Icon name="LockClosedIcon" size={14} />Update Password</>
                  }
                </button>
              </div>
            </SectionCard>

          </div>
        )}

        {/* ── SHOP SETTINGS TAB ───────────────────────────────────────────── */}
        {activeTab === 'shop' && (
          <div className="space-y-4">

            {/* Shop info banner */}
            <div className="bg-emerald-600 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-700/60 flex items-center justify-center">
                  <Icon name="BuildingStorefrontIcon" size={22} className="text-white" />
                </div>
                <div>
                  <p className="text-emerald-200 text-xs font-medium">You are managing</p>
                  <h2 className="text-lg font-bold">{user?.shopName ?? 'Your Shop'}</h2>
                  <p className="text-emerald-200 text-xs flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 inline-block" />
                    Live · Synced
                  </p>
                </div>
              </div>
            </div>

            <SectionCard title="Operating Hours" description="Hours used for reporting and scheduling">
              {prefLoading ? (
                <div className="space-y-4 py-3">
                  {[1,2].map(i => <div key={i} className="flex justify-between items-center"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-8 w-32" /></div>)}
                </div>
              ) : (
                <>
                  <SettingRow label="Opening Time">
                    <input type="time" value={prefs.shopOpenTime} onChange={e => setP('shopOpenTime', e.target.value)}
                      className={`w-36 ${ib}`} />
                  </SettingRow>
                  <SettingRow label="Closing Time">
                    <input type="time" value={prefs.shopCloseTime} onChange={e => setP('shopCloseTime', e.target.value)}
                      className={`w-36 ${ib}`} />
                  </SettingRow>
                </>
              )}
            </SectionCard>

            <SectionCard title="Inventory Preferences" description="Settings specific to stock management at this shop">
              {prefLoading ? (
                <div className="space-y-4 py-3">
                  {[1,2].map(i => <div key={i} className="flex justify-between items-center"><Skeleton className="h-3.5 w-48" /><Skeleton className="h-5 w-9 rounded-full" /></div>)}
                </div>
              ) : (
                <>
                  <SettingRow label="Auto Low-Stock Alerts" description="Automatically flag items below reorder point">
                    <Toggle enabled={prefs.autoLowStockAlerts} onChange={v => setP('autoLowStockAlerts', v)} />
                  </SettingRow>
                  <SettingRow label="Auto Restock Request" description="Auto-create restock request when stock hits zero">
                    <Toggle enabled={prefs.autoRestockRequest} onChange={v => setP('autoRestockRequest', v)} />
                  </SettingRow>
                </>
              )}
            </SectionCard>

            <SectionCard title="Shop Info" description="Read-only details managed by the super admin">
              <SettingRow label="Shop Name">
                <span className="text-sm font-semibold text-slate-700">{user?.shopName ?? '—'}</span>
              </SettingRow>
              <SettingRow label="Shop ID" description="Internal identifier">
                <code className="text-xs bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-500 font-mono">
                  {user?.shopId ?? '—'}
                </code>
              </SettingRow>
              <SettingRow label="To change shop details">
                <span className="text-xs text-slate-400">Contact your super admin</span>
              </SettingRow>
            </SectionCard>

            {prefError && <p className="text-sm text-red-600 text-right">{prefError}</p>}
            <div className="flex justify-end">
              <SaveButton saving={prefSaving} saved={prefSaved} onClick={handleSavePrefs} label="Save Settings" />
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ───────────────────────────────────────────── */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">

            <SectionCard title="Stock Alerts" description="Get notified about inventory changes at your shop">
              {prefLoading ? (
                <div className="space-y-4 py-3">
                  {[1,2].map(i => <div key={i} className="flex justify-between items-center"><Skeleton className="h-3.5 w-48" /><Skeleton className="h-5 w-9 rounded-full" /></div>)}
                </div>
              ) : (
                <>
                  <SettingRow label="Low Stock Alert" description="Notify when a product falls below its reorder point">
                    <Toggle enabled={prefs.notifLowStockAlert} onChange={v => setP('notifLowStockAlert', v)} />
                  </SettingRow>
                  <SettingRow label="Out of Stock Alert" description="Notify when a product reaches zero quantity">
                    <Toggle enabled={prefs.notifOutOfStockAlert} onChange={v => setP('notifOutOfStockAlert', v)} />
                  </SettingRow>
                </>
              )}
            </SectionCard>

            <SectionCard title="Restock Requests" description="Updates on restock request status">
              {prefLoading ? (
                <div className="space-y-4 py-3">
                  {[1,2].map(i => <div key={i} className="flex justify-between items-center"><Skeleton className="h-3.5 w-48" /><Skeleton className="h-5 w-9 rounded-full" /></div>)}
                </div>
              ) : (
                <>
                  <SettingRow label="Request Approved" description="Notify when your restock request is approved">
                    <Toggle enabled={prefs.notifRestockApproved} onChange={v => setP('notifRestockApproved', v)} />
                  </SettingRow>
                  <SettingRow label="Request Rejected" description="Notify when your restock request is rejected">
                    <Toggle enabled={prefs.notifRestockRejected} onChange={v => setP('notifRestockRejected', v)} />
                  </SettingRow>
                </>
              )}
            </SectionCard>

            <SectionCard title="Reports & Summaries" description="Scheduled email digests">
              {prefLoading ? (
                <div className="space-y-4 py-3">
                  {[1,2].map(i => <div key={i} className="flex justify-between items-center"><Skeleton className="h-3.5 w-48" /><Skeleton className="h-5 w-9 rounded-full" /></div>)}
                </div>
              ) : (
                <>
                  <SettingRow label="Daily Inventory Summary" description="Summary at end of each business day">
                    <Toggle enabled={prefs.notifDailySummary} onChange={v => setP('notifDailySummary', v)} />
                  </SettingRow>
                  <SettingRow label="Weekly Report" description="Full weekly report every Monday at 8AM">
                    <Toggle enabled={prefs.notifWeeklyReport} onChange={v => setP('notifWeeklyReport', v)} />
                  </SettingRow>
                </>
              )}
            </SectionCard>

            {prefError && <p className="text-sm text-red-600 text-right">{prefError}</p>}
            <div className="flex justify-end">
              <SaveButton saving={prefSaving} saved={prefSaved} onClick={handleSavePrefs} label="Save Preferences" />
            </div>
          </div>
        )}

        {/* ── SECURITY TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'security' && (
          <div className="space-y-4">

            <SectionCard title="Account Security" description="Protect your shop admin account">
              {prefLoading ? (
                <div className="space-y-4 py-3">
                  {[1,2,3].map(i => <div key={i} className="flex justify-between items-center"><Skeleton className="h-3.5 w-48" /><Skeleton className="h-5 w-9 rounded-full" /></div>)}
                </div>
              ) : (
                <>
                  <SettingRow label="Two-Factor Authentication" description="Require a verification code when you log in">
                    <Toggle enabled={prefs.secTwoFactor} onChange={v => setP('secTwoFactor', v)} />
                  </SettingRow>
                  <SettingRow label="Login Alerts" description="Get notified when your account is accessed from a new device">
                    <Toggle enabled={prefs.secLoginAlerts} onChange={v => setP('secLoginAlerts', v)} />
                  </SettingRow>
                  <SettingRow label="Session Timeout" description="Automatically log out after 30 minutes of inactivity">
                    <Toggle enabled={prefs.secSessionTimeout} onChange={v => setP('secSessionTimeout', v)} />
                  </SettingRow>
                </>
              )}
            </SectionCard>

            <SectionCard title="Audit & Compliance" description="Track and monitor your shop's inventory activity">
              <SettingRow label="Export Activity Log" description="Download up to 500 recent stock movement records for your shop">
                <button onClick={handleExportAudit} disabled={exportingAudit}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50">
                  {exportingAudit
                    ? <><Icon name="ArrowPathIcon" size={14} className="animate-spin text-slate-400" />Exporting…</>
                    : <><Icon name="ArrowDownTrayIcon" size={14} className="text-slate-400" />Download CSV</>
                  }
                </button>
              </SettingRow>
            </SectionCard>

            <SectionCard title="Active Sessions" description="Devices currently logged in to your account">
              <div className="py-3 space-y-3">
                <div className="flex items-center justify-between gap-4 py-3.5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                      <Icon name="ComputerDesktopIcon" size={16} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        Current Browser Session
                        <span className="ml-2 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                          This device
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">Logged in as {user?.email ?? '—'} · Active now</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 py-2">
                  Session management is handled automatically. You will be logged out on password change.
                </p>
              </div>
            </SectionCard>

            {prefError && <p className="text-sm text-red-600 text-right">{prefError}</p>}
            <div className="flex justify-end">
              <SaveButton saving={prefSaving} saved={prefSaved} onClick={handleSavePrefs} label="Save Security Settings" />
            </div>
          </div>
        )}

      </div>
    </ShopAdminLayout>
  );
}
