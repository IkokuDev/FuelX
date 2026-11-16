export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'ACCOUNT_SUSPENDED'
  | 'NOT_APPROVED'
  | 'NOT_FOUND'
  | 'INSUFFICIENT_WALLET'
  | 'QUOTE_EXPIRED'
  | 'ORDER_NOT_CANCELLABLE'
  | 'INVALID_TRANSITION'
  | 'OFFER_EXPIRED'
  | 'OFFER_TAKEN'
  | 'DRIVER_BUSY'
  | 'OUT_OF_SERVICE_AREA'
  | 'NO_STATION_AVAILABLE'
  | 'NO_DRIVERS_ONLINE'
  | 'GEOFENCE_FAILED'
  | 'SEAL_INVALID'
  | 'OTP_INVALID'
  | 'CASH_LIMIT'
  | 'OTP_LOCKED'
  | 'RATE_LIMITED'
  | 'DISPUTE_OPEN'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'OFFER_NOT_PENDING'
  | 'ORDER_NOT_SEARCHING'
  | 'NO_CURRENT_ORDER'
  | 'CANNOT_RELEASE'
  | 'HAS_CURRENT_ORDER';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    httpStatus: number,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const badRequest = (message: string, details?: Record<string, unknown>): AppError =>
  new AppError('VALIDATION_ERROR', 400, message, details);

export const unauthorized = (message = 'Authentication required'): AppError =>
  new AppError('UNAUTHENTICATED', 401, message);

export const forbidden = (message = 'Forbidden'): AppError => new AppError('FORBIDDEN', 403, message);

export const notFound = (message = 'Not found'): AppError => new AppError('NOT_FOUND', 404, message);

export const conflict = (code: ErrorCode, message: string): AppError =>
  new AppError(code, 409, message);

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
