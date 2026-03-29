export type AppRole = 'superadmin' | 'shopadmin' | 'shop_admin';

/** Treat legacy 'shop_admin' the same as 'shopadmin' everywhere in the app */
export function normalizeRole(role: string): AppRole {
  if (role === 'shop_admin') return 'shopadmin';
  return role as AppRole;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  shopId?: string;
  shopName?: string;
}

const SUPERADMIN_PATHS = ['/dashboard', '/shops', '/users', '/reports', '/settings'];
const SHOP_ADMIN_PATHS = ['/shop-admin'];

export function getDefaultRouteForRole(role: AppRole): string {
  return role === 'superadmin' ? '/dashboard' : '/shop-admin/dashboard';
}

export function isSuperadminRole(role: AppRole): boolean {
  return role === 'superadmin';
}

export function isSuperadminPath(pathname: string): boolean {
  return SUPERADMIN_PATHS.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isShopAdminPath(pathname: string): boolean {
  return SHOP_ADMIN_PATHS.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isProtectedPath(pathname: string): boolean {
  return isSuperadminPath(pathname) || isShopAdminPath(pathname);
}

export function isRoleAllowedForPath(role: AppRole, pathname: string): boolean {
  if (role === 'superadmin') {
    return isSuperadminPath(pathname);
  }
  // treat both 'shopadmin' and legacy 'shop_admin'
  return isShopAdminPath(pathname);
}

export function isShopAdminRole(role: AppRole): boolean {
  return role === 'shopadmin' || role === 'shop_admin';
}

export function normalizeRedirectPath(pathname?: string | null): string | null {
  if (!pathname || !pathname.startsWith('/') || pathname.startsWith('//')) {
    return null;
  }

  return pathname;
}
