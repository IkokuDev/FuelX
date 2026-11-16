import { Types } from 'mongoose';
import { LedgerEntry } from '../../models/ledger-entry.model';
import { User } from '../../models/user.model';
import { DriverProfile } from '../../models/driver-profile.model';
import { logger } from '../../lib/logger';
import { publish } from '../../realtime/publisher';
import type { LedgerAccount, LedgerType } from '../../config/constants';

export interface LedgerInput {
  account: LedgerAccount;
  ownerId?: Types.ObjectId | string | null;
  orderId?: Types.ObjectId | string | null;
  /** Signed kobo: negative debits, positive credits. */
  amountKobo: number;
  type: LedgerType;
  memo?: string;
  /**
   * When false the row is recorded for the audit trail only and no balance is
   * touched, because the caller already moved the money atomically with its own
   * conditional update (wallet debit, payout).
   */
  applyBalance?: boolean;
}

export interface LedgerEntryView {
  id: string;
  account: LedgerAccount;
  type: LedgerType;
  amountKobo: number;
  orderId?: string;
  memo?: string;
  at: Date;
}

/**
 * Append one ledger row and, when it is new, apply the matching balance change.
 * Returns true when the row was inserted, false when it already existed. This is
 * what makes settlement safe to run twice (unique index on the ledger).
 */
export async function writeLedgerEntry(input: LedgerInput): Promise<boolean> {
  const ownerId = input.ownerId ? new Types.ObjectId(String(input.ownerId)) : undefined;
  const orderId = input.orderId ? new Types.ObjectId(String(input.orderId)) : undefined;

  let inserted = false;
  try {
    await LedgerEntry.create({
      account: input.account,
      ownerId,
      orderId,
      amountKobo: input.amountKobo,
      type: input.type,
      memo: input.memo,
    });
    inserted = true;
  } catch (err) {
    if (isDuplicateKey(err)) return false;
    throw err;
  }

  if (input.applyBalance ?? true) {
    await applyBalance(input.account, ownerId, input.amountKobo);
  }
  return inserted;
}

function isDuplicateKey(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

async function applyBalance(account: LedgerAccount, ownerId: Types.ObjectId | undefined, amountKobo: number): Promise<void> {
  if (!ownerId) return;
  switch (account) {
    case 'CUSTOMER_WALLET': {
      const updated = await User.findOneAndUpdate(
      { _id: ownerId },
      { $inc: { walletBalanceKobo: amountKobo } },
      { new: true },
    );
    if (updated) {
      publish(`user:${ownerId.toString()}`, 'wallet:update', { ownerId: ownerId.toString(), balanceKobo: updated.walletBalanceKobo });
    }
      break;
    }
    case 'DRIVER_EARNINGS':
      await DriverProfile.updateOne({ userId: ownerId }, { $inc: { earningsBalanceKobo: amountKobo } });
      break;
    case 'DRIVER_CASH_OWED':
      await DriverProfile.updateOne({ userId: ownerId }, { $inc: { cashOwedKobo: amountKobo } });
      break;
    default:
      // PLATFORM and STATION_PAYABLE are informational accounts for reports.
      break;
    }
}

/** Last N ledger rows for one account owner, newest first. */
export async function listLedger(
  account: LedgerAccount,
  ownerId: string,
  limit = 50,
): Promise<LedgerEntryView[]> {
  const rows = await LedgerEntry.find({ account, ownerId: new Types.ObjectId(ownerId) })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 200))
    .lean();
  return rows.map((r) => ({
    id: r._id.toString(),
    account: r.account as LedgerAccount,
    type: r.type as LedgerType,
    amountKobo: r.amountKobo,
    orderId: r.orderId ? r.orderId.toString() : undefined,
    memo: r.memo ?? undefined,
    at: r.createdAt,
  }));
}

/** Warn (never throw) when a money side effect fails, so the sweeper can retry. */
export function logLedgerFailure(err: unknown, context: Record<string, unknown>): void {
  logger.error({ err, ...context }, 'ledger.write_failed');
}
