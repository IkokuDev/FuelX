import { Types } from 'mongoose';
import { Order, type OrderDoc } from '../../models/order.model';
import { Quote } from '../../models/quote.model';
import { Station } from '../../models/station.model';
import { Payment } from '../../models/payment.model';
import { User } from '../../models/user.model';
import { AppError, conflict, forbidden, notFound } from '../../lib/errors';
import { generateOrderCode, generatePaymentReference } from '../../lib/codes';
import { generateOtpSalt, deriveOtp } from '../../lib/otp';
import { canCountFor, toPublicBreakdown } from '../pricing/pricing.engine';
import { getConfig } from '../pricing/pricing.service';
import { getDispatcher } from '../dispatch/dispatcher';
import { creditWallet, debitForOrder } from '../wallet/wallet.service';
import { writeLedgerEntry } from '../wallet/ledger.service';
import { recordAudit } from '../admin/audit.service';
import { getPaymentProvider } from '../../providers/payment';
import { publish } from '../../realtime/publisher';
import { logger } from '../../lib/logger';
import { findRule, CUSTOMER_CANCELLABLE_FROM } from './order-state';
import type {
  FuelType,
  OrderStatus,
  PaymentMethod,
  TransitionActor,
  UserRole,
} from '../../config/constants';
import type { PriceBreakdown, PublicPriceBreakdown } from '../pricing/pricing.types';
import type { CreateOrderInput, ListOrdersQuery } from './orders.schemas';

export interface OrderViewer {
  id: string;
  role: UserRole;
}

export interface ApiOrderTimelineEntry {
  status: OrderStatus;
  at: string;
  note?: string;
}

