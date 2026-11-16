import type { PushProvider } from './types';

/** Default push driver: does nothing. In-app Socket.IO notifications still work. */
export const noopPushProvider: PushProvider = {
  name: 'noop',
  async send() {
    return undefined;
  },
};
