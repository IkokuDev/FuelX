import { env } from '../../config/env';
import { consoleMailProvider } from './console';
import { createSmtpMailProvider } from './smtp';
import type { MailProvider } from './types';

export type { MailMessage, MailProvider } from './types';

let cached: MailProvider | null = null;

export function getMailProvider(): MailProvider {
  if (cached) return cached;
  cached =
    env.MAIL_DRIVER === 'smtp' && env.SMTP_URL
      ? createSmtpMailProvider(env.SMTP_URL, env.MAIL_FROM)
      : consoleMailProvider;
  return cached;
}
