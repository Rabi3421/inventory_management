import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from './src/lib/auth/constants';
import { getDefaultRouteForRole, isProtectedPath, isRoleAllowedForPath, normalizeRedirectPath } from './src/lib/auth/routes';
import { verifyAccessToken } from './src/lib/auth/tokens';

function isPublicPath(pathname: string) {
  return pathname === '/login' || pathname.startsWith('/api/auth/') || pathname === '/not-found';
}

function redirectToRefresh(request: NextRequest, pathname: string) {
  const refreshUrl = new URL('/api/auth/refresh', request.url);
  refreshUrl.searchParams.set('redirectTo', pathname + request.nextUrl.search);
  return NextResponse.redirect(refreshUrl);
}

function redirectToLogin(request: NextRequest, pathname: string) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const fullPath = `${pathname}${search}`;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname === '/favicon.ico' ||
    /\.[^/]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (pathname === '/login') {
    if (accessToken) {
      try {
        const payload = await verifyAccessToken(accessToken);
        return NextResponse.redirect(new URL(getDefaultRouteForRole(payload.role), request.url));
      } catch {
        if (refreshToken) {
          const nextPath = normalizeRedirectPath(request.nextUrl.searchParams.get('next')) ?? '/';
          return redirectToRefresh(request, nextPath);
        }
      }
    } else if (refreshToken) {
      const nextPath = normalizeRedirectPath(request.nextUrl.searchParams.get('next')) ?? '/';
      return redirectToRefresh(request, nextPath);
    }

    return NextResponse.next();
  }

  if (!isProtectedPath(pathname) || isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (accessToken) {
    try {
      const payload = await verifyAccessToken(accessToken);
      if (!isRoleAllowedForPath(payload.role, pathname)) {
        return NextResponse.redirect(new URL(getDefaultRouteForRole(payload.role), request.url));
      }
      return NextResponse.next();
    } catch {
      if (refreshToken) {
        return redirectToRefresh(request, fullPath);
      }
    }
  }

  if (refreshToken) {
    return redirectToRefresh(request, fullPath);
  }

  return redirectToLogin(request, fullPath);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
