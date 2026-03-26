'use client';
import React, { useState } from 'react';
import ShopAdminLayout from '@/components/ShopAdminLayout';
import Icon from '@/components/ui/AppIcon';

type SettingsTab = 'profile' | 'shop' | 'notifications' | 'security';

const tabs: { key: SettingsTab; label: string; icon: string }[] = [
  { key: 'profile', label: 'My Profile', icon: 'UserCircleIcon' },
  { key: 'shop', label: 'Shop Settings', icon: 'BuildingStorefrontIcon' },
  { key: 'notifications', label: 'Notifications', icon: 'BellIcon' },
  { key: 'security', label: 'Security', icon: 'ShieldCheckIcon' },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${enabled ? 'bg-emerald-600' : 'bg-slate-200'}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform duration-200 ${enabled ? 'translate-x-4' : 'translate-x-1'}`}
      />
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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-slate-100">
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-1">{children}</div>
    </div>
  );
}

export default function ShopAdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Profile
  const [name, setName] = useState('Tunde Okafor');
  const [email, setEmail] = useState('tunde@shopinventory.com');
  const [phone, setPhone] = useState('+234 803 123 4567');

  // Shop
  const [shopName, setShopName] = useState('Lekki Branch');
  const [shopAddress, setShopAddress] = useState('Lekki Phase 1, Lagos');
  const [shopPhone, setShopPhone] = useState('+234 803 123 4567');
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('20:00');
  const [currency, setCurrency] = useState('USD');

  // Notifications
  const [notifs, setNotifs] = useState({
    lowStockAlert: true,
    outOfStockAlert: true,
    restockApproved: true,
    restockRejected: true,
    weeklyReport: false,
    dailySummary: true,
  });

  // Security
  const [security, setSecurity] = useState({
    twoFactor: false,
    loginAlerts: true,
    sessionTimeout: true,
  });

  const toggleNotif = (key: keyof typeof notifs) => setNotifs(p => ({ ...p, [key]: !p[key] }));
  const toggleSecurity = (key: keyof typeof security) => setSecurity(p => ({ ...p, [key]: !p[key] }));

  return (
    <ShopAdminLayout activeRoute="/shop-admin/settings">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your account and shop preferences</p>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 p-1 bg-white border border-slate-100 shadow-card rounded-xl w-fit">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
                ${activeTab === tab.key ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <Icon name={tab.icon as Parameters<typeof Icon>[0]['name']} size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <SectionCard title="Personal Information" description="Your public profile details">
              {/* Avatar */}
              <div className="py-5 border-b border-slate-100 flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">TO</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Profile Photo</p>
                  <p className="text-xs text-slate-400 mb-2">JPG, GIF or PNG. Max 2MB.</p>
                  <button className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                    Upload Photo
                  </button>
                </div>
              </div>
              <SettingRow label="Full Name">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-52 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                />
              </SettingRow>
              <SettingRow label="Email Address" description="Used for login and notifications">
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-56 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                />
              </SettingRow>
              <SettingRow label="Phone Number">
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-52 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                />
              </SettingRow>
              <SettingRow label="Role" description="Your assigned role in the system">
                <span className="text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-1 rounded-full">Shop Admin</span>
              </SettingRow>
              <SettingRow label="Assigned Shop" description="You can only manage this shop">
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Icon name="BuildingStorefrontIcon" size={14} className="text-emerald-500" />
                  Lekki Branch
                </span>
              </SettingRow>
            </SectionCard>
            <div className="flex justify-end">
              <button className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all duration-150 shadow-md shadow-emerald-600/20 active:scale-95">
                <Icon name="CheckIcon" size={15} />
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Shop Settings Tab */}
        {activeTab === 'shop' && (
          <div className="space-y-4">
            {/* Shop Info Card */}
            <div className="bg-emerald-600 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-700/60 flex items-center justify-center">
                  <Icon name="BuildingStorefrontIcon" size={22} className="text-white" />
                </div>
                <div>
                  <p className="text-emerald-200 text-xs font-medium">You are managing</p>
                  <h2 className="text-lg font-bold">{shopName}</h2>
                  <p className="text-emerald-200 text-xs flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 inline-block" />
                    Live · Synced 2 min ago
                  </p>
                </div>
              </div>
            </div>

            <SectionCard title="Shop Details" description="Basic information displayed on reports and receipts">
              <SettingRow label="Shop Name">
                <input
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                  className="w-52 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                />
              </SettingRow>
              <SettingRow label="Address">
                <input
                  value={shopAddress}
                  onChange={e => setShopAddress(e.target.value)}
                  className="w-64 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                />
              </SettingRow>
              <SettingRow label="Shop Phone">
                <input
                  value={shopPhone}
                  onChange={e => setShopPhone(e.target.value)}
                  className="w-52 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                />
              </SettingRow>
              <SettingRow label="Currency">
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-40 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  <option>USD</option>
                  <option>NGN</option>
                  <option>GBP</option>
                </select>
              </SettingRow>
            </SectionCard>

            <SectionCard title="Operating Hours" description="Hours used for reporting and scheduling">
              <SettingRow label="Opening Time">
                <input
                  type="time"
                  value={openTime}
                  onChange={e => setOpenTime(e.target.value)}
                  className="w-36 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </SettingRow>
              <SettingRow label="Closing Time">
                <input
                  type="time"
                  value={closeTime}
                  onChange={e => setCloseTime(e.target.value)}
                  className="w-36 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </SettingRow>
            </SectionCard>

            <SectionCard title="Inventory Preferences" description="Settings specific to stock management at this shop">
              <SettingRow label="Auto Low-Stock Alerts" description="Automatically flag items below reorder point">
                <Toggle enabled={true} onChange={() => {}} />
              </SettingRow>
              <SettingRow label="Auto Restock Request" description="Auto-create restock request when stock hits zero">
                <Toggle enabled={false} onChange={() => {}} />
              </SettingRow>
            </SectionCard>

            <div className="flex justify-end">
              <button className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all duration-150 shadow-md shadow-emerald-600/20 active:scale-95">
                <Icon name="CheckIcon" size={15} />
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <SectionCard title="Stock Alerts" description="Get notified about inventory changes at your shop">
              <SettingRow label="Low Stock Alert" description="Notify when a product falls below its reorder point">
                <Toggle enabled={notifs.lowStockAlert} onChange={() => toggleNotif('lowStockAlert')} />
              </SettingRow>
              <SettingRow label="Out of Stock Alert" description="Notify when a product reaches zero quantity">
                <Toggle enabled={notifs.outOfStockAlert} onChange={() => toggleNotif('outOfStockAlert')} />
              </SettingRow>
            </SectionCard>
            <SectionCard title="Restock Requests" description="Updates on restock request status">
              <SettingRow label="Request Approved" description="Notify when your restock request is approved">
                <Toggle enabled={notifs.restockApproved} onChange={() => toggleNotif('restockApproved')} />
              </SettingRow>
              <SettingRow label="Request Rejected" description="Notify when your restock request is rejected">
                <Toggle enabled={notifs.restockRejected} onChange={() => toggleNotif('restockRejected')} />
              </SettingRow>
            </SectionCard>
            <SectionCard title="Reports & Summaries" description="Scheduled email digests">
              <SettingRow label="Daily Inventory Summary" description="Summary at end of each business day">
                <Toggle enabled={notifs.dailySummary} onChange={() => toggleNotif('dailySummary')} />
              </SettingRow>
              <SettingRow label="Weekly Report" description="Full weekly report every Monday at 8AM">
                <Toggle enabled={notifs.weeklyReport} onChange={() => toggleNotif('weeklyReport')} />
              </SettingRow>
            </SectionCard>
            <div className="flex justify-end">
              <button className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all duration-150 shadow-md shadow-emerald-600/20 active:scale-95">
                <Icon name="CheckIcon" size={15} />
                Save Preferences
              </button>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <SectionCard title="Account Security" description="Protect your shop admin account">
              <SettingRow label="Two-Factor Authentication" description="Require a verification code when you log in">
                <Toggle enabled={security.twoFactor} onChange={() => toggleSecurity('twoFactor')} />
              </SettingRow>
              <SettingRow label="Login Alerts" description="Get notified when your account is accessed from a new device">
                <Toggle enabled={security.loginAlerts} onChange={() => toggleSecurity('loginAlerts')} />
              </SettingRow>
              <SettingRow label="Session Timeout" description="Automatically log out after 30 minutes of inactivity">
                <Toggle enabled={security.sessionTimeout} onChange={() => toggleSecurity('sessionTimeout')} />
              </SettingRow>
            </SectionCard>
            <SectionCard title="Change Password" description="Update your login password">
              <div className="space-y-3 py-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Current Password</label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    className="w-full max-w-sm px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    className="w-full max-w-sm px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    className="w-full max-w-sm px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all duration-150 shadow-md shadow-emerald-600/20 active:scale-95 mt-2">
                  <Icon name="LockClosedIcon" size={14} />
                  Update Password
                </button>
              </div>
            </SectionCard>
            <SectionCard title="Active Sessions" description="Devices currently logged in to your account">
              {[
                { device: 'Chrome on macOS', location: 'Lagos, Nigeria', time: 'Active now', current: true },
                { device: 'Safari on iPhone', location: 'Lagos, Nigeria', time: '3 hours ago', current: false },
              ].map(session => (
                <div key={session.device} className="flex items-center justify-between gap-4 py-3.5 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                      <Icon name="ComputerDesktopIcon" size={16} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {session.device}
                        {session.current && (
                          <span className="ml-2 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                            This device
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">{session.location} · {session.time}</p>
                    </div>
                  </div>
                  {!session.current && (
                    <button className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </SectionCard>
          </div>
        )}
      </div>
    </ShopAdminLayout>
  );
}
