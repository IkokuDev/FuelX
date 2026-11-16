import { Payment, type PaymentDoc } from '../../models/payment.model';
import { Order } from '../../models/order.model';
import { User } from '../../models/user.model';
import { AppError, notFound } from '../../lib/errors';
import { generateWalletReference } from '../../lib/codes';
import { getPaymentProvider } from '../../providers/payment';
import { writeLedgerEntry } from '../wallet/ledger.service';
import { creditWallet } from '../wallet/wallet.service';
import { transitionOrder } from '../orders/orders.service';
import { publish } from '../../realtime/publisher';
import { logger } from '../../lib/logger';
import type { ProviderPaymentStatus } from '../../config/constants';

export interface ConfirmResult {
  status: ProviderPaymentStatus;
  orderId?: string;
  credited?: boolean;
}

export interface TopupResult {
  reference: string;
  authorizationUrl: string;
  amountKobo: number;
}

/**
 * Confirm a payment from the Paystack webhook or GET /payments/verify.
 * Idempotent: a payment that is already SUCCESS returns immediately, and the
 * SUCCESS transition is claimed with one conditional update so concurrent
 * callers write the ledger only once.
 */
export async function confirmPayment(reference: string): Promise<ConfirmResult> {
  const payment = await Payment.findOne({ reference });
  if (!payment) throw notFound('Unknown payment reference');
  if (payment.status === 'SUCCESS') {
    return { status: 'SUCCESS', orderId: payment.orderId?.toString() };
  }

  const verified = await getPaymentProvider().verify(reference);
  if (verified.status === 'abandoned') return { status: 'INITIATED' };
  if (verified.status === 'failed') {
    await Payment.updateOne({ _id: payment._id, status: { $ne: 'SUCCESS' } }, { $set: { status: 'FAILED' } });
    return { status: 'FAILED', orderId: payment.orderId?.toString() };
  }

  if (payment.purpose === 'WALLET_TOPUP') {
    return settleTopup(payment, verified.amountKobo, verified.paidAt);
  }
  return settleOrderPayment(payment, verified.amountKobo, verified.paidAt);
}

async function settleTopup(
  payment: PaymentDoc,
  amountKobo: number,
  paidAt?: Date,
): Promise<ConfirmResult> {
  if (amountKobo !== payment.amountKobo) {
    await Payment.updateOne(
      { _id: payment._id, status: { $ne: 'SUCCESS' } },
      { $set: { status: 'FAILED' } },
    );
    publish('admin', 'admin:alert', { message: `Wallet top-up amount mismatch for ${payment.reference}` });
    throw new AppError('CONFLICT', 409, 'The paid amount does not match the top-up amount');
  }
  const claimed = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $ne: 'SUCCESS' } },
    { $set: { status: 'SUCCESS', paidAt: paidAt ?? new Date() } },
    { new: false },
  );
  if (!claimed) return { status: 'SUCCESS', credited: false };

  await creditWallet({
    userId: payment.userId.toString(),
    amountKobo: payment.amountKobo,
    type: 'TOPUP',
    memo: `Wallet top-up ${payment.reference}`,
  });
  return { status: 'SUCCESS', credited: true };
}

async function settleOrderPayment(
  payment: PaymentDoc,
  amountKobo: number,
  paidAt?: Date,
): Promise<ConfirmResult> {
  const order = payment.orderId ? await Order.findById(payment.orderId) : null;
  if (!order) throw notFound('Order not found');

  if (amountKobo !== order.pricing.totalKobo) {
    await Payment.updateOne(
      { _id: payment._id, status: { $ne: 'SUCCESS' } },
      { $set: { status: 'FAILED' } },
    );
    publish('admin', 'admin:alert', {
      message: `Payment amount mismatch for order ${order.code}`,
      orderId: order._id.toString(),
    });
    throw new AppError('CONFLICT', 409, 'The paid amount does not match the order total');
  }

  const claimed = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $ne: 'SUCCESS' } },
    { $set: { status: 'SUCCESS', paidAt: paidAt ?? new Date() } },
    { new: false },
  );
  if (!claimed) return { status: 'SUCCESS', orderId: order._id.toString() };

  await Order.updateOne(
    { _id: order._id },
    { $set: { 'payment.status': 'PAID', 'payment.paidAt': paidAt ?? new Date() } },
  );
  // Card money lands with the platform; the row is the audit record for the order.
  await writeLedgerEntry({
    account: 'PLATFORM',
    orderId: order._id,
    amountKobo: order.pricing.totalKobo,
    type: 'ORDER_PAYMENT',
    memo: `Card payment for ${order.code}`,
  });

  if (order.status === 'PENDING_PAYMENT') {
    await transitionOrder(order._id.toString(), 'SEARCHING_DRIVER', 'system', {
      note: 'Payment confirmed',
    });
  }
  logger.info({ orderId: order._id.toString(), reference: payment.reference }, 'payment.confirmed');
  return { status: 'SUCCESS', orderId: order._id.toString() };
}

/** GET /payments/verify/:reference — only the paying customer may poll. */
export async function verifyPaymentForUser(
  userId: string,
  reference: string,
): Promise<ConfirmResult & { reference: string }> {
  const payment = await Payment.findOne({ reference });
  if (!payment || payment.userId.toString() !== userId) {
    throw notFound('Unknown payment reference');
  }
  const result = await confirmPayment(reference);
  return { ...result, reference };
}

/** POST /wallet/topup — create an INITIATED payment and return the pay URL. */
export async function startWalletTopup(userId: string, amountKobo: number): Promise<TopupResult> {
  const provider = getPaymentProvider();
  const reference = generateWalletReference();
  const user = await User.findById(userId).select({ email: 1 }).lean();

  const payment = await Payment.create({
    userId,
    purpose: 'WALLET_TOPUP',
    provider: provider.name,
    reference,
    amountKobo,
    status: 'INITIATED',
  });

  const init = await provider.initialize({
    reference,
    amountKobo,
    email: user?.email ?? '',
    metadata: { purpose: 'WALLET_TOPUP', userId },
  });
  await Payment.updateOne({ _id: payment._id }, { $set: { authorizationUrl: init.authorizationUrl } });
  return { reference, authorizationUrl: init.authorizationUrl, amountKobo };
}
