import { describe, expect, it } from 'vitest';
import {
  haversineKm,
  haversineM,
  isWithinRadiusKm,
  isValidLatLng,
  toGeoPoint,
  fromGeoPoint,
  withinGeofenceM,
} from '../../src/lib/geo';
import { normalisePhone } from '../../src/lib/phone';
import { deriveOtp, generateOtpSalt, verifyOtp } from '../../src/lib/otp';
import { generateOrderCode, generateSealCode, normaliseSealCode } from '../../src/lib/codes';

const abujaCentre = { lat: 9.0579, lng: 7.4951 };

describe('geo', () => {
  it('computes haversine distance', () => {
    // Wuse II to the Abuja centre is a few kilometres.
    const d = haversineKm(abujaCentre, { lat: 9.0765, lng: 7.4698 });
    expect(d).toBeGreaterThan(2);
    expect(d).toBeLessThan(5);
    expect(haversineM(abujaCentre, abujaCentre)).toBe(0);
  });

  it('converts to and from GeoJSON', () => {
    const point = { lat: 9.0765, lng: 7.4698 };
    const geo = toGeoPoint(point);
    expect(geo).toEqual({ type: 'Point', coordinates: [7.4698, 9.0765] });
    expect(fromGeoPoint(geo)).toEqual(point);
  });

  it('validates coordinates and service area containment', () => {
    expect(isValidLatLng(abujaCentre)).toBe(true);
    expect(isValidLatLng({ lat: 91, lng: 0 })).toBe(false);
    expect(isWithinRadiusKm({ lat: 9.0765, lng: 7.4698 }, abujaCentre, 35)).toBe(true);
    expect(isWithinRadiusKm({ lat: 9.5, lng: 8.0 }, abujaCentre, 35)).toBe(false);
  });

  it('checks geofences in metres', () => {
    expect(withinGeofenceM(abujaCentre, { lat: 9.0580, lng: 7.4951 }, 150)).toBe(true);
    expect(withinGeofenceM(abujaCentre, { lat: 9.07, lng: 7.4951 }, 150)).toBe(false);
  });
});

describe('phone normalisation', () => {
  it('normalises Nigerian numbers', () => {
    expect(normalisePhone('08012345678')).toBe('+2348012345678');
    expect(normalisePhone('+2348012345678')).toBe('+2348012345678');
    expect(normalisePhone('234 801 234 5678')).toBe('+2348012345678');
  });

  it('rejects anything else', () => {
    expect(() => normalisePhone('12345')).toThrow();
    expect(() => normalisePhone('080123456789')).toThrow();
  });
});

describe('otp', () => {
  it('derives a deterministic six-digit code', () => {
    const salt = generateOtpSalt();
    const otp = deriveOtp('order-1', salt);
    expect(otp).toMatch(/^\d{6}$/);
    expect(deriveOtp('order-1', salt)).toBe(otp);
    expect(deriveOtp('order-2', salt)).not.toBe(otp);
  });

  it('verifies only the derived code', () => {
    const salt = generateOtpSalt();
    const otp = deriveOtp('order-1', salt);
    expect(verifyOtp('order-1', salt, otp)).toBe(true);
    expect(verifyOtp('order-1', salt, '000000')).toBe(otp === '000000');
    expect(verifyOtp('order-1', salt, 'abc')).toBe(false);
  });
});

describe('codes', () => {
  it('generates well-formed order and seal codes', () => {
    expect(generateOrderCode()).toMatch(/^FX-[A-Z2-9]{6}$/);
    expect(generateSealCode()).toMatch(/^FX-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it('never contains ambiguous characters', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateSealCode()).not.toMatch(/[0O1I]/);
    }
  });

  it('normalises seal codes for lookup', () => {
    expect(normaliseSealCode(' fx-7k2m-9qpa ')).toBe('FX7K2M9QPA');
  });
});
