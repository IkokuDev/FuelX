import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { env } from '../../config/env';
import { AppError, forbidden, unauthorized } from '../../lib/errors';
import { randomToken, sha256 } from '../../lib/otp';
import { User, type UserDoc } from '../../models/user.model';
import { DriverProfile } from '../../models/driver-profile.model';
import { RefreshToken } from '../../models/refresh-token.model';
import type { LoginInput, RegisterInput } from './auth.schemas';
import type { UserRole, UserStatus } from '../../config/constants';

const BCRYPT_COST = 12;

export interface PublicUser {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  status: UserStatus;
  walletBalanceKobo: number;
  createdAt: Date;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

export function toPublicUser(user: UserDoc): PublicUser {
  return {
    id: user._id.toString(),
    role: user.role as UserRole,
    name: user.name,
    email: user.email,
    phone: user.phone,
    status: user.status as UserStatus,
    walletBalanceKobo: user.walletBalanceKobo,
    createdAt: user.createdAt,
  };
}

export function signAccessToken(user: Pick<UserDoc, '_id' | 'role'>): string {
  const payload: AccessTokenPayload = { sub: user._id.toString(), role: user.role as UserRole };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || !decoded.sub) throw new Error('bad payload');
    return { sub: String(decoded.sub), role: decoded.role as UserRole };
  } catch {
    throw unauthorized('Invalid or expired token');
  }
}

async function issueRefreshToken(
  userId: Types.ObjectId,
  family: string,
  userAgent?: string,
): Promise<string> {
  const raw = randomToken(32);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 3600 * 1000);
  await RefreshToken.create({
    userId,
    tokenHash: sha256(raw),
    family,
    expiresAt,
    userAgent,
  });
  return raw;
}

export async function issueTokenPair(
  user: UserDoc,
  opts: { family?: string; userAgent?: string } = {},
): Promise<TokenPair> {
  const family = opts.family ?? randomToken(16);
  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user._id, family, opts.userAgent);
  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput): Promise<PublicUser> {
  const existing = await User.findOne({
    $or: [{ email: input.email }, { phone: input.phone }],
  }).lean();
  if (existing) {
    throw new AppError('CONFLICT', 409, 'An account with that email or phone already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  const user = await User.create({
    role: input.role,
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash,
    status: 'active',
    walletBalanceKobo: 0,
  });

  if (input.role === 'driver') {
    await DriverProfile.create({ userId: user._id, approvalStatus: 'pending' });
  }

  return toPublicUser(user);
}

export async function login(
  input: LoginInput,
  userAgent?: string,
): Promise<{ user: PublicUser; tokens: TokenPair }> {
  const user = await User.findOne({ email: input.email });
  if (!user) {
    throw unauthorized('Invalid email or password');
  }
  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    throw unauthorized('Invalid email or password');
  }
  if (user.status === 'suspended') {
    throw new AppError('ACCOUNT_SUSPENDED', 403, 'This account is suspended');
  }

  const tokens = await issueTokenPair(user, { userAgent });
  return { user: toPublicUser(user), tokens };
}

export async function rotateRefreshToken(
  rawToken: string | undefined,
  userAgent?: string,
): Promise<{ user: PublicUser; tokens: TokenPair }> {
  if (!rawToken) throw unauthorized('Missing refresh token');

  const record = await RefreshToken.findOne({ tokenHash: sha256(rawToken) });
  if (!record) throw unauthorized('Invalid refresh token');

  if (record.revokedAt) {
    // Reuse of a revoked token: revoke the whole family.
    await RefreshToken.updateMany(
      { family: record.family, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
    throw unauthorized('Refresh token has been revoked');
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    throw unauthorized('Refresh token has expired');
  }

  const user = await User.findById(record.userId);
  if (!user) throw unauthorized('Account no longer exists');
  if (user.status === 'suspended') {
    throw new AppError('ACCOUNT_SUSPENDED', 403, 'This account is suspended');
  }

  record.revokedAt = new Date();
  await record.save();

  const tokens = await issueTokenPair(user, { family: record.family, userAgent });
  return { user: toPublicUser(user), tokens };
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await RefreshToken.updateOne(
    { tokenHash: sha256(rawToken), revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
}

export interface AuthContextUser {
  id: string;
  role: UserRole;
  status: UserStatus;
}

/** Used by requireAuth; keeps Mongo access inside services. */
export async function loadAuthUser(userId: string): Promise<AuthContextUser> {
  if (!Types.ObjectId.isValid(userId)) throw unauthorized('Invalid token subject');
  const user = await User.findById(userId).select('role status').lean();
  if (!user) throw unauthorized('Account no longer exists');
  if (user.status === 'suspended') {
    throw new AppError('ACCOUNT_SUSPENDED', 403, 'This account is suspended');
  }
  return { id: userId, role: user.role as UserRole, status: user.status as UserStatus };
}

export function assertRole(role: UserRole, allowed: UserRole[]): void {
  if (!allowed.includes(role)) throw forbidden('You do not have access to this resource');
}

export async function getMe(userId: string): Promise<{
  user: PublicUser;
  driverProfile?: Record<string, unknown>;
}> {
  const user = await User.findById(userId);
  if (!user) throw unauthorized('Account no longer exists');
  const result: { user: PublicUser; driverProfile?: Record<string, unknown> } = {
    user: toPublicUser(user),
  };
  if (user.role === 'driver') {
    const profile = await DriverProfile.findOne({ userId: user._id }).lean();
    if (profile) {
      result.driverProfile = {
        id: profile._id.toString(),
        approvalStatus: profile.approvalStatus,
        vehicle: profile.vehicle ?? null,
        isOnline: profile.isOnline,
        stats: profile.stats,
        earningsBalanceKobo: profile.earningsBalanceKobo,
        cashOwedKobo: profile.cashOwedKobo,
      };
    }
  }
  return result;
}

export const REFRESH_COOKIE = 'fx_rt';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';
export const BCRYPT_COST_FACTOR = BCRYPT_COST;
