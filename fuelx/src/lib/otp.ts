import crypto from 'node:crypto';
import { env } from '../config/env';

/** Generate a random salt for an order's delivery OTP. */
export function generateOtpSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Derive the 6-digit delivery OTP. It is never stored: anyone who knows the
 * order id and its salt can recompute it, which is what lets the customer
 * reopen the app and see the same code again.
 */
export function deriveOtp(orderId: string, otpSalt: string): string {
  const hmac = crypto
    .createHmac('sha256', env.OTP_HMAC_SECRET)
    .update(`${orderId}:${otpSalt}`)
    .digest();
  const num = hmac.readUInt32BE(0) % 1_000_000;
  return num.toString().padStart(6, '0');
}

/** Constant-time comparison of a submitted OTP against the derived value. */
export function verifyOtp(orderId: string, otpSalt: string, submitted: string): boolean {
  if (!/^\d{6}$/.test(submitted)) return false;
  const expected = deriveOtp(orderId, otpSalt);
  const a = Buffer.from(expected);
  const b = Buffer.from(submitted);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** SHA-256 hex digest, used for refresh-token storage. */
export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
