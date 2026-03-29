import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';

const KEY_LENGTH = 64;
const BCRYPT_ROUNDS = 12;

/** Hash a new password using scrypt (used for any newly created users) */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${derivedKey}`;
}

/** Hash a new password using bcrypt (used when re-seeding or creating users that
 *  need to be compatible with the legacy format already in the database) */
export function hashPasswordBcrypt(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a stored hash.
 * Auto-detects format:
 *   - bcrypt  → starts with $2a$ / $2b$ / $2y$
 *   - scrypt  → "hexsalt:hexhash" (our new format)
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;

  // bcrypt format
  if (storedHash.startsWith('$2')) {
    return bcrypt.compareSync(password, storedHash);
  }

  // scrypt format: salt:hash
  const colonIdx = storedHash.indexOf(':');
  if (colonIdx === -1) return false;

  const salt = storedHash.slice(0, colonIdx);
  const hash = storedHash.slice(colonIdx + 1);

  if (!salt || !hash) return false;

  const derivedKey = scryptSync(password, salt, KEY_LENGTH);
  const storedKey = Buffer.from(hash, 'hex');

  if (derivedKey.length !== storedKey.length) return false;

  return timingSafeEqual(derivedKey, storedKey);
}
