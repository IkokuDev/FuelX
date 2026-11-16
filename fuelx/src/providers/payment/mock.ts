import { env } from '../../config/env';
import type { InitializeInput, InitializeResult, PaymentProvider, VerifyResult } from './types';

interface MockPaymentState {
  status: 'success' | 'failed' | 'abandoned';
  amountKobo: number;
  paidAt?: Date;
}

const mockState = new Map<string, MockPaymentState>();

/** Called by the mock "Pay (test)" endpoint with the amount the user paid. */
export function markMockPaymentPaid(reference: string, amountKobo: number): void {
  mockState.set(reference, { status: 'success', amountKobo, paidAt: new Date() });
}

export function markMockPaymentFailed(reference: string): void {
  mockState.set(reference, { status: 'failed', amountKobo: 0 });
}

export function resetMockPayments(): void {
  mockState.clear();
}

/**
 * Zero-key payment driver: sends the browser to a static page with a single
 * "Pay (test)" button that calls back into the API.
 */
export const mockPaymentProvider: PaymentProvider = {
  name: 'mock',
  async initialize(input: InitializeInput): Promise<InitializeResult> {
    // Record intent so verify() can report "abandoned" until the button is pressed.
    if (!mockState.has(input.reference)) {
      mockState.set(input.reference, { status: 'abandoned', amountKobo: input.amountKobo });
    }
    return {
      authorizationUrl: `${env.PUBLIC_URL}/mock-pay.html?ref=${encodeURIComponent(input.reference)}`,
      reference: input.reference,
    };
  },
  async verify(reference: string): Promise<VerifyResult> {
    const state = mockState.get(reference);
    if (!state) return { status: 'abandoned', amountKobo: 0 };
    return { status: state.status, amountKobo: state.amountKobo, paidAt: state.paidAt };
  },
  verifyWebhook(): boolean {
    // The mock driver has no webhooks.
    return false;
  },
};
