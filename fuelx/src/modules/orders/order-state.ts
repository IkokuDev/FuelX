import type { OrderStatus, TransitionActor } from '../../config/constants';

/** The conceptual pre-document state for a brand new order. */
export type OrderFromStatus = OrderStatus | 'NEW';

export interface TransitionRule {
  from: OrderFromStatus;
  to: OrderStatus;
  actors: TransitionActor[];
  /** Human description used by the API error and docs. */
  label: string;
}

/**
 * The single source of truth for who may move an order where (plan section 12).
 * transitionOrder() is the only function allowed to change order.status.
 */
export const TRANSITIONS: TransitionRule[] = [
  { from: 'NEW', to: 'PENDING_PAYMENT', actors: ['customer'], label: 'Start a card order' },
  { from: 'NEW', to: 'SEARCHING_DRIVER', actors: ['customer'], label: 'Start a wallet or cash order' },
  { from: 'PENDING_PAYMENT', to: 'SEARCHING_DRIVER', actors: ['system', 'customer'], label: 'Payment succeeded' },
  { from: 'PENDING_PAYMENT', to: 'CANCELLED', actors: ['customer', 'system'], label: 'Abandoned payment' },
  { from: 'SEARCHING_DRIVER', to: 'DRIVER_ASSIGNED', actors: ['driver', 'admin'], label: 'Driver claimed the job' },
  { from: 'SEARCHING_DRIVER', to: 'NO_DRIVER_AVAILABLE', actors: ['system'], label: 'Dispatch timed out' },
  { from: 'SEARCHING_DRIVER', to: 'CANCELLED', actors: ['customer', 'admin'], label: 'Cancelled while searching' },
  { from: 'DRIVER_ASSIGNED', to: 'AT_STATION', actors: ['driver'], label: 'Driver reached the station' },
  { from: 'DRIVER_ASSIGNED', to: 'SEARCHING_DRIVER', actors: ['driver', 'admin', 'system'], label: 'Released or reassigned' },
  { from: 'DRIVER_ASSIGNED', to: 'CANCELLED', actors: ['customer', 'admin'], label: 'Cancelled after assignment' },
  { from: 'AT_STATION', to: 'SEALED', actors: ['driver'], label: 'Cans sealed' },
  { from: 'AT_STATION', to: 'SEARCHING_DRIVER', actors: ['driver', 'admin', 'system'], label: 'Released at the station' },
  { from: 'AT_STATION', to: 'CANCELLED', actors: ['customer', 'admin'], label: 'Cancelled at the station' },
  { from: 'SEALED', to: 'EN_ROUTE', actors: ['driver'], label: 'Driver departed' },
  { from: 'SEALED', to: 'CANCELLED', actors: ['admin'], label: 'Admin cancelled after sealing' },
  { from: 'EN_ROUTE', to: 'ARRIVED', actors: ['driver'], label: 'Driver arrived at the door' },
  { from: 'EN_ROUTE', to: 'CANCELLED', actors: ['admin'], label: 'Admin cancelled en route' },
  { from: 'ARRIVED', to: 'DELIVERED', actors: ['driver'], label: 'OTP accepted' },
  { from: 'ARRIVED', to: 'FAILED_DELIVERY', actors: ['driver'], label: 'Customer no-show' },
  { from: 'ARRIVED', to: 'CANCELLED', actors: ['admin'], label: 'Admin cancelled at the door' },
];

export function findRule(from: OrderFromStatus, to: OrderStatus): TransitionRule | undefined {
  return TRANSITIONS.find((r) => r.from === from && r.to === to);
}

export function canTransition(from: OrderFromStatus, to: OrderStatus, actor: TransitionActor): boolean {
  const rule = findRule(from, to);
  return Boolean(rule && rule.actors.includes(actor));
}

/** Statuses a customer may cancel from without a dispute (plan section 12). */
export const CUSTOMER_CANCELLABLE_FROM: OrderStatus[] = ['PENDING_PAYMENT', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'AT_STATION'];
