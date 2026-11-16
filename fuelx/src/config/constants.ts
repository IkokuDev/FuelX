export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'SEARCHING_DRIVER',
  'DRIVER_ASSIGNED',
  'AT_STATION',
  'SEALED',
  'EN_ROUTE',
  'ARRIVED',
  'DELIVERED',
  'CANCELLED',
  'FAILED_DELIVERY',
  'NO_DRIVER_AVAILABLE',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'PENDING_PAYMENT',
  'SEARCHING_DRIVER',
  'DRIVER_ASSIGNED',
  'AT_STATION',
  'SEALED',
  'EN_ROUTE',
  'ARRIVED',
];

export const FUEL_TYPES = ['PETROL', 'DIESEL'] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export const PAYMENT_METHODS = ['CARD', 'WALLET', 'CASH'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = [
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
  'COD_PENDING',
  'COD_COLLECTED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const USER_ROLES = ['customer', 'driver', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['active', 'suspended'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'suspended'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

/**
 * FuelX serves every kind of delivery vehicle, not only motorcycles.
 * Capacity is decided by vehicle.maxLitres, not by the type.
 */
export const VEHICLE_TYPES = [
  'motorcycle',
  'tricycle',
  'car',
  'van',
  'pickup',
  'truck',
] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const DOCUMENT_KINDS = ['license', 'vehicle_papers', 'id'] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const OFFER_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'CANCELLED',
] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const SEAL_STATUSES = ['UNUSED', 'APPLIED', 'VERIFIED', 'BROKEN', 'VOID'] as const;
export type SealStatus = (typeof SEAL_STATUSES)[number];

export const PAYMENT_PURPOSES = ['ORDER', 'WALLET_TOPUP'] as const;
export type PaymentPurpose = (typeof PAYMENT_PURPOSES)[number];

export const LEDGER_ACCOUNTS = [
  'CUSTOMER_WALLET',
  'DRIVER_EARNINGS',
  'DRIVER_CASH_OWED',
  'PLATFORM',
  'STATION_PAYABLE',
] as const;
export type LedgerAccount = (typeof LEDGER_ACCOUNTS)[number];

export const LEDGER_TYPES = [
  'TOPUP',
  'ORDER_PAYMENT',
  'REFUND',
  'DRIVER_EARNING',
  'CASH_COLLECTED',
  'CASH_REMITTED',
  'PAYOUT',
  'CANCEL_FEE',
  'FUEL_COST',
  'SERVICE_FEE',
  'ADJUSTMENT',
] as const;
export type LedgerType = (typeof LEDGER_TYPES)[number];

export const PAYOUT_STATUSES = ['REQUESTED', 'APPROVED', 'PAID', 'REJECTED'] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const PAYMENT_PROVIDER_STATUSES = [
  'INITIATED',
  'SUCCESS',
  'FAILED',
  'ABANDONED',
] as const;
export type ProviderPaymentStatus = (typeof PAYMENT_PROVIDER_STATUSES)[number];

export const TRANSITION_ACTORS = ['system', 'customer', 'driver', 'admin'] as const;
export type TransitionActor = (typeof TRANSITION_ACTORS)[number];

/** Seal code alphabet: no 0, O, 1 or I. */
export const SEAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const ORDER_CODE_PREFIX = 'FX-';
export const ORDER_CODE_LENGTH = 6;

export const KES_NAIRA = 100;
export const DEFAULT_ABUJA_CENTRE = { lat: 9.0579, lng: 7.4951 };
