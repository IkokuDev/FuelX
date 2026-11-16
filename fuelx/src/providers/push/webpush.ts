import webpush from 'web-push';
import { logger } from '../../lib/logger';
import type { PushPayload, PushProvider, PushSubscriptionKeys } from './types';

export function createWebPushProvider(input: {
  publicKey: string;
  privateKey: string;
  subject: string;
}): PushProvider {
  webpush.setVapidDetails(input.subject, input.publicKey, input.privateKey);
  return {
    name: 'webpush',
    async send(subscription: PushSubscriptionKeys, payload: PushPayload): Promise<void> {
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
      } catch (err) {
        logger.warn({ err }, 'Web Push delivery failed');
      }
    },
  };
}
