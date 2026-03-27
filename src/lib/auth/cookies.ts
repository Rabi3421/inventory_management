import type { NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from './constants';
import { getAccessExpiryDate } from './tokens';

function baseCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  };
}

export function setAuthCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string; refreshExpiresAt: Date }
) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, baseCookieOptions(getAccessExpiryDate()));
  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, baseCookieOptions(tokens.refreshExpiresAt));
}

export function clearAuthCookies(response: NextResponse) {
  const expires = new Date(0);
  response.cookies.set(ACCESS_TOKEN_COOKIE, '', baseCookieOptions(expires));
  response.cookies.set(REFRESH_TOKEN_COOKIE, '', baseCookieOptions(expires));
}
