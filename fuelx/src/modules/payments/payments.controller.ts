import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { sendOk, sendError } from '../../lib/response';
import { notFound } from '../../lib/errors';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { Payment } from '../../models/payment.model';
import { getPaymentProvider, markMockPaymentPaid } from '../../providers/payment';
import { confirmPayment, verifyPaymentForUser } from './payments.service';
import type { MockCompleteInput } from './payments.schemas';

/**
 * Paystack webhook. Mounted with express.raw before the JSON parser so the
 * HMAC-SHA512 signature is computed over the exact body. We answer 200 at once
 * and process afterwards so Paystack does not retry a slow but valid call.
 */
export const paystackWebhookHandler = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.header('x-paystack-signature') ?? '';
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));

  if (!getPaymentProvider().verifyWebhook(raw, signature)) {
    sendError(res, 401, 'UNAUTHENTICATED', 'Invalid webhook signature');
    return;
  }

  let reference: string | undefined;
  try {
    const parsed = JSON.parse(raw.toString('utf8')) as { data?: { reference?: string } };
    reference = parsed.data?.reference;
  } catch {
    reference = undefined;
  }

  sendOk(res, { received: true });
  if (reference) {
    void confirmPayment(reference).catch((err: unknown) => {
      logger.error({ err, reference }, 'payment.webhook_failed');
    });
  }
});

/** Mock driver only, and never in production. */
export const mockCompleteHandler = asyncHandler(async (req: Request, res: Response) => {
  if (env.isProduction || env.PAYMENT_DRIVER !== 'mock') {
    throw notFound('Not found');
  }
  const { reference } = req.params;
  const body = req.body as MockCompleteInput;

  const payment = await Payment.findOne({ reference });
  if (!payment) throw notFound('Unknown payment reference');

  markMockPaymentPaid(reference, body.amountKobo ?? payment.amountKobo);
  const result = await confirmPayment(reference);
  sendOk(res, { reference, status: result.status, orderId: result.orderId });
});

export const verifyHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await verifyPaymentForUser(req.user!.id, req.params.reference);
  sendOk(res, result);
});
