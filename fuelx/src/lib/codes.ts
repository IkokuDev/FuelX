import crypto from 'node:crypto';
import {
  ORDER_CODE_PREFIX,
  ORDER_CODE_LENGTH,
  SEAL_ALPHABET,
} from '../config/constants';

function randomFromAlphabet(length: number, alphabet: string): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return out;
}

/** Order code, e.g. "FX-7K2M9Q". */
export function generateOrderCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return ORDER_CODE_PREFIX + randomFromAlphabet(ORDER_CODE_LENGTH, alphabet);
}

/** Seal code, e.g. "FX-7K2M-9QPA". */
export function generateSealCode(): string {
  const first = randomFromAlphabet(4, SEAL_ALPHABET);
  const second = randomFromAlphabet(4, SEAL_ALPHABET);
  return `FX-${first}-${second}`;
}

/** Normalise a seal code typed by a human: uppercase, strip spaces and dashes. */
export function normaliseSealCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '');
}

/** Compare two seal codes regardless of spacing/case. */
export function sealCodesMatch(a: string, b: string): boolean {
  return normaliseSealCode(a) === normaliseSealCode(b);
}

/**
 * Canonical seal code for lookups: "fx7k2m9qpa" -> "FX-7K2M-9QPA".
 * Returns the raw normalised string when it does not look like a seal code.
 */
export function canonicalSealCode(input: string): string {
  const normalised = normaliseSealCode(input);
  if (normalised.length === 10 && normalised.startsWith('FX')) {
    return `FX-${normalised.slice(2, 6)}-${normalised.slice(6, 10)}`;
  }
  return normalised;
}

/** Random payment reference, e.g. "FX-FX-7K2M9Q-A1B2C3". */
export function generatePaymentReference(orderCode: string): string {
  return `${ORDER_CODE_PREFIX}${orderCode.replace(ORDER_CODE_PREFIX, '')}-${randomFromAlphabet(6, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789')}`;
}

export function generateWalletReference(): string {
  return `FX-WAL-${randomFromAlphabet(10, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789')}`;
}
