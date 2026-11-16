/**
 * Normalise Nigerian phone numbers to the E.164 form +234XXXXXXXXXX.
 * Anything else is rejected.
 */
export function normalisePhone(input: string): string {
  const cleaned = input.replace(/[\s()\-.]/g, '');

  if (/^\+234\d{10}$/.test(cleaned)) return cleaned;
  if (/^234\d{10}$/.test(cleaned)) return `+${cleaned}`;
  if (/^0\d{10}$/.test(cleaned)) return `+234${cleaned.slice(1)}`;

  throw new Error('Phone must be a Nigerian number like 08012345678 or +2348012345678');
}

export function isNormalisedPhone(input: string): boolean {
  return /^\+234\d{10}$/.test(input);
}