export interface ApiOrder {
  id: string;
  code: string;
  status: OrderStatus;
  fuelType: FuelType;
  litres: number;
  canCount: number;
  station: { id: string; name: string; lat: number; lng: number };
  dropoff: {
    addressText: string;
    landmark?: string;
    lat: number;
    lng: number;
    contactName: string;
    contactPhone: string;
  };
  pricing: PublicPriceBreakdown;
  payment: {
    method: PaymentMethod;
    status: string;
    reference?: string;
    refundedKobo: number;
    paidAt?: string;
  };
  driverId?: string;
  timeline: ApiOrderTimelineEntry[];
  cancel?: { by: TransitionActor; reason: string; feeKobo: number };
  /** Only present for the owning customer, from EN_ROUTE to DELIVERED. */
  deliveryOtp?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderLike {
  _id: Types.ObjectId;
  code: string;
  status: string;
  fuelType: string;
  litres: number;
  canCount: number;
  customerId: Types.ObjectId;
  driverId?: Types.ObjectId | null;
  stationId: Types.ObjectId;
  pickup: { name: string; location: { coordinates: [number, number] } };
  dropoff: {
    addressText: string;
    landmark?: string | null;
    location: { coordinates: [number, number] };
    contactName: string;
    contactPhone: string;
  };
  pricing: PriceBreakdown;
  payment: {
    method: string;
    status: string;
    reference?: string | null;
    paidAt?: Date | null;
    refundedKobo: number;
  };
  statusHistory: Array<{ status: string; at: Date; byRole: string; note?: string | null }>;
  delivery?: { otpSalt?: string | null };
  cancel?: { by: string; reason: string; feeKobo: number } | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Statuses during which the owning customer may read the delivery OTP. */
const OTP_VISIBLE_STATUSES: OrderStatus[] = ['EN_ROUTE', 'ARRIVED', 'DELIVERED'];

function timeFieldFor(to: OrderStatus): string | undefined {
  switch (to) {
    case 'DRIVER_ASSIGNED':
      return 'times.assignedAt';
    case 'AT_STATION':
      return 'times.atStationAt';
    case 'SEALED':
      return 'times.sealedAt';
    case 'EN_ROUTE':
      return 'times.enRouteAt';
    case 'ARRIVED':
      return 'times.arrivedAt';
    case 'DELIVERED':
      return 'times.deliveredAt';
    case 'CANCELLED':
      return 'times.cancelledAt';
    default:
      return undefined;
  }
}

/** Strip the internal margin fields and hide the OTP from everyone but the owner. */
export function serializeOrder(order: OrderLike, viewer: OrderViewer): ApiOrder {
  const [lng, lat] = order.pickup.location.coordinates;
  const [dropLng, dropLat] = order.dropoff.location.coordinates;
  const status = order.status as OrderStatus;
  const isOwner = order.customerId.toString() === viewer.id;

  const view: ApiOrder = {
    id: order._id.toString(),
    code: order.code,
    status,
    fuelType: order.fuelType as FuelType,
    litres: order.litres,
    canCount: order.canCount,
    station: { id: order.stationId.toString(), name: order.pickup.name, lat, lng },
    dropoff: {
      addressText: order.dropoff.addressText,
      landmark: order.dropoff.landmark ?? undefined,
      lat: dropLat,
      lng: dropLng,
      contactName: order.dropoff.contactName,
      contactPhone: order.dropoff.contactPhone,
    },
    pricing: toPublicBreakdown(order.pricing),
    payment: {
      method: order.payment.method as PaymentMethod,
      status: order.payment.status,
      reference: order.payment.reference ?? undefined,
      refundedKobo: order.payment.refundedKobo,
      paidAt: order.payment.paidAt ? new Date(order.payment.paidAt).toISOString() : undefined,
    },
    driverId: order.driverId ? order.driverId.toString() : undefined,
    timeline: order.statusHistory.map((h) => ({
      status: h.status as OrderStatus,
      at: new Date(h.at).toISOString(),
      note: h.note ?? undefined,
    })),
    cancel: order.cancel
      ? {
          by: order.cancel.by as TransitionActor,
          reason: order.cancel.reason,
          feeKobo: order.cancel.feeKobo,
        }
      : undefined,
    createdAt: new Date(order.createdAt).toISOString(),
    updatedAt: new Date(order.updatedAt).toISOString(),
  };

  if (isOwner && order.delivery?.otpSalt && OTP_VISIBLE_STATUSES.includes(status)) {
    view.deliveryOtp = deriveOtp(order._id.toString(), order.delivery.otpSalt);
  }
  return view;
}

function isDuplicateKey(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

export interface TransitionOptions {
  actorUserId?: string | null;
  /** Human note stored on the statusHistory entry; also the cancel reason. */
  note?: string;
  /** Extra `$set` fields for this specific transition (already in DB form). */
  fields?: Record<string, unknown>;
  /** Pin the expected current status; a mismatch throws INVALID_TRANSITION. */
  from?: OrderStatus;
}

/**
 * The only function allowed to change order.status (plan section 12). It looks up
 * the rule, writes once with an atomic status guard, then runs the side effects.
 */
export async function transitionOrder(
  orderId: string,
  to: OrderStatus,
  actor: TransitionActor,
  opts: TransitionOptions = {},
): Promise<OrderDoc> {
  const order = await Order.findById(orderId);
  if (!order) throw notFound('Order not found');

  const from = order.status as OrderStatus;
  if (opts.from && opts.from !== from) {
    throw conflict('INVALID_TRANSITION', `Order is ${from}, not ${opts.from}`);
  }
  const rule = findRule(from, to);
  if (!rule || !rule.actors.includes(actor)) {
    throw conflict('INVALID_TRANSITION', `An order in ${from} cannot move to ${to}`);
  }

  const now = new Date();
  const setFields: Record<string, unknown> = { status: to, ...(opts.fields ?? {}) };
  const timeField = timeFieldFor(to);
  if (timeField) setFields[timeField] = now;
  if (to === 'SEARCHING_DRIVER') setFields['dispatch.startedAt'] = now;
  if (to === 'DRIVER_ASSIGNED' && !order.delivery?.otpSalt) {
    setFields['delivery.otpSalt'] = generateOtpSalt();
  }

  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: from },
    {
      $set: setFields,
      $push: {
        statusHistory: {
          status: to,
          at: now,
          byRole: actor,
          byUserId: opts.actorUserId ? new Types.ObjectId(opts.actorUserId) : undefined,
          note: opts.note,
        },
      },
    },
    { new: true },
  );
  if (!updated) {
    throw conflict('INVALID_TRANSITION', 'The order was already moved by another request');
  }

  try {
    await runSideEffects(updated, from, to, actor, opts);
  } catch (err) {
    // The order has moved, so never roll back: log, audit and let the sweeper retry.
    logger.error({ err, orderId, from, to }, 'order.transition_side_effect_failed');
    await recordAudit({
      actorId: opts.actorUserId ?? null,
      action: 'order.side_effect_failed',
      entity: 'Order',
      entityId: orderId,
      diff: { from, to, message: err instanceof Error ? err.message : String(err) },
    });
  }

  publish(`order:${updated._id.toString()}`, 'order:status', {
    orderId: updated._id.toString(),
    status: to,
    at: now.toISOString(),
    note: opts.note,
  });
  publish('admin', 'admin:order', { orderId: updated._id.toString(), status: to });

  return updated;
}

async function runSideEffects(
  order: OrderDoc,
  from: OrderStatus,
  to: OrderStatus,
  actor: TransitionActor,
  opts: TransitionOptions,
): Promise<void> {
  if (to === 'SEARCHING_DRIVER') {
    if (from === 'DRIVER_ASSIGNED' || from === 'AT_STATION') {
      await releaseDriver(order);
    }
    await getDispatcher().advance(order._id.toString());
    return;
  }
  if (to === 'CANCELLED') {
    await applyCancellation(order, actor, opts.note ?? 'Cancelled by the customer');
    return;
  }
  if (to === 'NO_DRIVER_AVAILABLE') {
    await refundCustomer(order, order.pricing.totalKobo, `No driver for ${order.code}`);
    await markOrderPaymentAbandoned(order);
    return;
  }
  // Settlement (DELIVERED) and FAILED_DELIVERY refunds are implemented in phase 8.
}

/** Free the driver on release/cancel and remember not to offer them this order again. */
async function releaseDriver(order: OrderDoc): Promise<void> {
  if (!order.driverId) return;
  await Order.updateOne(
    { _id: order._id },
    { $unset: { driverId: '' }, $addToSet: { 'dispatch.excludedDriverIds': order.driverId } },
  );
}

/**
 * Customer/administrator cancellation (plan section 12). Before assignment it is
 * free; after assignment the configured fee goes to the driver and the remainder
 * is refunded to the customer's wallet. Only pre-paid money can fund a fee.
 */
async function applyCancellation(
  order: OrderDoc,
  actor: TransitionActor,
  reason: string,
): Promise<void> {
  const config = await getConfig();
  const total = order.pricing.totalKobo;
  const paid = order.payment.status === 'PAID';
  const assignedAt = order.times?.assignedAt ? new Date(order.times.assignedAt).getTime() : null;

  let feeKobo = 0;
  if (paid && order.driverId && assignedAt !== null) {
    const withinGrace = actor === 'customer' && Date.now() - assignedAt <= 120_000;
    feeKobo = withinGrace ? 0 : config.fees.cancellationFeeKobo;
  }
  const refundKobo = paid ? Math.max(0, total - feeKobo) : 0;

  if (feeKobo > 0) {
    await writeLedgerEntry({
      account: 'DRIVER_EARNINGS',
      ownerId: order.driverId,
      orderId: order._id,
      amountKobo: feeKobo,
      type: 'CANCEL_FEE',
      memo: `Cancellation fee for ${order.code}`,
    });
  }
  if (refundKobo > 0) {
    await refundCustomer(order, refundKobo, `Refund for ${order.code}`);
  }
  if (paid) {
    await Order.updateOne(
      { _id: order._id },
      {
        $inc: { 'payment.refundedKobo': refundKobo },
        $set: { 'payment.status': refundKobo >= total ? 'REFUNDED' : 'PAID' },
      },
    );
  }

  await Order.updateOne(
    { _id: order._id },
    { $set: { cancel: { by: actor, reason, feeKobo } } },
  );
  await releaseDriver(order);
  await markOrderPaymentAbandoned(order);
}

/** Credit the customer's wallet; safe to call twice thanks to the ledger index. */
async function refundCustomer(order: OrderDoc, amountKobo: number, memo: string): Promise<void> {
  if (amountKobo <= 0) return;
  await creditWallet({
    userId: order.customerId.toString(),
    amountKobo,
    type: 'REFUND',
    orderId: order._id.toString(),
    memo,
  });
}

/** Any payment intent that never succeeded becomes ABANDONED when the order is cancelled. */
async function markOrderPaymentAbandoned(order: OrderDoc): Promise<void> {
  await Payment.updateOne(
    { orderId: order._id, purpose: 'ORDER', status: 'INITIATED' },
    { $set: { status: 'ABANDONED' } },
  );
}

export interface CreateOrderResult {
  order: ApiOrder;
  payment?: { authorizationUrl: string; reference: string };
}

/**
 * Create an order from a locked quote (plan sections 8 and 12). A wallet order is
 * debited atomically before the order exists; a cash order must stay within the
 * cap; a card order starts in PENDING_PAYMENT and returns the Paystack URL.
 * Re-sending the same quoteId returns the existing order.
 */
export async function createOrder(userId: string, input: CreateOrderInput): Promise<CreateOrderResult> {
  const quote = await Quote.findById(input.quoteId);
  if (!quote) throw notFound('Quote not found');

  if (quote.usedByOrderId) {
    const existing = await Order.findById(quote.usedByOrderId);
    if (existing) {
      return { order: serializeOrder(existing as unknown as OrderLike, { id: userId, role: 'customer' }) };
    }
  }
  if (quote.userId && quote.userId.toString() !== userId) {
    throw forbidden('This quote belongs to another customer');
  }
  if (quote.expiresAt.getTime() < Date.now()) {
    throw conflict('QUOTE_EXPIRED', 'This quote has expired, please get a new one');
  }

  const config = await getConfig();
  const fuelEntry = config.fuel[quote.fuelType as FuelType];
  const station = await Station.findById(quote.stationId);
  if (!fuelEntry?.enabled || !station || !station.isOpen || !station.fuelTypes.includes(quote.fuelType)) {
    throw new AppError('NO_STATION_AVAILABLE', 422, 'That station is no longer available');
  }

  const orderId = new Types.ObjectId();
  const totalKobo = quote.breakdown.totalKobo;
  const method = input.paymentMethod;
  const now = new Date();

  // Claim the quote first so one quote can never create two orders.
  const claimed = await Quote.findOneAndUpdate(
    { _id: quote._id, usedByOrderId: null },
    { $set: { usedByOrderId: orderId } },
    { new: false },
  );
  if (!claimed) {
    const again = await Quote.findById(quote._id);
    if (again?.usedByOrderId) {
      const existing = await Order.findById(again.usedByOrderId);
      if (existing) {
        return { order: serializeOrder(existing as unknown as OrderLike, { id: userId, role: 'customer' }) };
      }
    }
    throw conflict('CONFLICT', 'This quote is already being used');
  }

  const isCash = method === 'CASH';
  if (isCash) {
    if (!config.cash.enabled) {
      throw new AppError('CASH_LIMIT', 403, 'Cash payment is not available right now');
    }
    if (totalKobo > config.cash.maxOrderKobo) {
      throw new AppError('CASH_LIMIT', 403, 'That order is too large to pay in cash');
    }
  }

  const initialStatus: OrderStatus = method === 'CARD' ? 'PENDING_PAYMENT' : 'SEARCHING_DRIVER';
  const startingPaymentStatus = method === 'CARD' ? 'PENDING' : method === 'WALLET' ? 'PAID' : 'COD_PENDING';

  // Wallet orders pay up front and atomically, before the document exists.
  if (method === 'WALLET') {
    const debited = await debitForOrder(userId, orderId.toString(), totalKobo);
    if (!debited) {
      throw new AppError('INSUFFICIENT_WALLET', 402, 'Your wallet balance is too low for this order');
    }
  }

  const base = {
    _id: orderId,
    customerId: new Types.ObjectId(userId),
    fuelType: quote.fuelType,
    litres: quote.litres,
    canCount: canCountFor(quote.litres, config.order.canCapacityLitres),
    stationId: station._id,
    quoteId: quote._id,
    pickup: { name: station.name, location: station.location },
    dropoff: {
      addressText: quote.dropoff.addressText,
      landmark: input.landmark,
      location: quote.dropoff.location,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
    },
    pricing: quote.toObject().breakdown,
    status: initialStatus,
    statusHistory: [
      { status: initialStatus, at: now, byRole: 'customer' as const, byUserId: new Types.ObjectId(userId) },
    ],
    dispatch: initialStatus === 'SEARCHING_DRIVER' ? { startedAt: now } : undefined,
  };

  let order: OrderDoc | null = null;
  try {
    for (let attempt = 0; attempt < 5 && !order; attempt += 1) {
      const code = generateOrderCode();
      const reference = method === 'CARD' ? generatePaymentReference(code) : undefined;
      try {
        order = await Order.create({
          ...base,
          code,
          payment: {
            method,
            status: startingPaymentStatus,
            reference,
            paidAt: method === 'WALLET' ? now : undefined,
            refundedKobo: 0,
          },
        });
      } catch (err) {
        if (isDuplicateKey(err) && attempt < 4) continue;
        throw err;
      }
    }
  } catch (err) {
    if (method === 'WALLET') {
      await creditWallet({
        userId,
        amountKobo: totalKobo,
        type: 'REFUND',
        memo: 'Order creation failed, wallet re-credited',
      });
    }
    // Release the quote so the customer can retry.
    await Quote.updateOne({ _id: quote._id, usedByOrderId: orderId }, { $set: { usedByOrderId: null } });
    throw err;
  }
  if (!order) {
    throw new AppError('INTERNAL_ERROR', 500, 'Could not allocate an order code');
  }

  const viewer: OrderViewer = { id: userId, role: 'customer' };

  if (method === 'CARD') {
    const reference = order.payment.reference as string;
    const provider = getPaymentProvider();
    const customer = await User.findById(userId).select({ email: 1 }).lean();
    const paymentDoc = await Payment.create({
      userId: order.customerId,
      orderId: order._id,
      purpose: 'ORDER',
      provider: provider.name,
      reference,
      amountKobo: totalKobo,
      status: 'INITIATED',
    });
    try {
      const init = await provider.initialize({
        reference,
        amountKobo: totalKobo,
        email: customer?.email ?? '',
        metadata: { orderId: order._id.toString(), orderCode: order.code },
      });
      await Payment.updateOne({ _id: paymentDoc._id }, { $set: { authorizationUrl: init.authorizationUrl } });
      return {
        order: serializeOrder(order as unknown as OrderLike, viewer),
        payment: { authorizationUrl: init.authorizationUrl, reference },
      };
    } catch (err) {
      await Payment.updateOne({ _id: paymentDoc._id }, { $set: { status: 'FAILED' } });
      logger.error({ err, orderId: order._id.toString() }, 'payment.initialize_failed');
      throw new AppError('INTERNAL_ERROR', 502, 'Could not start the card payment, please retry');
    }
  }

  await getDispatcher().advance(order._id.toString());
  return { order: serializeOrder(order as unknown as OrderLike, viewer) };
}

/** Owner, assigned driver or admin may read an order; anyone else gets 404. */
export async function getOrderForViewer(orderId: string, viewer: OrderViewer): Promise<ApiOrder> {
  const order = await Order.findById(orderId).lean();
  if (!order) throw notFound('Order not found');
  const isCustomer = order.customerId.toString() === viewer.id;
  const isDriver = order.driverId?.toString() === viewer.id;
  if (viewer.role !== 'admin' && !isCustomer && !isDriver) {
    throw notFound('Order not found');
  }
  return serializeOrder(order as unknown as OrderLike, viewer);
}

export interface PaginatedOrders {
  items: ApiOrder[];
  page: number;
  limit: number;
  total: number;
}

export async function listOwnOrders(userId: string, query: ListOrdersQuery): Promise<PaginatedOrders> {
  const filter: Record<string, unknown> = { customerId: new Types.ObjectId(userId) };
  if (query.status) filter.status = query.status;
  const [rows, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Order.countDocuments(filter),
  ]);
  return {
    items: rows.map((r) => serializeOrder(r as unknown as OrderLike, { id: userId, role: 'customer' })),
    page: query.page,
    limit: query.limit,
    total,
  };
}

/** Customer cancellation, with the fee rules from section 12. */
export async function cancelOrder(
  orderId: string,
  userId: string,
  reason: string,
): Promise<ApiOrder> {
  const order = await Order.findById(orderId).lean();
  if (!order) throw notFound('Order not found');
  if (order.customerId.toString() !== userId) throw notFound('Order not found');
  if (!CUSTOMER_CANCELLABLE_FROM.includes(order.status as OrderStatus)) {
    throw conflict('ORDER_NOT_CANCELLABLE', 'This order can no longer be cancelled');
  }

  const updated = await transitionOrder(orderId, 'CANCELLED', 'customer', {
    actorUserId: userId,
    note: reason,
    from: order.status as OrderStatus,
  });
  return serializeOrder(updated as unknown as OrderLike, { id: userId, role: 'customer' });
}
