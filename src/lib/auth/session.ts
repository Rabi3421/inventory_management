import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { SessionModel } from '@/lib/models/Session';
import { UserModel, type UserDocument } from '@/lib/models/User';
import { verifyPassword } from './password';
import { createAccessToken, createRefreshToken, getRefreshExpiryDate, toAuthUser, verifyAccessToken, verifyRefreshToken } from './tokens';
import { normalizeRole, type AppRole, type AuthUser } from './routes';

interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

function getRequestMetadata(request?: NextRequest): RequestMetadata {
  return {
    ipAddress: request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
    userAgent: request?.headers.get('user-agent') ?? undefined,
  };
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function toUserDto(user: Pick<UserDocument, '_id' | 'name' | 'email' | 'role' | 'shopId' | 'shopName'>): AuthUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: normalizeRole(user.role),
    shopId: user.shopId ?? undefined,
    shopName: user.shopName ?? undefined,
  };
}

async function issueTokens(user: AuthUser, sessionId: string, rememberMe: boolean): Promise<SessionTokens> {
  const identity = {
    ...user,
    sessionId,
  };
  const refreshExpiresAt = getRefreshExpiryDate(rememberMe);
  const [accessToken, refreshToken] = await Promise.all([
    createAccessToken(identity),
    createRefreshToken(identity, rememberMe),
  ]);

  return {
    accessToken,
    refreshToken,
    refreshExpiresAt,
  };
}

export async function authenticateUser(params: {
  email: string;
  password: string;
  role?: AppRole;
  rememberMe: boolean;
  request?: NextRequest;
}) {
  await connectToDatabase();

  const user = await UserModel.findOne({ email: params.email.toLowerCase() })
    .select('+passwordHash');

  if (!user || user.isActive === false) {
    return null;
  }
  const normalizedDbRole = normalizeRole(user.role);
  if (params.role && normalizedDbRole !== normalizeRole(params.role)) {
    return null;
  }

  if (!verifyPassword(params.password, user.passwordHash)) {
    return null;
  }

  const authUser = toUserDto(user);
  const metadata = getRequestMetadata(params.request);
  const session = new SessionModel({
    userId: user._id,
    refreshTokenHash: 'pending',
    expiresAt: getRefreshExpiryDate(params.rememberMe),
    userAgent: metadata.userAgent,
    ipAddress: metadata.ipAddress,
    lastUsedAt: new Date(),
  });
  await session.save();

  const tokens = await issueTokens(authUser, session._id.toString(), params.rememberMe);

  session.refreshTokenHash = hashToken(tokens.refreshToken);
  session.expiresAt = tokens.refreshExpiresAt;
  await session.save();

  await UserModel.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

  return {
    user: authUser,
    tokens,
  };
}

export async function getUserFromAccessToken(accessToken?: string | null) {
  if (!accessToken) {
    return null;
  }

  try {
    const payload = await verifyAccessToken(accessToken);
    return toAuthUser(payload);
  } catch {
    return null;
  }
}

export async function rotateSession(refreshToken: string, request?: NextRequest) {
  await connectToDatabase();

  const payload = await verifyRefreshToken(refreshToken);
  const session = await SessionModel.findById(payload.sessionId);

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  if (session.refreshTokenHash !== hashToken(refreshToken)) {
    return null;
  }

  const user = await UserModel.findOne({ _id: payload.id, isActive: true });

  if (!user || normalizeRole(user.role) !== normalizeRole(payload.role)) {
    session.revokedAt = new Date();
    await session.save();
    return null;
  }

  const metadata = getRequestMetadata(request);
  const authUser = toUserDto(user);
  const rememberMe = session.expiresAt.getTime() - Date.now() > 7 * 24 * 60 * 60 * 1000;
  const tokens = await issueTokens(authUser, session._id.toString(), rememberMe);

  session.refreshTokenHash = hashToken(tokens.refreshToken);
  session.expiresAt = tokens.refreshExpiresAt;
  session.lastUsedAt = new Date();
  session.userAgent = metadata.userAgent ?? session.userAgent;
  session.ipAddress = metadata.ipAddress ?? session.ipAddress;
  await session.save();

  return {
    user: authUser,
    tokens,
  };
}

export async function revokeSession(refreshToken?: string | null) {
  if (!refreshToken) {
    return;
  }

  try {
    const payload = await verifyRefreshToken(refreshToken);
    await connectToDatabase();
    await SessionModel.updateOne(
      {
        _id: payload.sessionId,
        refreshTokenHash: hashToken(refreshToken),
        revokedAt: null,
      },
      {
        revokedAt: new Date(),
      }
    );
  } catch {
    return;
  }
}
