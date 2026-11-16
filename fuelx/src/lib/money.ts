/**
 * All money in FuelX is an integer number of kobo (₦1 = 100 kobo).
 * Formatting happens only at the UI edge.
 */

export function roundTo(value: number, step: number): number {
  if (step <= 0) return Math.round(value);
  return Math.round(value / step) * step;
}

export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

/** Format kobo as a Nigerian Naira string, e.g. 2381000 -> "₦23,810.00". */
export function formatKobo(kobo: number, opts: { decimals?: boolean } = {}): string {
  const decimals = opts.decimals ?? true;
  const negative = kobo < 0;
  const abs = Math.abs(Math.round(kobo));
  const naira = Math.floor(abs / 100);
  const koboPart = abs % 100;
  const grouped = naira.toLocaleString('en-NG');
  const base = decimals
    ? `${grouped}.${koboPart.toString().padStart(2, '0')}`
    : grouped;
  return `${negative ? '-' : ''}₦${base}`;
}

/** Human friendly, no kobo when it is a whole naira amount. */
export function formatKoboShort(kobo: number): string {
  return kobo % 100 === 0 ? formatKobo(kobo, { decimals: false }) : formatKobo(kobo);
}

export function assertIntegerKobo(value: number, field = 'amount'): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${field} must be an integer number of kobo`);
  }
}
