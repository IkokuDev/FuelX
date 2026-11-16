import { env } from '../../config/env';
import { noopPushProvider } from './noop';
import { createWebPushProvider } from './webpush';
import type { PushProvider } from './types';

export type { PushPayload, PushProvider, PushSubscriptionKeys } from './types';

let cached: PushProvider | null = null;

export function getPushProvider(): PushProvider {
  if (cached) return cached;
  cached =
    env.PUSH_DRIVER === 'webpush' && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY
      ? createWebPushProvider({
          publicKey: env.VAPID_PUBLIC_KEY,
          privateKey: env.VAPID_PRIVATE_KEY,
          subject: env.VAPID_SUBJECT,
        })
      : noopPushProvider;
  return cached;
}
