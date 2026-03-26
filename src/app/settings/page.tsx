'use client';
import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import Icon from '@/components/ui/AppIcon';

type SettingsTab = 'general' | 'notifications' | 'security' | 'integrations' | 'billing';

const tabs: { key: SettingsTab; label: string; icon: string }[] = [
  { key: 'general', label: 'General', icon: 'Cog6ToothIcon' },
  { key: 'notifications', label: 'Notifications', icon: 'BellIcon' },
  { key: 'security', label: 'Security', icon: 'ShieldCheckIcon' },
  { key: 'integrations', label: 'Integrations', icon: 'PuzzlePieceIcon' },
  { key: 'billing', label: 'Billing', icon: 'CreditCardIcon' },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // General
  const [orgName, setOrgName] = useState('ShopInventory Ltd.');
  const [timezone, setTimezone] = useState('Africa/Lagos');
  const [currency, setCurrency] = useState('USD');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [language, setLanguage] = useState('English (US)');

  // Notifications
  const [notifs, setNotifs] = useState({
    lowStockEmail: true,
    outOfStockEmail: true,
    weeklyReport: true,
    newUserAlert: false,
    shopSyncError: true,
    restockApproved: false,
  });

  // Security
  const [security, setSecurity] = useState({
    twoFactor: true,
    sessionTimeout: false,
    ipWhitelist: false,
    auditLog: true,
  });

  const toggleNotif = (key: keyof typeof notifs) => setNotifs(p => ({ ...p, [key]: !p[key] }));
  const toggleSecurity = (key: keyof typeof security) => setSecurity(p => ({ ...p, [key]: !p[key] }));

  return (
    <AppLayout activeRoute="/settings">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your platform preferences and configurations</p>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 p-1 bg-white border border-slate-100 shadow-card rounded-xl w-fit">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
                ${activeTab === tab.key ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <Icon name={tab.icon as Parameters<typeof Icon>[0]['name']} size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <SectionCard title="Organisation" description="Basic information about your organisation">
              <SettingRow label="Organisation Name" description="Displayed across the platform">
                <input
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  className="w-52 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                />
              </SettingRow>
              <SettingRow label="Default Currency" description="Used across all reports and pricing">
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-40 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option>USD</option>
                  <option>NGN</option>
                  <option>GBP</option>
                  <option>EUR</option>
                </select>
              </SettingRow>
              <SettingRow label="Timezone" description="Used for scheduling and timestamps">
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-48 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option>Africa/Lagos</option>
                  <option>UTC</option>
                  <option>America/New_York</option>
                  <option>Europe/London</option>
                </select>
              </SettingRow>
              <SettingRow label="Date Format">
                <select
                  value={dateFormat}
                  onChange={e => setDateFormat(e.target.value)}
                  className="w-40 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option>DD/MM/YYYY</option>
                  <option>MM/DD/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </select>
              </SettingRow>
              <SettingRow label="Language">
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="w-48 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option>English (US)</option>
                  <option>English (UK)</option>
                  <option>French</option>
                </select>
              </SettingRow>
            </SectionCard>
            <SectionCard title="Inventory Thresholds" description="Default alert thresholds for stock management">
              <SettingRow label="Low Stock Threshold" description="Alert when stock drops below this percentage of reorder point">
                <input
                  type="number"
                  defaultValue={20}
                  className="w-24 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-center"
                />
              </SettingRow>
              <SettingRow label="Auto Restock Suggestion" description="Automatically suggest restock when threshold is reached">
                <Toggle enabled={true} onChange={() => {}} />
              </SettingRow>
            </SectionCard>
            <div className="flex justify-end">
              <button className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all duration-150 shadow-md shadow-indigo-600/20 active:scale-95">
                <Icon name="CheckIcon" size={15} />
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <SectionCard title="Email Notifications" description="Choose which events trigger email alerts">
              <SettingRow label="Low Stock Alert" description="Send email when a product falls below its reorder point">
                <Toggle enabled={notifs.lowStockEmail} onChange={() => toggleNotif('lowStockEmail')} />
              </SettingRow>
              <SettingRow label="Out of Stock Alert" description="Send email when a product reaches zero quantity">
                <Toggle enabled={notifs.outOfStockEmail} onChange={() => toggleNotif('outOfStockEmail')} />
              </SettingRow>
              <SettingRow label="Shop Sync Error" description="Notify when a shop fails to sync">
                <Toggle enabled={notifs.shopSyncError} onChange={() => toggleNotif('shopSyncError')} />
              </SettingRow>
              <SettingRow label="Restock Approved" description="Notify when a restock request is approved">
                <Toggle enabled={notifs.restockApproved} onChange={() => toggleNotif('restockApproved')} />
              </SettingRow>
            </SectionCard>
            <SectionCard title="Reports & Summaries" description="Scheduled report deliveries">
              <SettingRow label="Weekly Inventory Report" description="Summary every Monday at 8:00 AM">
                <Toggle enabled={notifs.weeklyReport} onChange={() => toggleNotif('weeklyReport')} />
              </SettingRow>
              <SettingRow label="New User Registration Alert" description="Notify when a new user joins the platform">
                <Toggle enabled={notifs.newUserAlert} onChange={() => toggleNotif('newUserAlert')} />
              </SettingRow>
            </SectionCard>
            <div className="flex justify-end">
              <button className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all duration-150 shadow-md shadow-indigo-600/20 active:scale-95">
                <Icon name="CheckIcon" size={15} />
                Save Preferences
              </button>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <SectionCard title="Authentication" description="Control how users access the platform">
              <SettingRow label="Two-Factor Authentication" description="Require 2FA for all admin accounts">
                <Toggle enabled={security.twoFactor} onChange={() => toggleSecurity('twoFactor')} />
              </SettingRow>
              <SettingRow label="Session Timeout" description="Auto-logout after 30 minutes of inactivity">
                <Toggle enabled={security.sessionTimeout} onChange={() => toggleSecurity('sessionTimeout')} />
              </SettingRow>
              <SettingRow label="IP Whitelist" description="Restrict login to approved IP addresses only">
                <Toggle enabled={security.ipWhitelist} onChange={() => toggleSecurity('ipWhitelist')} />
              </SettingRow>
            </SectionCard>
            <SectionCard title="Audit & Compliance" description="Track and monitor platform activity">
              <SettingRow label="Audit Log" description="Keep a detailed log of all admin actions">
                <Toggle enabled={security.auditLog} onChange={() => toggleSecurity('auditLog')} />
              </SettingRow>
              <SettingRow label="Export Audit Log">
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all duration-150 shadow-card">
                  <Icon name="ArrowDownTrayIcon" size={14} className="text-slate-400" />
                  Download CSV
                </button>
              </SettingRow>
            </SectionCard>
            <SectionCard title="Danger Zone" description="Irreversible actions — proceed with caution">
              <SettingRow label="Reset All User Sessions" description="Force all users to log out immediately">
                <button className="px-3 py-1.5 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
                  Reset Sessions
                </button>
              </SettingRow>
              <SettingRow label="Delete All Data" description="Permanently erase all inventory and user data">
                <button className="px-3 py-1.5 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                  Delete Data
                </button>
              </SettingRow>
            </SectionCard>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div className="space-y-4">
            <SectionCard title="Connected Services" description="Third-party integrations and API connections">
              {[
                { name: 'Slack', desc: 'Send inventory alerts to Slack channels', connected: true, icon: 'ChatBubbleLeftRightIcon', color: 'bg-purple-50 text-purple-600' },
                { name: 'Google Sheets', desc: 'Sync inventory data to Google Sheets', connected: false, icon: 'TableCellsIcon', color: 'bg-emerald-50 text-emerald-600' },
                { name: 'QuickBooks', desc: 'Sync stock values with your accounting', connected: false, icon: 'CalculatorIcon', color: 'bg-sky-50 text-sky-600' },
                { name: 'Shopify', desc: 'Import/export products from your Shopify store', connected: true, icon: 'ShoppingBagIcon', color: 'bg-green-50 text-green-600' },
                { name: 'SendGrid', desc: 'Email notifications via SendGrid', connected: true, icon: 'EnvelopeIcon', color: 'bg-blue-50 text-blue-600' },
                { name: 'Zapier', desc: 'Automate workflows with 5,000+ apps', connected: false, icon: 'BoltIcon', color: 'bg-amber-50 text-amber-600' },
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
                  <button className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    item.connected
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                  }`}>
                    {item.connected ? 'Connected' : 'Connect'}
                  </button>
                </div>
              ))}
            </SectionCard>
            <SectionCard title="API Access" description="Manage API keys for developer integrations">
              <SettingRow label="API Key" description="Use this key to authenticate API requests">
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 font-mono">sk_live_••••••••••••••••</code>
                  <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-all">
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

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-4">
            <div className="bg-indigo-600 rounded-2xl p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-indigo-200 text-sm font-medium mb-1">Current Plan</p>
                  <h2 className="text-2xl font-bold">Pro Plan</h2>
                  <p className="text-indigo-200 text-sm mt-1">Up to 10 shops · Unlimited users · Priority support</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-3xl font-bold">$49</p>
                  <p className="text-indigo-300 text-sm">/month</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-indigo-500 flex items-center justify-between gap-4">
                <p className="text-indigo-200 text-sm">
                  Next billing date: <span className="text-white font-semibold">April 26, 2026</span>
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
                <input
                  defaultValue="billing@shopinventory.com"
                  className="w-56 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                />
              </SettingRow>
            </SectionCard>

            <SectionCard title="Billing History" description="Past invoices and payment records">
              {[
                { date: 'Mar 26, 2026', amount: '$49.00', status: 'Paid', id: 'INV-0024' },
                { date: 'Feb 26, 2026', amount: '$49.00', status: 'Paid', id: 'INV-0023' },
                { date: 'Jan 26, 2026', amount: '$49.00', status: 'Paid', id: 'INV-0022' },
                { date: 'Dec 26, 2025', amount: '$49.00', status: 'Paid', id: 'INV-0021' },
              ].map(inv => (
                <div key={inv.id} className="flex items-center justify-between gap-4 py-3.5 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{inv.id}</p>
                    <p className="text-xs text-slate-400">{inv.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700">{inv.amount}</span>
                    <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">{inv.status}</span>
                    <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-all">
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
