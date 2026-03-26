'use client';
import React, { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import Icon from '@/components/ui/AppIcon';

type UserRole = 'Super Admin' | 'Shop Admin' | 'Viewer';
type UserStatus = 'Active' | 'Inactive' | 'Suspended';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  shop: string;
  status: UserStatus;
  lastLogin: string;
  joinedDate: string;
  avatar: string;
}

const usersData: User[] = [
  { id: 'u-001', name: 'Abayomi Taiwo', email: 'abayomi@shopinventory.com', role: 'Super Admin', shop: 'All Shops', status: 'Active', lastLogin: '2 min ago', joinedDate: '2024-01-10', avatar: 'AT' },
  { id: 'u-002', name: 'Ngozi Adeyemi', email: 'ngozi@shopinventory.com', role: 'Shop Admin', shop: 'Ikeja Branch', status: 'Active', lastLogin: '15 min ago', joinedDate: '2024-03-05', avatar: 'NA' },
  { id: 'u-003', name: 'Tunde Okafor', email: 'tunde@shopinventory.com', role: 'Shop Admin', shop: 'Lekki Branch', status: 'Active', lastLogin: '1 hour ago', joinedDate: '2024-03-12', avatar: 'TO' },
  { id: 'u-004', name: 'Emeka Nwosu', email: 'emeka@shopinventory.com', role: 'Shop Admin', shop: 'Surulere Branch', status: 'Active', lastLogin: '3 hours ago', joinedDate: '2024-04-01', avatar: 'EN' },
  { id: 'u-005', name: 'Amaka Obi', email: 'amaka@shopinventory.com', role: 'Shop Admin', shop: 'Yaba Branch', status: 'Active', lastLogin: 'Yesterday', joinedDate: '2024-04-15', avatar: 'AO' },
  { id: 'u-006', name: 'Damilola Eze', email: 'damilola@shopinventory.com', role: 'Shop Admin', shop: 'Ajah Branch', status: 'Active', lastLogin: '2 days ago', joinedDate: '2024-05-01', avatar: 'DE' },
  { id: 'u-007', name: 'Chioma Agu', email: 'chioma@shopinventory.com', role: 'Shop Admin', shop: 'Victoria Island', status: 'Active', lastLogin: '5 min ago', joinedDate: '2024-05-20', avatar: 'CA' },
  { id: 'u-008', name: 'Seun Badmus', email: 'seun@shopinventory.com', role: 'Viewer', shop: 'Maryland Branch', status: 'Inactive', lastLogin: '1 week ago', joinedDate: '2024-06-10', avatar: 'SB' },
  { id: 'u-009', name: 'Funke Lawal', email: 'funke@shopinventory.com', role: 'Viewer', shop: 'Lekki Branch', status: 'Active', lastLogin: '4 hours ago', joinedDate: '2024-07-01', avatar: 'FL' },
  { id: 'u-010', name: 'Kunle Martins', email: 'kunle@shopinventory.com', role: 'Shop Admin', shop: 'Apapa Branch', status: 'Suspended', lastLogin: '2 weeks ago', joinedDate: '2024-08-15', avatar: 'KM' },
  { id: 'u-011', name: 'Bimpe Ojo', email: 'bimpe@shopinventory.com', role: 'Viewer', shop: 'Ikeja Branch', status: 'Active', lastLogin: '30 min ago', joinedDate: '2024-09-01', avatar: 'BO' },
  { id: 'u-012', name: 'Chidi Okeke', email: 'chidi@shopinventory.com', role: 'Viewer', shop: 'VI Branch', status: 'Active', lastLogin: '1 day ago', joinedDate: '2025-01-10', avatar: 'CO' },
];

