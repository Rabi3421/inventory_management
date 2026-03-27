import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookies } from '@/lib/auth/cookies';
import { getDefaultRouteForRole, normalizeRedirectPath, type AppRole } from '@/lib/auth/routes';
import { authenticateUser } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const role = body.role as AppRole;
    const rememberMe = Boolean(body.rememberMe);
    const redirectTo = normalizeRedirectPath(body.redirectTo);

    if (!email || !password || !['superadmin', 'shopadmin', 'shop_admin'].includes(role)) {
      return NextResponse.json({ error: 'Please enter valid credentials.' }, { status: 400 });
    }

    let session;
    try {
      session = await authenticateUser({ email, password, role, rememberMe, request });
    } catch (dbErr) {
      const msg = dbErr instanceof Error ? dbErr.message : '';
      const isNetworkError = msg.includes('ECONNREFUSED') || msg.includes('ServerSelection') || msg.includes('connect');
      return NextResponse.json(
        { error: isNetworkError ? 'Database is unreachable. Please try again shortly.' : 'Unable to sign in right now.' },
        { status: 503 }
      );
    }

    if (!session) {
      return NextResponse.json({ error: 'Invalid email, password, or role.' }, { status: 401 });
    }

    const response = NextResponse.json({
      user: session.user,
      redirectTo: redirectTo && redirectTo !== '/login' ? redirectTo : getDefaultRouteForRole(session.user.role),
    });

    setAuthCookies(response, session.tokens);
    return response;
  } catch {
    return NextResponse.json({ error: 'Unable to sign in right now.' }, { status: 500 });
  }
}
