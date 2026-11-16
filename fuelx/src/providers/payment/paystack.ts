import crypto from 'node:crypto';
import { env } from '../../config/env';
import type { InitializeInput, InitializeResult, PaymentProvider, VerifyResult } from './types';

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data?: T;
}

export function createPaystackPaymentProvider(secretKey: string): PaymentProvider {
  const base = 'https://api.paystack.co';

  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    const body = (await res.json()) as PaystackResponse<T>;
    if (!res.ok || !body.status || !body.data) {
      throw new Error(`Paystack error: ${body.message || res.status}`);
    }
    return body.data;
  }

  return {
    name: 'paystack',
    async initialize(input: InitializeInput & { callbackUrl?: string }): Promise<InitializeResult> {
      const data = await call<{ authorization_url: string; reference: string }>(
        '/transaction/initialize',
        {
          method: 'POST',
          body: JSON.stringify({
            email: input.email,
            amount: input.amountKobo,
            reference: input.reference,
            metadata: input.metadata,
            callback_url: env.PUBLIC_URL + '/track.html',
          }),
        },
      );
      return { authorizationUrl: data.authorization_url, reference: data.reference };
    },
    async verify(reference: string): Promise<VerifyResult> {
      const data = await call<{
        status: string;
        amount: number;
        paid_at?: string;
      }>(`/transaction/verify/${encodeURIComponent(reference)}`);
      const status =
        data.status === 'success' ? 'success' : data.status === 'abandoned' ? 'abandoned' : 'failed';
      return {
        status,
        amountKobo: data.amount,
        paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
      };
    },
    verifyWebhook(rawBody: Buffer, signature: string): boolean {
      const expected = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
      const a = Buffer.from(expected);
      const b = Buffer.from(signature);
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    },
  };
}
