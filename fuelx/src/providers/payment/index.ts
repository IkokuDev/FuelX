import { env } from '../../config/env';
import { mockPaymentProvider } from './mock';
import { createPaystackPaymentProvider } from './paystack';
import type { PaymentProvider } from './types';

export type {
  InitializeInput,
  InitializeResult,
  PaymentProvider,
  VerifyResult,
} from './types';
export { markMockPaymentPaid, markMockPaymentFailed, resetMockPayments } from './mock';

let cached: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;
  cached =
    env.PAYMENT_DRIVER === 'paystack' && env.PAYSTACK_SECRET_KEY
      ? createPaystackPaymentProvider(env.PAYSTACK_SECRET_KEY)
      : mockPaymentProvider;
  return cached;
}