const roleConfig: Record<UserRole, { className: string }> = {
  'Super Admin': { className: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  'Shop Admin': { className: 'bg-sky-50 text-sky-700 border border-sky-200' },
  'Viewer': { className: 'bg-slate-100 text-slate-600 border border-slate-200' },
};

const statusConfig: Record<UserStatus, { className: string; dot: string }> = {
  'Active': { className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
  'Inactive': { className: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-400' },
  'Suspended': { className: 'bg-red-50 text-red-700 border border-red-200', dot: 'bg-red-500' },
};

const avatarColors = [
  'bg-indigo-500', 'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-orange-500',
  'bg-cyan-500', 'bg-pink-500', 'bg-lime-600', 'bg-purple-500',
];

type SortKey = 'name' | 'email' | 'role' | 'shop' | 'status' | 'lastLogin';
type SortDir = 'asc' | 'desc';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'All'>('All');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let data = [...usersData];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.shop.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== 'All') data = data.filter(u => u.role === roleFilter);
    if (statusFilter !== 'All') data = data.filter(u => u.status === statusFilter);
    data.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return data;
  }, [search, roleFilter, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const toggleRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === filtered.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(filtered.map(u => u.id)));
  };

  const totalActive = usersData.filter(u => u.status === 'Active').length;
  const totalAdmins = usersData.filter(u => u.role === 'Shop Admin').length;
  const totalSuperAdmins = usersData.filter(u => u.role === 'Super Admin').length;
  const totalViewers = usersData.filter(u => u.role === 'Viewer').length;

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 inline-flex flex-col gap-0">
      <Icon name="ChevronUpIcon" size={10} className={sortKey === col && sortDir === 'asc' ? 'text-indigo-600' : 'text-slate-300'} />
      <Icon name="ChevronDownIcon" size={10} className={sortKey === col && sortDir === 'desc' ? 'text-indigo-600' : 'text-slate-300'} />
    </span>
  );

  return (
    <AppLayout activeRoute="/users">
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-2xl font-bold text-slate-900">Users</h1>
              <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
                {usersData.length} total
              </span>
            </div>
            <p className="text-slate-500 text-sm">Manage admin and viewer accounts across all shops</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all duration-150 shadow-card">
              <Icon name="ArrowDownTrayIcon" size={15} className="text-slate-400" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all duration-150 shadow-md shadow-indigo-600/20 active:scale-95">
              <Icon name="PlusIcon" size={15} />
              Invite User
            </button>
          </div>
        </div>

        {/* KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Active Users', value: totalActive, icon: 'UserCircleIcon', color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
            { label: 'Super Admins', value: totalSuperAdmins, icon: 'ShieldCheckIcon', color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100' },
            { label: 'Shop Admins', value: totalAdmins, icon: 'BuildingStorefrontIcon', color: 'bg-sky-50 text-sky-600', border: 'border-sky-100' },
            { label: 'Viewers', value: totalViewers, icon: 'EyeIcon', color: 'bg-slate-100 text-slate-600', border: 'border-slate-200' },
          ].map(card => (
            <div key={card.label} className={`bg-white rounded-xl border ${card.border} shadow-card p-4 flex items-center gap-3`}>
              <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center shrink-0`}>
                <Icon name={card.icon as Parameters<typeof Icon>[0]['name']} size={18} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{card.label}</p>
                <p className="text-lg font-bold text-slate-800">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
            <div className="relative max-w-xs w-full">
              <Icon name="MagnifyingGlassIcon" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder-slate-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as UserRole | 'All')}
                className="text-sm border border-slate-200 bg-white rounded-lg px-3 py-2 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="All">All Roles</option>
                <option value="Super Admin">Super Admin</option>
                <option value="Shop Admin">Shop Admin</option>
                <option value="Viewer">Viewer</option>
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as UserStatus | 'All')}
                className="text-sm border border-slate-200 bg-white rounded-lg px-3 py-2 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
              {selectedRows.size > 0 && (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <span className="text-xs text-slate-500">{selectedRows.size} selected</span>
                  <button className="text-xs px-2 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-medium">
                    Remove
                  </button>
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
                    <input
                      type="checkbox"
                      checked={selectedRows.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                    />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('name')}>
                    User <SortIcon col="name" />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('role')}>
                    Role <SortIcon col="role" />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('shop')}>
                    Assigned Shop <SortIcon col="shop" />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('status')}>
                    Status <SortIcon col="status" />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 cursor-pointer select-none" onClick={() => toggleSort('lastLogin')}>
                    Last Login <SortIcon col="lastLogin" />
                  </th>
                  <th className="pr-5 pl-3 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-slate-400">
                      <Icon name="UsersIcon" size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">No users found</p>
                    </td>
                  </tr>
                ) : filtered.map((user, idx) => (
                  <tr
                    key={user.id}
                    className={`
                      border-b border-slate-50 transition-colors duration-100 group
                      ${selectedRows.has(user.id) ? 'bg-indigo-50/40' : idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}
                      hover:bg-indigo-50/30
                    `}
                  >
                    <td className="pl-5 pr-3 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(user.id)}
                        onChange={() => toggleRow(user.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                      />
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full ${avatarColors[usersData.indexOf(user) % avatarColors.length]} flex items-center justify-center shrink-0`}>
                          <span className="text-xs font-bold text-white">{user.avatar}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{user.name}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${roleConfig[user.role].className}`}>
                        {user.role === 'Super Admin' && <Icon name="ShieldCheckIcon" size={10} />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="text-slate-600 text-sm">{user.shop}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusConfig[user.status].className}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[user.status].dot}`} />
                        {user.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-xs text-slate-500">{user.lastLogin}</td>
                    <td className="pr-5 pl-3 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-all duration-150" title="Edit User">
                          <Icon name="PencilSquareIcon" size={14} />
                        </button>
                        <button className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-all duration-150" title="Suspend User">
                          <Icon name="NoSymbolIcon" size={14} />
                        </button>
                        <button className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all duration-150" title="Remove User">
                          <Icon name="TrashIcon" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/40">
            <p className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of <span className="font-semibold text-slate-700">{usersData.length}</span> users
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
