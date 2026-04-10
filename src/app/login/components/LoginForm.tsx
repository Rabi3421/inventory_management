'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';

type Role = 'shopadmin' | 'superadmin';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<Role>('shopadmin');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setAuthError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          role,
          rememberMe: data.rememberMe,
          redirectTo: searchParams.get('next'),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setAuthError(result.error ?? 'Unable to sign you in.');
        return;
      }

      router.push(result.redirectTo);
      router.refresh();
    } catch {
      setAuthError('Unable to sign you in right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 lg:hidden">
        <AppLogo size={36} />
        <span className="font-semibold text-slate-800 text-base">श्री राम स्टोर्स</span>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-1.5">
          Inventory Management System
        </h2>
        <p className="text-slate-500 text-sm">
          Manage your multi-store inventory efficiently
        </p>
      </div>

      {/* Role Toggle */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-8">
        {(['shopadmin', 'superadmin'] as Role[]).map(r => (
          <button
            key={`role-${r}`}
            type="button"
            onClick={() => { setRole(r); setAuthError(''); }}
            className={`
              flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200
              ${role === r
                ? 'bg-white text-indigo-700 shadow-card font-semibold'
                : 'text-slate-500 hover:text-slate-700'
              }
            `}
          >
            {r === 'shopadmin' ? 'Shop Admin' : 'Superadmin'}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Auth error */}
        {authError && (
          <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-fade-in">
            <Icon name="ExclamationCircleIcon" size={16} className="text-red-500 mt-0.5 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
            Email address
          </label>
          <div className="relative">
            <Icon
              name="EnvelopeIcon"
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={role === 'shopadmin' ? 'lekki@shopinventory.io' : 'super@shopinventory.io'}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Enter a valid email address',
                },
              })}
              className={`
                w-full pl-10 pr-4 py-2.5 text-sm border rounded-xl bg-white text-slate-800
                placeholder-slate-300 focus:outline-none focus:ring-2 transition-all duration-150
                ${errors.email
                  ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400' :'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-400'
                }
              `}
            />
          </div>
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size={12} />
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <button
              type="button"
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Icon
              name="LockClosedIcon"
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
              })}
              className={`
                w-full pl-10 pr-10 py-2.5 text-sm border rounded-xl bg-white text-slate-800
                placeholder-slate-300 focus:outline-none focus:ring-2 transition-all duration-150
                ${errors.password
                  ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400' :'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-400'
                }
              `}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={16} />
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size={12} />
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember me */}
        <div className="flex items-center gap-2.5">
          <input
            id="remember"
            type="checkbox"
            {...register('rememberMe')}
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
          />
          <label htmlFor="remember" className="text-sm text-slate-600">
            Keep me signed in for 30 days
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="
            w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
            bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]
            text-white text-sm font-semibold
            transition-all duration-150 shadow-md shadow-indigo-600/20
            disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100
          "
          style={{ minHeight: '42px' }}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <Icon name="ArrowRightOnRectangleIcon" size={16} />
              <span>Sign in as {role === 'shopadmin' ? 'Shop Admin' : 'Superadmin'}</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
        <p className="text-xs font-semibold text-indigo-700 mb-2 flex items-center gap-1.5">
          <Icon name="InformationCircleIcon" size={14} className="text-indigo-500" />
          {role === 'shopadmin' ? 'Shop Admin' : 'Superadmin'} credentials
        </p>
        <div className="space-y-1">
          <p className="text-xs text-indigo-600 font-mono">
            Email: <span className="font-semibold">{role === 'shopadmin' ? 'lekki@shopinventory.io' : 'super@shopinventory.io'}</span>
          </p>
          <p className="text-xs text-indigo-600 font-mono">
            Password: <span className="font-semibold">{role === 'shopadmin' ? 'ShopAdmin2026!' : 'SuperAdmin2026!'}</span>
          </p>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        By signing in you agree to our{' '}
        <button className="text-indigo-600 hover:underline">Terms of Service</button>
        {' '}and{' '}
        <button className="text-indigo-600 hover:underline">Privacy Policy</button>
      </p>
    </div>
  );
}