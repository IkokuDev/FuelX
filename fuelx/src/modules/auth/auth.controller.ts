import type { CookieOptions, Request, Response } from 'express';
import { env } from '../../config/env';
import { asyncHandler } from '../../lib/async-handler';
import { sendOk } from '../../lib/response';
import {
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
  login,
  logout,
  register,
  rotateRefreshToken,
  getMe,
} from './auth.service';

function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    path: REFRESH_COOKIE_PATH,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 3600 * 1000,
  };
}

export const registerHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await register(req.body);
  sendOk(res, { user }, 201);
});

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await login(req.body, req.header('user-agent'));
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions());
  sendOk(res, { accessToken: tokens.accessToken, user });
});

export const refreshHandler = asyncHandler(async (req: Request, res: Response) => {
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  const { user, tokens } = await rotateRefreshToken(raw, req.header('user-agent'));
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions());
  sendOk(res, { accessToken: tokens.accessToken, user });
});

export const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  await logout(raw);
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  sendOk(res, {});
});

export const meHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await getMe(req.user!.id);
  sendOk(res, data);
});
