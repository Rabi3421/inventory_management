import React, { Suspense } from 'react';
import LoginForm from './components/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <BrandPanel />
      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12 lg:px-16">
        <div className="w-full max-w-md animate-fade-in">
          <Suspense fallback={<div className="h-96 flex items-center justify-center text-slate-400 text-sm">Loading…</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="hidden lg:flex lg:w-[520px] xl:w-[600px] bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-800 flex-col justify-between p-12 relative overflow-hidden shrink-0">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/3 -left-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-indigo-900/40" />
        {/* Grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="brand-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#brand-grid)" />
        </svg>
      </div>
      {/* Logo */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 7H4C2.9 7 2 7.9 2 9V19C2 20.1 2.9 21 4 21H20C21.1 21 22 20.1 22 19V9C22 7.9 21.1 7 20 7Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 21V5C16 3.9 15.1 3 14 3H10C8.9 3 8 3.9 8 5V21" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">ShopInventory</span>
        </div>
      </div>
      {/* Main copy */}
      <div className="relative z-10 flex-1 flex flex-col justify-center py-8">
        {/* Warehouse illustration */}
        <div className="mb-10">
          <WarehouseIllustration />
        </div>

        <h1 className="text-3xl font-bold text-white leading-tight mb-4">
          Multi-store inventory,<br />unified in one place.
        </h1>
        <p className="text-indigo-200 text-base leading-relaxed max-w-sm">
          Track stock levels, manage reorders, and monitor inventory health across all your shop locations — in real time.
        </p>

        {/* Feature bullets */}
        <div className="mt-8 space-y-3">
          {[
            { icon: '📦', text: 'Real-time stock sync across all shops' },
            { icon: '🔔', text: 'Automatic low-stock alerts & reorder triggers' },
            { icon: '📊', text: 'Shop-wise inventory analytics & reports' },
          ]?.map((feat, i) => (
            <div key={`feat-${i}`} className="flex items-center gap-3">
              <span className="text-lg">{feat?.icon}</span>
              <span className="text-indigo-100 text-sm">{feat?.text}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Footer */}
      <div className="relative z-10">
        <p className="text-indigo-300 text-xs">© 2026 ShopInventory. All rights reserved.</p>
      </div>
    </div>
  );
}

function WarehouseIllustration() {
  return (
    <svg viewBox="0 0 320 180" className="w-full max-w-xs" xmlns="http://www.w3.org/2000/svg">
      {/* Warehouse building */}
      <rect x="40" y="80" width="240" height="90" rx="4" fill="rgba(255,255,255,0.12)" />
      <polygon points="40,80 160,20 280,80" fill="rgba(255,255,255,0.18)" />
      {/* Door */}
      <rect x="130" y="120" width="60" height="50" rx="3" fill="rgba(255,255,255,0.25)" />
      {/* Windows */}
      <rect x="60" y="100" width="40" height="30" rx="2" fill="rgba(255,255,255,0.2)" />
      <rect x="220" y="100" width="40" height="30" rx="2" fill="rgba(255,255,255,0.2)" />
      {/* Shelves inside */}
      <line x1="135" y1="135" x2="185" y2="135" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      <line x1="135" y1="148" x2="185" y2="148" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      {/* Boxes on shelves */}
      <rect x="140" y="126" width="10" height="9" rx="1" fill="rgba(255,255,255,0.35)" />
      <rect x="153" y="126" width="10" height="9" rx="1" fill="rgba(255,255,255,0.25)" />
      <rect x="166" y="126" width="10" height="9" rx="1" fill="rgba(255,255,255,0.35)" />
      <rect x="140" y="139" width="10" height="9" rx="1" fill="rgba(255,255,255,0.25)" />
      <rect x="153" y="139" width="10" height="9" rx="1" fill="rgba(255,255,255,0.35)" />
      {/* Forklift */}
      <rect x="48" y="148" width="30" height="18" rx="2" fill="rgba(255,255,255,0.2)" />
      <line x1="78" y1="152" x2="92" y2="152" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
      <line x1="78" y1="160" x2="92" y2="160" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
      <circle cx="55" cy="168" r="4" fill="rgba(255,255,255,0.3)" />
      <circle cx="70" cy="168" r="4" fill="rgba(255,255,255,0.3)" />
      {/* Floating boxes */}
      <rect x="200" y="140" width="20" height="20" rx="2" fill="rgba(255,255,255,0.15)" />
      <rect x="225" y="148" width="16" height="16" rx="2" fill="rgba(255,255,255,0.1)" />
      <rect x="245" y="142" width="18" height="18" rx="2" fill="rgba(255,255,255,0.15)" />
    </svg>
  );
}