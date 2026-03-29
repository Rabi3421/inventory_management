import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies, setAuthCookies } from '@/lib/auth/cookies';
import { REFRESH_TOKEN_COOKIE } from '@/lib/auth/constants';
import { getDefaultRouteForRole, isRoleAllowedForPath, normalizeRedirectPath } from '@/lib/auth/routes';
import { rotateSession } from '@/lib/auth/session';

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  const redirectTo = normalizeRedirectPath(request.nextUrl.searchParams.get('redirectTo'));
  if (redirectTo) {
    loginUrl.searchParams.set('next', redirectTo);
  }

  const response = NextResponse.redirect(loginUrl);
  clearAuthCookies(response);
  return response;
}

export async function GET(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    return redirectToLogin(request);
  }

  try {
    const session = await rotateSession(refreshToken, request);
    if (!session) {
      return redirectToLogin(request);
    }

    const requestedPath = normalizeRedirectPath(request.nextUrl.searchParams.get('redirectTo'));
    const redirectPath = requestedPath && isRoleAllowedForPath(session.user.role, requestedPath)
      ? requestedPath
      : getDefaultRouteForRole(session.user.role);

    const response = NextResponse.redirect(new URL(redirectPath, request.url));
    setAuthCookies(response, session.tokens);
    return response;
  } catch {
    return redirectToLogin(request);
  }
}

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    const response = NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }

  try {
    const session = await rotateSession(refreshToken, request);
    if (!session) {
      const response = NextResponse.json({ error: 'Session expired.' }, { status: 401 });
      clearAuthCookies(response);
      return response;
    }

    const response = NextResponse.json({ user: session.user });
    setAuthCookies(response, session.tokens);
    return response;
  } catch {
    const response = NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }
}
