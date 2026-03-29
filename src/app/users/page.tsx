'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import Icon from '@/components/ui/AppIcon';

// ─── Types ────────────────────────────────────────────────────────────────────
type AppRole   = 'superadmin' | 'shopadmin';
type SortKey   = 'name' | 'role' | 'shopName' | 'isActive' | 'lastLoginAt';
type SortDir   = 'asc' | 'desc';

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: AppRole;
  shopId: string | null;
  shopName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  initials: string;
}

interface KPI { total: number; active: number; superadmin: number; shopadmin: number; }
interface ShopOption { _id: string; name: string; status: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-indigo-500','bg-violet-500','bg-sky-500','bg-emerald-500',
  'bg-amber-500','bg-rose-500','bg-teal-500','bg-orange-500','bg-pink-500','bg-cyan-500',
];
function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function roleCfg(role: AppRole) {
  return role === 'superadmin'
    ? { label: 'Super Admin', badge: 'bg-indigo-50 text-indigo-700 border border-indigo-200', dot: 'bg-indigo-500' }
    : { label: 'Shop Admin',  badge: 'bg-sky-50 text-sky-700 border border-sky-200',          dot: 'bg-sky-500'    };
}
function statusCfg(active: boolean) {
  return active
    ? { badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500', label: 'Active' }
    : { badge: 'bg-red-50 text-red-700 border border-red-200',             dot: 'bg-red-500',     label: 'Suspended' };
}
function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h} hour${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d} day${d > 1 ? 's' : ''} ago`;
  const w = Math.floor(d / 7);
  if (w < 5)   return `${w} week${w > 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── User Modal (Add / Edit) ──────────────────────────────────────────────────
interface UserForm {
  name: string; email: string; role: AppRole;
  shopId: string; shopName: string;
  password: string; confirmPassword: string;
}
function UserModal({ initial, shops, prefilledShop, onClose, onSaved }: {
  initial?: UserItem;
  shops: ShopOption[];
  prefilledShop?: ShopOption;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<UserForm>({
    name:            initial?.name     ?? '',
    email:           initial?.email    ?? '',
    role:            initial?.role     ?? 'shopadmin',
    shopId:          initial?.shopId   ?? prefilledShop?._id   ?? '',
    shopName:        initial?.shopName ?? prefilledShop?.name  ?? '',
    password:        '',
    confirmPassword: '',
  });
  const [errors, setErrors]     = useState<Partial<Record<keyof UserForm, string>>>({});
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState(false);
  const [apiError, setApiError] = useState('');
  const [showPwd, setShowPwd]   = useState(false);

  const set = (k: keyof UserForm, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
    setApiError('');
  };

  // When shop is selected by _id, also set the name
  const handleShopChange = (shopId: string) => {
    const shop = shops.find(s => s._id === shopId);
    setForm(f => ({ ...f, shopId, shopName: shop?.name ?? '' }));
    setErrors(e => ({ ...e, shopId: '' }));
  };

  const validate = () => {
    const e: Partial<Record<keyof UserForm, string>> = {};
    if (!form.name.trim())  e.name  = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (form.role === 'shopadmin' && !form.shopId) e.shopId = 'Assign a shop for Shop Admin role';
    if (!isEdit) {
      if (!form.password)          e.password        = 'Password is required';
      else if (form.password.length < 6) e.password  = 'At least 6 characters';
      if (form.password !== form.confirmPassword)    e.confirmPassword = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true); setApiError('');
    try {
      const url    = isEdit ? `/api/users/${initial!._id}` : '/api/users';
      const method = isEdit ? 'PUT' : 'POST';
      const payload: Record<string, unknown> = {
        name: form.name.trim(), email: form.email.trim(), role: form.role,
        shopId:   form.shopId   || null,
        shopName: form.shopName || null,
      };
      if (!isEdit) { payload.password = form.password; }
      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setApiError(data.error ?? 'Something went wrong.'); setSaving(false); return; }
      setSuccess(true);
      setTimeout(() => { onSaved(); onClose(); }, 1200);
    } catch {
      setApiError('Network error. Please try again.');
      setSaving(false);
    }
  };

  const ib = 'w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Icon name={isEdit ? 'UserIcon' : 'UserPlusIcon'} size={18} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">{isEdit ? 'Edit User' : prefilledShop ? `Create Admin — ${prefilledShop.name}` : 'Add New User'}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{isEdit ? 'Update credentials & access' : 'Create login credentials'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <Icon name="XMarkIcon" size={18} />
          </button>
        </div>

        {success ? (
          <div className="px-6 py-12 text-center">
            <Icon name="CheckCircleIcon" size={44} className="text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800">{isEdit ? 'User updated!' : 'User added successfully!'}</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {apiError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                  <Icon name="ExclamationTriangleIcon" size={14} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-700">{apiError}</p>
                </div>
              )}
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name</label>
                <input type="text" placeholder="e.g. Tunde Okafor" value={form.name} onChange={e => set('name', e.target.value)}
                  className={`${ib} ${errors.name ? 'border-red-300' : 'border-slate-200'}`} />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
                <input type="email" placeholder="user@example.com" value={form.email} onChange={e => set('email', e.target.value)}
                  className={`${ib} ${errors.email ? 'border-red-300' : 'border-slate-200'}`} />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
              {/* Role + Shop side-by-side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role</label>
                  <select value={form.role} onChange={e => { set('role', e.target.value); if (e.target.value === 'superadmin') setForm(f => ({...f, shopId:'', shopName:''})); }}
                    className={`${ib} border-slate-200 bg-white`}>
                    <option value="superadmin">Super Admin</option>
                    <option value="shopadmin">Shop Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Assigned Shop</label>
                  <select
                    disabled={form.role === 'superadmin'}
                    value={form.shopId}
                    onChange={e => handleShopChange(e.target.value)}
                    className={`${ib} bg-white ${errors.shopId ? 'border-red-300' : 'border-slate-200'} disabled:opacity-40 disabled:cursor-not-allowed`}>
                    <option value="">— Select shop —</option>
                    {shops.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                  {errors.shopId && <p className="text-xs text-red-500 mt-1">{errors.shopId}</p>}
                </div>
              </div>
              {/* Password — only on Add */}
              {!isEdit && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
                    <div className="relative">
                      <input type={showPwd ? 'text' : 'password'} placeholder="Min. 6 characters" value={form.password} onChange={e => set('password', e.target.value)}
                        className={`${ib} pr-9 ${errors.password ? 'border-red-300' : 'border-slate-200'}`} />
                      <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <Icon name={showPwd ? 'EyeSlashIcon' : 'EyeIcon'} size={15} />
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirm Password</label>
                    <input type={showPwd ? 'text' : 'password'} placeholder="Re-enter password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                      className={`${ib} ${errors.confirmPassword ? 'border-red-300' : 'border-slate-200'}`} />
                    {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 border border-slate-200 rounded-xl hover:bg-white">Cancel</button>
              <button onClick={handleSubmit} disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
                {saving && <Icon name="ArrowPathIcon" size={14} className="animate-spin" />}
                {isEdit ? 'Save Changes' : 'Add User'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Reset Password Modal ─────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose, onSaved }: { user: UserItem; onClose: () => void; onSaved: () => void; }) {
  const [pwd, setPwd]         = useState('');
  const [conf, setConf]       = useState('');
  const [errors, setErrors]   = useState<{ pwd?: string; conf?: string }>({});
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async () => {
    const e: { pwd?: string; conf?: string } = {};
    if (!pwd)             e.pwd  = 'Password is required';
    else if (pwd.length < 6) e.pwd = 'At least 6 characters';
    if (pwd !== conf)     e.conf = 'Passwords do not match';
    setErrors(e); if (Object.keys(e).length) return;
    setSaving(true); setApiError('');
    try {
      const res  = await fetch(`/api/users/${user._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwd }) });
      const data = await res.json();
      if (!res.ok) { setApiError(data.error ?? 'Failed.'); setSaving(false); return; }
      setSuccess(true);
      setTimeout(() => { onSaved(); onClose(); }, 1200);
    } catch {
      setApiError('Network error.'); setSaving(false);
    }
  };

  const ib = 'w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Icon name="KeyIcon" size={18} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">Reset Password</h3>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[180px]">{user.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <Icon name="XMarkIcon" size={18} />
          </button>
        </div>
        {success ? (
          <div className="px-6 py-10 text-center">
            <Icon name="CheckCircleIcon" size={40} className="text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">Password updated!</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 space-y-4">
              {apiError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">{apiError}</p>}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">New Password</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} placeholder="Min. 6 characters" value={pwd} onChange={e => { setPwd(e.target.value); setErrors(v => ({...v, pwd:''})); }}
                    className={`${ib} pr-9 ${errors.pwd ? 'border-red-300' : 'border-slate-200'}`} />
                  <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <Icon name={showPwd ? 'EyeSlashIcon' : 'EyeIcon'} size={15} />
                  </button>
                </div>
                {errors.pwd && <p className="text-xs text-red-500 mt-1">{errors.pwd}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirm Password</label>
                <input type={showPwd ? 'text' : 'password'} placeholder="Re-enter password" value={conf} onChange={e => { setConf(e.target.value); setErrors(v => ({...v, conf:''})); }}
                  className={`${ib} ${errors.conf ? 'border-red-300' : 'border-slate-200'}`} />
                {errors.conf && <p className="text-xs text-red-500 mt-1">{errors.conf}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 border border-slate-200 rounded-xl hover:bg-white">Cancel</button>
              <button onClick={handleSubmit} disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
                {saving && <Icon name="ArrowPathIcon" size={14} className="animate-spin" />}Reset Password
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteConfirmModal({ user, onClose, onDeleted }: { user: UserItem; onClose: () => void; onDeleted: () => void; }) {
  const [deleting, setDeleting] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${user._id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); setApiError(d.error ?? 'Failed.'); setDeleting(false); return; }
      onDeleted(); onClose();
    } catch {
      setApiError('Network error.'); setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <Icon name="TrashIcon" size={22} className="text-red-500" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Delete &ldquo;{user.name}&rdquo;?</h3>
          <p className="text-sm text-slate-500">This user will lose all access immediately. This cannot be undone.</p>
          {apiError && <p className="text-xs text-red-600 mt-3">{apiError}</p>}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 border border-slate-200 rounded-xl hover:bg-white">Cancel</button>
          <button onClick={handleDelete} disabled={deleting}
            className="inline-flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
            {deleting && <Icon name="ArrowPathIcon" size={14} className="animate-spin" />}Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shop Coverage Card ───────────────────────────────────────────────────────
function ShopCoverageCard({
  shop,
  admin,
  onCreateAdmin,
  onEdit,
  onResetPassword,
  onDelete,
}: {
  shop: ShopOption;
  admin: UserItem | undefined;
  onCreateAdmin: (shop: ShopOption) => void;
  onEdit: (user: UserItem) => void;
  onResetPassword: (user: UserItem) => void;
  onDelete: (user: UserItem) => void;
}) {
  const hasCred = !!admin;
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-3 ${hasCred ? 'border-emerald-100' : 'border-amber-200'}`}>
      {/* Shop header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${hasCred ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            <Icon name="BuildingStorefrontIcon" size={16} className={hasCred ? 'text-emerald-600' : 'text-amber-500'} />
          </div>
          <span className="text-sm font-semibold text-slate-800 truncate">{shop.name}</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${hasCred ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {hasCred ? '✓ Has Admin' : '⚠ No Admin'}
        </span>
      </div>

      {/* Admin info or empty state */}
      {hasCred ? (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-700 truncate">{admin.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{admin.email}</p>
            <span className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${admin.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${admin.isActive ? 'bg-emerald-500' : 'bg-red-400'}`} />
              {admin.isActive ? 'Active' : 'Suspended'}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onEdit(admin)} title="Edit Admin"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
              <Icon name="PencilSquareIcon" size={13} />
            </button>
            <button onClick={() => onResetPassword(admin)} title="Reset Password"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-all">
              <Icon name="KeyIcon" size={13} />
            </button>
            <button onClick={() => onDelete(admin)} title="Delete Admin"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all">
              <Icon name="TrashIcon" size={13} />
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => onCreateAdmin(shop)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-all">
          <Icon name="UserPlusIcon" size={13} />
          Create Admin Account
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [users, setUsers]           = useState<UserItem[]>([]);
  const [shops, setShops]           = useState<ShopOption[]>([]);
  const [kpi, setKpi]               = useState<KPI>({ total: 0, active: 0, superadmin: 0, shopadmin: 0 });
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Suspended'>('All');
  const [sortKey, setSortKey]       = useState<SortKey>('name');
  const [sortDir, setSortDir]       = useState<SortDir>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForShop, setAddForShop]     = useState<ShopOption | null>(null);
  const [editUser, setEditUser]         = useState<UserItem | null>(null);
  const [resetUser, setResetUser]       = useState<UserItem | null>(null);
  const [deleteUser, setDeleteUser]     = useState<UserItem | null>(null);
  const [togglingId, setTogglingId]     = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim())          params.set('search', search.trim());
      if (roleFilter !== 'All')   params.set('role',   roleFilter);
      if (statusFilter !== 'All') params.set('status', statusFilter);
      const res  = await fetch(`/api/users?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data.items   ?? []);
      setKpi(data.kpi       ?? { total: 0, active: 0, superadmin: 0, shopadmin: 0 });
      setShops(data.shops   ?? []);
    } catch {
      setError('Failed to load users. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  // Map shopId → the first shopadmin assigned to that shop
  const shopAdminMap = useMemo(() => {
    const map = new Map<string, UserItem>();
    users.forEach(u => {
      if (u.role === 'shopadmin' && u.shopId && !map.has(u.shopId)) {
        map.set(u.shopId, u);
      }
    });
    return map;
  }, [users]);

  const handleCreateAdminForShop = (shop: ShopOption) => {
    setAddForShop(shop);
    setShowAddModal(true);
  };

  const sorted = useMemo(() => {
    const data = [...users];
    data.sort((a, b) => {
      let av: string | number | boolean | null = a[sortKey];
      let bv: string | number | boolean | null = b[sortKey];
      if (typeof av === 'boolean') av = av ? 0 : 1;
      if (typeof bv === 'boolean') bv = bv ? 0 : 1;
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc'
        ? String(av ?? '').localeCompare(String(bv ?? ''))
        : String(bv ?? '').localeCompare(String(av ?? ''));
    });
    return data;
  }, [users, sortKey, sortDir]);

  const toggleSort   = (k: SortKey) => { if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(k); setSortDir('asc'); } };
  const toggleRow    = (id: string) => { setSelectedRows(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const toggleAll    = () => { setSelectedRows(selectedRows.size === sorted.length ? new Set() : new Set(sorted.map(u => u._id))); };

  const toggleActive = async (user: UserItem) => {
    setTogglingId(user._id);
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isActive: !u.isActive } : u));
    } finally {
      setTogglingId(null);
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 inline-flex flex-col gap-0 shrink-0">
      <Icon name="ChevronUpIcon"   size={9} className={sortKey === col && sortDir === 'asc'  ? 'text-indigo-600' : 'text-slate-300'} />
      <Icon name="ChevronDownIcon" size={9} className={sortKey === col && sortDir === 'desc' ? 'text-indigo-600' : 'text-slate-300'} />
    </span>
  );

  return (
    <AppLayout activeRoute="/users">
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-2xl font-bold text-slate-900">Users</h1>
              <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">{kpi.total} total</span>
            </div>
            <p className="text-slate-500 text-sm">Manage shop admin credentials, roles, and access control</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={fetchUsers}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm">
              <Icon name="ArrowPathIcon" size={15} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-600/20 active:scale-95">
              <Icon name="UserPlusIcon" size={15} /> Invite User
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Active Users',  value: kpi.active,     icon: 'CheckCircleIcon',  color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
            { label: 'Super Admins',  value: kpi.superadmin, icon: 'ShieldCheckIcon',  color: 'bg-indigo-50 text-indigo-600',   border: 'border-indigo-100'  },
            { label: 'Shop Admins',   value: kpi.shopadmin,  icon: 'UserGroupIcon',    color: 'bg-sky-50 text-sky-600',         border: 'border-sky-100'     },
            { label: 'Total Users',   value: kpi.total,      icon: 'UsersIcon',        color: 'bg-slate-50 text-slate-600',     border: 'border-slate-200'   },
          ].map(card => (
            <div key={card.label} className={`bg-white rounded-xl border ${card.border} shadow-sm p-4 flex items-center gap-3`}>
              <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center shrink-0`}>
                <Icon name={card.icon as Parameters<typeof Icon>[0]['name']} size={18} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{card.label}</p>
                <p className="text-lg font-bold text-slate-800">{loading ? '—' : card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Shop Coverage */}
        {!loading && shops.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Icon name="BuildingStorefrontIcon" size={16} className="text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-800">Shop Admin Coverage</h2>
                <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{shops.length} shops</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />{shops.filter(s => shopAdminMap.has(s._id)).length} covered</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />{shops.filter(s => !shopAdminMap.has(s._id)).length} missing</span>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {shops.map(shop => (
                <ShopCoverageCard
                  key={shop._id}
                  shop={shop}
                  admin={shopAdminMap.get(shop._id)}
                  onCreateAdmin={handleCreateAdminForShop}
                  onEdit={setEditUser}
                  onResetPassword={setResetUser}
                  onDelete={setDeleteUser}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <Icon name="ExclamationTriangleIcon" size={15} className="shrink-0" />{error}
          </div>
        )}

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
            <div className="relative max-w-xs w-full">
              <Icon name="MagnifyingGlassIcon" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search users\u2026" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-slate-400" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as AppRole | 'All')}
                className="text-sm border border-slate-200 bg-white rounded-lg px-3 py-2 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="All">All Roles</option>
                <option value="superadmin">Super Admin</option>
                <option value="shopadmin">Shop Admin</option>
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'All' | 'Active' | 'Suspended')}
                className="text-sm border border-slate-200 bg-white rounded-lg px-3 py-2 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
              </select>
              {selectedRows.size > 0 && (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <span className="text-xs text-slate-500">{selectedRows.size} selected</span>
                  <button className="text-xs px-2 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium">Delete</button>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="pl-5 pr-3 py-3 text-left w-10">
                    <input type="checkbox" checked={selectedRows.size === sorted.length && sorted.length > 0} onChange={toggleAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400" />
                  </th>
                  {([
                    { key: 'name',        label: 'User'          },
                    { key: 'role',        label: 'Role'          },
                    { key: 'shopName',    label: 'Assigned Shop' },
                    { key: 'isActive',    label: 'Status'        },
                    { key: 'lastLoginAt', label: 'Last Login'    },
                  ] as { key: SortKey; label: string }[]).map(col => (
                    <th key={col.key} onClick={() => toggleSort(col.key)}
                      className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 cursor-pointer select-none hover:text-slate-600 whitespace-nowrap">
                      <span className="inline-flex items-center gap-0.5">{col.label}<SortIcon col={col.key} /></span>
                    </th>
                  ))}
                  <th className="pr-5 pl-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-3 py-4">
                          <div className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: j === 1 ? '70%' : '50%' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : sorted.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-16 text-slate-400">
                    <Icon name="UsersIcon" size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">{search || roleFilter !== 'All' || statusFilter !== 'All' ? 'No users match your filter' : 'No users yet'}</p>
                    {!search && roleFilter === 'All' && statusFilter === 'All' && (
                      <button onClick={() => setShowAddModal(true)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline">
                        <Icon name="UserPlusIcon" size={12} /> Invite User
                      </button>
                    )}
                  </td></tr>
                ) : sorted.map(user => {
                  const rc = roleCfg(user.role);
                  const sc = statusCfg(user.isActive);
                  const ac = avatarColor(user._id);
                  return (
                    <tr key={user._id} className={`border-b border-slate-50 transition-colors ${selectedRows.has(user._id) ? 'bg-indigo-50/40' : 'hover:bg-slate-50/60'}`}>
                      <td className="pl-5 pr-3 py-3.5">
                        <input type="checkbox" checked={selectedRows.has(user._id)} onChange={() => toggleRow(user._id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400" />
                      </td>
                      {/* User */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white ${ac}`}>
                            {user.initials}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{user.name}</p>
                            <p className="text-xs text-slate-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      {/* Role */}
                      <td className="px-3 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${rc.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${rc.dot}`} />{rc.label}
                        </span>
                      </td>
                      {/* Shop */}
                      <td className="px-3 py-3.5 text-sm text-slate-600">
                        {user.shopName
                          ? <span className="flex items-center gap-1"><Icon name="BuildingStorefrontIcon" size={12} className="text-slate-400 shrink-0" />{user.shopName}</span>
                          : <span className="text-xs text-slate-400">All Shops</span>}
                      </td>
                      {/* Status */}
                      <td className="px-3 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sc.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                        </span>
                      </td>
                      {/* Last Login */}
                      <td className="px-3 py-3.5 text-xs text-slate-400">{timeAgo(user.lastLoginAt)}</td>
                      {/* Actions */}
                      <td className="pr-5 pl-3 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditUser(user)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all" title="Edit User">
                            <Icon name="PencilSquareIcon" size={14} />
                          </button>
                          <button onClick={() => setResetUser(user)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-all" title="Reset Password">
                            <Icon name="KeyIcon" size={14} />
                          </button>
                          <button onClick={() => toggleActive(user)} disabled={togglingId === user._id}
                            className={`p-1.5 rounded-lg transition-all disabled:opacity-40 ${user.isActive ? 'text-slate-400 hover:bg-red-50 hover:text-red-600' : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
                            title={user.isActive ? 'Suspend User' : 'Activate User'}>
                            {togglingId === user._id
                              ? <Icon name="ArrowPathIcon" size={14} className="animate-spin" />
                              : <Icon name={user.isActive ? 'NoSymbolIcon' : 'CheckCircleIcon'} size={14} />
                            }
                          </button>
                          <button onClick={() => setDeleteUser(user)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all" title="Delete User">
                            <Icon name="TrashIcon" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center px-5 py-3 border-t border-slate-100 bg-slate-50/40">
            <p className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{sorted.length}</span> of <span className="font-semibold text-slate-700">{kpi.total}</span> users
            </p>
          </div>
        </div>
      </div>

      {showAddModal && (
        <UserModal
          shops={shops}
          prefilledShop={addForShop ?? undefined}
          onClose={() => { setShowAddModal(false); setAddForShop(null); }}
          onSaved={fetchUsers}
        />
      )}
      {editUser     && <UserModal shops={shops} initial={editUser} onClose={() => setEditUser(null)} onSaved={fetchUsers} />}
      {resetUser    && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} onSaved={fetchUsers} />}
      {deleteUser   && <DeleteConfirmModal user={deleteUser} onClose={() => setDeleteUser(null)} onDeleted={fetchUsers} />}
    </AppLayout>
  );
}
