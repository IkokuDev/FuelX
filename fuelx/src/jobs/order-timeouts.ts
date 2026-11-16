import { Order } from '../models/order.model';
import { transitionOrder } from '../modules/orders/orders.service';
import { publish } from '../realtime/publisher';
import { logger } from '../lib/logger';

/** PENDING_PAYMENT older than this is cancelled as an abandoned payment. */
const PENDING_PAYMENT_MINUTES = 30;
/** DRIVER_ASSIGNED for this long without reaching AT_STATION is released. */
const ASSIGNED_STALE_MINUTES = 20;
/** ARRIVED for this long raises an admin alert. */
const ARRIVED_ALERT_MINUTES = 30;

export interface TimeoutSummary {
  cancelled: number;
  released: number;
  alerted: number;
}

function minutesAgo(now: Date, minutes: number): Date {
  return new Date(now.getTime() - minutes * 60_000);
}

/** Cancel card orders whose payment was never completed (plan section 12). */
async function cancelAbandonedPayments(now: Date): Promise<number> {
  const stale = await Order.find({
    status: 'PENDING_PAYMENT',
    createdAt: { $lt: minutesAgo(now, PENDING_PAYMENT_MINUTES) },
  })
    .select({ _id: 1 })
    .lean();

  let count = 0;
  for (const row of stale) {
    try {
      await transitionOrder(row._id.toString(), 'CANCELLED', 'system', {
        note: 'Payment was not completed in time',
      });
      count += 1;
    } catch (err) {
      logger.warn({ err, orderId: row._id.toString() }, 'order_timeouts.cancel_failed');
    }
  }
  return count;
}

/** Release drivers who never reached the station and exclude them from re-offers. */
async function releaseStaleAssignments(now: Date): Promise<number> {
  const stale = await Order.find({
    status: 'DRIVER_ASSIGNED',
    'times.assignedAt': { $lt: minutesAgo(now, ASSIGNED_STALE_MINUTES) },
  })
    .select({ _id: 1 })
    .lean();

  let count = 0;
  for (const row of stale) {
    try {
      await transitionOrder(row._id.toString(), 'SEARCHING_DRIVER', 'system', {
        note: 'Driver did not reach the station in time',
      });
      count += 1;
    } catch (err) {
      logger.warn({ err, orderId: row._id.toString() }, 'order_timeouts.release_failed');
    }
  }
  return count;
}

/** Alert the admin room when a delivery has been sitting at the door too long. */
async function alertStaleArrivals(now: Date): Promise<number> {
  const stale = await Order.find({
    status: 'ARRIVED',
    'times.arrivedAt': { $lt: minutesAgo(now, ARRIVED_ALERT_MINUTES) },
  })
    .select({ _id: 1, code: 1 })
    .lean();

  for (const row of stale) {
    publish('admin', 'admin:alert', {
      message: `Order ${row.code} has been ARRIVED for over ${ARRIVED_ALERT_MINUTES} minutes`,
      orderId: row._id.toString(),
    });
  }
  return stale.length;
}

/** One pass of the order timeout jobs. Safe to run repeatedly and after a restart. */
export async function runOrderTimeouts(now: Date = new Date()): Promise<TimeoutSummary> {
  const cancelled = await cancelAbandonedPayments(now);
  const released = await releaseStaleAssignments(now);
  const alerted = await alertStaleArrivals(now);
  return { cancelled, released, alerted };
}
