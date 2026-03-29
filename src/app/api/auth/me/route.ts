import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies, setAuthCookies } from '@/lib/auth/cookies';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth/constants';
import { getUserFromAccessToken, rotateSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  const accessUser = await getUserFromAccessToken(accessToken);
  if (accessUser) {
    return NextResponse.json({ user: accessUser });
  }

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
