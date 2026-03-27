import type { JWTPayload } from 'jose';
import { jwtVerify, SignJWT } from 'jose';
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_DAYS, REMEMBER_ME_REFRESH_TOKEN_TTL_DAYS } from './constants';
import type { AppRole, AuthUser } from './routes';

interface TokenIdentity extends AuthUser, JWTPayload {
  sessionId: string;
}

export interface AccessTokenPayload extends TokenIdentity {
  type: 'access';
}

export interface RefreshTokenPayload extends TokenIdentity {
  type: 'refresh';
}

function getJwtSecret() {
  const secret = process.env.AUTH_JWT_SECRET ?? (process.env.NODE_ENV !== 'production' ? 'inventory-dev-secret-change-me' : undefined);

  if (!secret) {
    throw new Error('Missing AUTH_JWT_SECRET. Set it before running in production.');
  }

  return new TextEncoder().encode(secret);
}

async function signToken<T extends AccessTokenPayload | RefreshTokenPayload>(payload: T, expiresIn: string) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.id)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecret());
}

export async function createAccessToken(identity: TokenIdentity) {
  return signToken(
    {
      ...identity,
      type: 'access',
    },
    `${ACCESS_TOKEN_TTL_SECONDS}s`
  );
}

export async function createRefreshToken(identity: TokenIdentity, rememberMe: boolean) {
  const days = rememberMe ? REMEMBER_ME_REFRESH_TOKEN_TTL_DAYS : REFRESH_TOKEN_TTL_DAYS;

  return signToken(
    {
      ...identity,
      type: 'refresh',
    },
    `${days}d`
  );
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret());

  if (payload.type !== 'access') {
    throw new Error('Invalid access token.');
  }

  return payload as unknown as AccessTokenPayload;
}

export async function verifyRefreshToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret());

  if (payload.type !== 'refresh') {
    throw new Error('Invalid refresh token.');
  }

  return payload as unknown as RefreshTokenPayload;
}

export function getRefreshExpiryDate(rememberMe: boolean) {
  const days = rememberMe ? REMEMBER_ME_REFRESH_TOKEN_TTL_DAYS : REFRESH_TOKEN_TTL_DAYS;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function getAccessExpiryDate() {
  return new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000);
}

export function toAuthUser(payload: AccessTokenPayload | RefreshTokenPayload): AuthUser {
  return {
    id: payload.id,
    name: payload.name,
    email: payload.email,
    role: payload.role as AppRole,
    shopId: payload.shopId,
    shopName: payload.shopName,
  };
}
