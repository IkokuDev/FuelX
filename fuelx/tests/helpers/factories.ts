import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Express } from 'express';
import { User, type UserDoc } from '../../src/models/user.model';
import { DriverProfile } from '../../src/models/driver-profile.model';
import { Station } from '../../src/models/station.model';
import { PricingConfig } from '../../src/models/pricing-config.model';
import type { UserRole } from '../../src/config/constants';
import { toGeoPoint } from '../../src/lib/geo';
import { ensureDefaultConfig } from '../../src/modules/pricing/pricing.service';

export const TEST_PASSWORD = 'Passw0rd!';

export interface AuthedUser {
  id: string;
  email: string;
  token: string;
  user: UserDoc;
}

export async function makeUser(
  role: UserRole,
  overrides: Partial<{ email: string; phone: string; name: string; walletBalanceKobo: number }> = {},
): Promise<UserDoc> {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 4);
  const suffix = Math.random().toString(36).slice(2, 8);
  const user = await User.create({
    role,
    name: overrides.name ?? `Test ${role} ${suffix}`,
    email: overrides.email ?? `${role}-${suffix}@fuelx.test`,
    phone: overrides.phone ?? `+23480${Math.floor(10000000 + Math.random() * 89999999)}`,
    passwordHash,
    status: 'active',
    walletBalanceKobo: overrides.walletBalanceKobo ?? 0,
  });
  if (role === 'driver') {
    await DriverProfile.create({
      userId: user._id,
      approvalStatus: 'pending',
      vehicle: { type: 'motorcycle', plate: 'ABC-123', model: 'Bajaj', color: 'Red', maxLitres: 50 },
    });
  }
  return user;
}

export async function loginAs(app: Express, email: string): Promise<AuthedUser> {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: TEST_PASSWORD });
  if (res.status !== 200) throw new Error(`login failed: ${JSON.stringify(res.body)}`);
  return {
    id: res.body.data.user.id,
    email,
    token: res.body.data.accessToken,
    user: (await User.findById(res.body.data.user.id)) as UserDoc,
  };
}

export async function makeAuthedUser(
  app: Express,
  role: UserRole,
  overrides: Parameters<typeof makeUser>[1] = {},
): Promise<AuthedUser> {
  const user = await makeUser(role, overrides);
  return loginAs(app, user.email);
}

export async function makeStation(overrides: Partial<{ name: string; lat: number; lng: number }> = {}) {
  return Station.create({
    name: overrides.name ?? 'Test Station',
    address: 'Abuja',
    location: toGeoPoint({ lat: overrides.lat ?? 9.0579, lng: overrides.lng ?? 7.4951 }),
    isOpen: true,
    fuelTypes: ['PETROL', 'DIESEL'],
  });
}

export async function makeApprovedDriver(
  app: Express,
  overrides: { lat: number; lng: number; maxLitres?: number } = { lat: 9.0579, lng: 7.4951 },
): Promise<AuthedUser> {
  const auth = await makeAuthedUser(app, 'driver');
  await DriverProfile.updateOne(
    { userId: auth.user._id },
    {
      $set: {
        approvalStatus: 'approved',
        isOnline: true,
        location: toGeoPoint({ lat: overrides.lat, lng: overrides.lng }),
        locationAt: new Date(),
        'vehicle.maxLitres': overrides.maxLitres ?? 50,
      },
    },
  );
  return auth;
}

export async function ensureConfig(): Promise<void> {
  await ensureDefaultConfig();
  await PricingConfig.updateOne({ key: 'default' }, { $set: {} });
}
