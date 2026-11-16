import { expect, it, describe } from 'vitest';
import { formatKobo, formatKoboShort, roundTo, nairaToKobo, koboToNaira } from '../../src/lib/money';

describe('money', () => {
  it('rounds to the nearest step', () => {
    expect(roundTo(3450, 1000)).toBe(3000);
    expect(roundTo(3500, 1000)).toBe(4000);
    expect(roundTo(2381000, 1000)).toBe(2381000);
  });

  it('converts between naira and kobo', () => {
    expect(nairaToKobo(650)).toBe(65000);
    expect(koboToNaira(65000)).toBe(650);
  });

  it('formats kobo as naira', () => {
    expect(formatKobo(2381000)).toBe('₦23,810.00');
    expect(formatKoboShort(1950000)).toBe('₦19,500');
    expect(formatKobo(-50000)).toBe('-₦500.00');
  });

  it('covers the pricing invariant: every result is an integer', () => {
    const value = roundTo(0.175 * 1950000, 1000);
    expect(Number.isInteger(value)).toBe(true);
  });
});
