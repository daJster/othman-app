import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Password hashing for the mock backend.
 *
 * `scryptSync` is deliberately used instead of a bare hash: the mock server
 * stores real-looking credentials and is reachable from the LAN during device
 * testing, so a plaintext or SHA-256 column would be a bad example. The cost
 * parameters are Node's defaults (N=16384), which are fast enough that a demo
 * login is instant and slow enough that the shape is honest.
 *
 * Format: `<salt hex>:<derived key hex>`. One column, no side table.
 */

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEY_LENGTH);

  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');

  if (!saltHex || !hashHex) return false;

  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = scryptSync(password, salt, expected.length);

    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}

export function createToken(): string {
  return randomBytes(32).toString('hex');
}
