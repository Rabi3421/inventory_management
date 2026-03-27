import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth/cookies';
import { REFRESH_TOKEN_COOKIE } from '@/lib/auth/constants';
import { revokeSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  await revokeSession(refreshToken);

  const response = NextResponse.json({ success: true });
  clearAuthCookies(response);
  return response;
}
